"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { transactionSchema } from "@/lib/validations/transaction";
import { contributionFor, applyBillDelta } from "@/lib/server/credit-card-bills";
import { applyAccountDelta } from "@/lib/server/account-balance";
import type { ActionState } from "@/lib/action-state";
import type { Database } from "@/types/database";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

/** Reverte (ou aplica) os efeitos colaterais de uma transação existente em conta/fatura. */
async function reverseSideEffects(
  supabase: SupabaseClient<Database>,
  householdId: string,
  row: { type: TransactionType; amount: number; transaction_date: string; account_id: string | null; credit_card_id: string | null },
): Promise<void> {
  const delta = -contributionFor(row.type, Number(row.amount));
  if (row.account_id) {
    await applyAccountDelta(supabase, row.account_id, delta);
  }
  if (row.credit_card_id) {
    await applyBillDelta(supabase, householdId, row.credit_card_id, row.transaction_date, delta);
  }
}

function readFormData(formData: FormData) {
  return {
    type: formData.get("type"),
    description: formData.get("description"),
    merchant: formData.get("merchant"),
    amount: formData.get("amount"),
    transactionDate: formData.get("transactionDate"),
    status: formData.get("status"),
    nature: formData.get("nature"),
    profileId: formData.get("profileId"),
    paymentMethod: formData.get("paymentMethod"),
    accountId: formData.get("accountId"),
    creditCardId: formData.get("creditCardId"),
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId"),
    notes: formData.get("notes"),
  };
}

export async function createTransaction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = transactionSchema.safeParse(readFormData(formData));

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    return { error: "Não foi possível identificar seu household." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const d = parsed.data;
  const accountId = d.paymentMethod === "account" ? d.accountId : undefined;
  const creditCardId = d.paymentMethod === "credit_card" ? d.creditCardId : undefined;
  const contribution = contributionFor(d.type, d.amount);

  let creditCardBillId: string | null = null;
  if (creditCardId) {
    creditCardBillId = await applyBillDelta(
      supabase,
      householdId,
      creditCardId,
      d.transactionDate,
      contribution,
    );
  }
  if (accountId) {
    await applyAccountDelta(supabase, accountId, contribution);
  }

  const { error } = await supabase.from("transactions").insert({
    household_id: householdId,
    profile_id: d.profileId,
    account_id: accountId ?? null,
    credit_card_id: creditCardId ?? null,
    credit_card_bill_id: creditCardBillId,
    type: d.type,
    description: d.description,
    merchant: d.merchant ?? null,
    amount: d.amount,
    transaction_date: d.transactionDate,
    status: d.status,
    category_id: d.categoryId ?? null,
    subcategory_id: d.subcategoryId ?? null,
    nature: d.nature,
    source: "manual",
    notes: d.notes ?? null,
    created_by: user?.id ?? null,
  });

  if (error) {
    return { error: "Não foi possível criar a transação. Tente novamente." };
  }

  revalidatePath("/transacoes");
  revalidatePath("/cartoes");
  revalidatePath("/contas");
  return { success: "Transação criada." };
}

export async function updateTransaction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = transactionSchema.safeParse(readFormData(formData));

  if (!id) return { error: "Transação inválida." };
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const { data: existing } = await supabase
    .from("transactions")
    .select("type, amount, transaction_date, account_id, credit_card_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Transação não encontrada." };

  // Reverte a contribuição antiga (conta e/ou fatura) antes de aplicar a nova.
  await reverseSideEffects(supabase, householdId, existing);

  const d = parsed.data;
  const accountId = d.paymentMethod === "account" ? d.accountId : undefined;
  const creditCardId = d.paymentMethod === "credit_card" ? d.creditCardId : undefined;
  const contribution = contributionFor(d.type, d.amount);

  let creditCardBillId: string | null = null;
  if (creditCardId) {
    creditCardBillId = await applyBillDelta(
      supabase,
      householdId,
      creditCardId,
      d.transactionDate,
      contribution,
    );
  }
  if (accountId) {
    await applyAccountDelta(supabase, accountId, contribution);
  }

  const { error } = await supabase
    .from("transactions")
    .update({
      profile_id: d.profileId,
      account_id: accountId ?? null,
      credit_card_id: creditCardId ?? null,
      credit_card_bill_id: creditCardBillId,
      type: d.type,
      description: d.description,
      merchant: d.merchant ?? null,
      amount: d.amount,
      transaction_date: d.transactionDate,
      status: d.status,
      category_id: d.categoryId ?? null,
      subcategory_id: d.subcategoryId ?? null,
      nature: d.nature,
      notes: d.notes ?? null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath("/transacoes");
  revalidatePath("/cartoes");
  revalidatePath("/contas");
  return { success: "Transação atualizada." };
}

export async function deleteTransaction(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const { data: existing } = await supabase
    .from("transactions")
    .select("type, amount, transaction_date, account_id, credit_card_id")
    .eq("id", id)
    .single();

  if (!existing) return { error: "Transação não encontrada." };

  await reverseSideEffects(supabase, householdId, existing);

  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: "Não foi possível excluir a transação." };

  revalidatePath("/transacoes");
  revalidatePath("/cartoes");
  revalidatePath("/contas");
  return null;
}
