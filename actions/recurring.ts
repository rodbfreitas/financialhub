"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { recurringSchema } from "@/lib/validations/recurring";
import { advanceOccurrence } from "@/lib/recurrence";
import { contributionFor, applyBillDelta } from "@/lib/server/credit-card-bills";
import { applyAccountDelta } from "@/lib/server/account-balance";
import type { ActionState } from "@/lib/action-state";

function readFormData(formData: FormData) {
  return {
    type: formData.get("type"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    interval: formData.get("interval"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    profileId: formData.get("profileId"),
    paymentMethod: formData.get("paymentMethod"),
    accountId: formData.get("accountId"),
    creditCardId: formData.get("creditCardId"),
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId"),
  };
}

export async function createRecurring(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = recurringSchema.safeParse(readFormData(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const d = parsed.data;
  const accountId = d.paymentMethod === "account" ? d.accountId : undefined;
  const creditCardId = d.paymentMethod === "credit_card" ? d.creditCardId : undefined;

  const { error } = await supabase.from("recurring_transactions").insert({
    household_id: householdId,
    profile_id: d.profileId,
    type: d.type,
    description: d.description,
    amount: d.amount,
    account_id: accountId ?? null,
    credit_card_id: creditCardId ?? null,
    category_id: d.categoryId ?? null,
    subcategory_id: d.subcategoryId ?? null,
    frequency: d.frequency,
    interval: d.interval,
    start_date: d.startDate,
    end_date: d.endDate ?? null,
    next_occurrence: d.startDate,
  });

  if (error) return { error: "Não foi possível criar a recorrência. Tente novamente." };

  revalidatePath("/assinaturas");
  return { success: `Recorrência "${d.description}" criada.` };
}

export async function updateRecurring(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = recurringSchema.safeParse(readFormData(formData));
  if (!id) return { error: "Recorrência inválida." };
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const d = parsed.data;
  const accountId = d.paymentMethod === "account" ? d.accountId : undefined;
  const creditCardId = d.paymentMethod === "credit_card" ? d.creditCardId : undefined;

  const { error } = await supabase
    .from("recurring_transactions")
    .update({
      profile_id: d.profileId,
      type: d.type,
      description: d.description,
      amount: d.amount,
      account_id: accountId ?? null,
      credit_card_id: creditCardId ?? null,
      category_id: d.categoryId ?? null,
      subcategory_id: d.subcategoryId ?? null,
      frequency: d.frequency,
      interval: d.interval,
      start_date: d.startDate,
      end_date: d.endDate ?? null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath("/assinaturas");
  return { success: "Recorrência atualizada." };
}

export async function setRecurringActive(id: string, active: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_transactions").update({ active }).eq("id", id);

  if (error) return { error: "Não foi possível atualizar a recorrência." };

  revalidatePath("/assinaturas");
  return null;
}

/**
 * Geração manual (Tarefa #29 — não há job/cron automático nesta etapa): cria a
 * transação da ocorrência atual (`next_occurrence`) e avança a recorrência para a
 * próxima data, aplicando os mesmos efeitos colaterais de uma transação normal
 * (fatura do cartão / saldo da conta).
 */
export async function generateRecurringTransaction(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const { data: recurring } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("id", id)
    .single();

  if (!recurring) return { error: "Recorrência não encontrada." };
  if (!recurring.active) return { error: "Esta recorrência está inativa." };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const amount = Number(recurring.amount);
  const contribution = contributionFor(recurring.type, amount);

  let creditCardBillId: string | null = null;
  if (recurring.credit_card_id) {
    creditCardBillId = await applyBillDelta(
      supabase,
      householdId,
      recurring.credit_card_id,
      recurring.next_occurrence,
      contribution,
    );
  }
  if (recurring.account_id) {
    await applyAccountDelta(supabase, recurring.account_id, contribution);
  }

  const { error: txError } = await supabase.from("transactions").insert({
    household_id: householdId,
    profile_id: recurring.profile_id,
    account_id: recurring.account_id,
    credit_card_id: recurring.credit_card_id,
    credit_card_bill_id: creditCardBillId,
    type: recurring.type,
    description: recurring.description,
    amount,
    transaction_date: recurring.next_occurrence,
    status: "posted",
    category_id: recurring.category_id,
    subcategory_id: recurring.subcategory_id,
    nature: "individual",
    source: "manual",
    recurring_transaction_id: recurring.id,
    created_by: user?.id ?? null,
  });

  if (txError) {
    return { error: "Não foi possível gerar a transação desta recorrência." };
  }

  const nextOccurrence = advanceOccurrence(
    recurring.next_occurrence,
    recurring.frequency,
    recurring.interval,
  );
  const pastEndDate = recurring.end_date ? nextOccurrence > recurring.end_date : false;

  const { error: updateError } = await supabase
    .from("recurring_transactions")
    .update({
      next_occurrence: nextOccurrence,
      active: pastEndDate ? false : recurring.active,
    })
    .eq("id", id);

  if (updateError) {
    return { error: "Transação gerada, mas não foi possível avançar a recorrência." };
  }

  revalidatePath("/assinaturas");
  revalidatePath("/transacoes");
  revalidatePath("/cartoes");
  revalidatePath("/contas");
  return {
    success: pastEndDate
      ? "Última ocorrência gerada — recorrência encerrada (data final atingida)."
      : "Transação gerada.",
  };
}
