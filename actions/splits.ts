"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { splitsSchema } from "@/lib/validations/split";
import type { ActionState } from "@/lib/action-state";

export async function replaceTransactionSplits(
  transactionId: string,
  rawSplits: unknown,
): Promise<ActionState> {
  const parsed = splitsSchema.safeParse(rawSplits);
  if (!parsed.success) return { error: "Dados de divisão inválidos." };

  const supabase = await createClient();

  const { data: transaction } = await supabase
    .from("transactions")
    .select("amount")
    .eq("id", transactionId)
    .single();

  if (!transaction) return { error: "Transação não encontrada." };

  const total = Number(transaction.amount);
  const sum = Math.round(parsed.data.reduce((acc, s) => acc + s.amount, 0) * 100) / 100;

  if (parsed.data.length > 0 && sum !== total) {
    return {
      error: `A soma das divisões (${sum.toFixed(2)}) precisa ser igual ao valor da transação (${total.toFixed(2)}).`,
    };
  }

  const payload = parsed.data.map((s) => ({
    profile_id: s.profileId ?? "",
    category_id: s.categoryId,
    subcategory_id: s.subcategoryId ?? "",
    amount: s.amount,
  }));

  const { error } = await supabase.rpc("replace_transaction_splits", {
    p_transaction_id: transactionId,
    p_splits: payload,
  });

  if (error) return { error: "Não foi possível salvar a divisão da transação." };

  revalidatePath("/transacoes");
  return { success: parsed.data.length > 0 ? "Divisão salva." : "Divisão removida." };
}
