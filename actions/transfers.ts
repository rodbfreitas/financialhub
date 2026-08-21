"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { transferSchema } from "@/lib/validations/transfer";
import { applyAccountDelta } from "@/lib/server/account-balance";
import type { ActionState } from "@/lib/action-state";

/**
 * Transferência = duas transações type='transfer' ligadas por `transfer_id`, com
 * `amount` COM SINAL (saída negativa, entrada positiva) — diferente da convenção de
 * receita/despesa (sempre positivo, sinal vem do `type`). Decisão documentada: como
 * `transfer` não entra nas somas de receita/despesa das views (013_views_and_rpc.sql),
 * usar o sinal aqui não quebra nada existente, e é a forma mais direta de aplicar o
 * delta correto em cada conta via `adjust_account_balance`.
 *
 * Edição de transferência não é suportada — o padrão em apps financeiros é excluir e
 * recriar, o que evita ter que re-derivar/mesclar duas pernas independentes.
 */
export async function createTransfer(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transferSchema.safeParse({
    description: formData.get("description"),
    amount: formData.get("amount"),
    transactionDate: formData.get("transactionDate"),
    profileId: formData.get("profileId"),
    fromAccountId: formData.get("fromAccountId"),
    toAccountId: formData.get("toAccountId"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const d = parsed.data;
  const transferId = randomUUID();

  const { error } = await supabase.from("transactions").insert([
    {
      household_id: householdId,
      profile_id: d.profileId,
      account_id: d.fromAccountId,
      type: "transfer" as const,
      description: d.description,
      amount: -d.amount,
      transaction_date: d.transactionDate,
      status: "posted" as const,
      nature: "individual" as const,
      source: "manual" as const,
      transfer_id: transferId,
      notes: d.notes ?? null,
      created_by: user?.id ?? null,
    },
    {
      household_id: householdId,
      profile_id: d.profileId,
      account_id: d.toAccountId,
      type: "transfer" as const,
      description: d.description,
      amount: d.amount,
      transaction_date: d.transactionDate,
      status: "posted" as const,
      nature: "individual" as const,
      source: "manual" as const,
      transfer_id: transferId,
      notes: d.notes ?? null,
      created_by: user?.id ?? null,
    },
  ]);

  if (error) {
    return { error: "Não foi possível criar a transferência. Tente novamente." };
  }

  await Promise.all([
    applyAccountDelta(supabase, d.fromAccountId, -d.amount),
    applyAccountDelta(supabase, d.toAccountId, d.amount),
  ]);

  revalidatePath("/transacoes");
  revalidatePath("/contas");
  return { success: "Transferência criada." };
}

export async function deleteTransfer(transferId: string): Promise<ActionState> {
  const supabase = await createClient();

  const { data: legs } = await supabase
    .from("transactions")
    .select("id, account_id, amount")
    .eq("transfer_id", transferId)
    .is("deleted_at", null);

  if (!legs || legs.length === 0) return { error: "Transferência não encontrada." };

  await Promise.all(
    legs
      .filter((leg) => leg.account_id)
      .map((leg) => applyAccountDelta(supabase, leg.account_id as string, -Number(leg.amount))),
  );

  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("transfer_id", transferId);

  if (error) return { error: "Não foi possível excluir a transferência." };

  revalidatePath("/transacoes");
  revalidatePath("/contas");
  return null;
}
