"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { installmentSchema } from "@/lib/validations/installment";
import { addMonthsToDate } from "@/lib/credit-card-billing";
import { applyBillDelta } from "@/lib/server/credit-card-bills";
import type { ActionState } from "@/lib/action-state";

/**
 * Gera um parcelamento no cartão: 1 linha em `installment_plans` + N transações
 * (`type='expense'`, uma por mês a partir de `startDate`), cada uma já lançada na
 * fatura do respectivo ciclo (via `applyBillDelta`, mesma lógica de uma compra
 * avulsa). O valor é dividido igualmente entre as parcelas, com o resto da divisão
 * absorvido pela última parcela para o total bater exatamente com `totalAmount`
 * (dinheiro nunca é float — sempre arredondado a centavos antes de gravar).
 */
export async function createInstallmentPlan(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = installmentSchema.safeParse({
    description: formData.get("description"),
    totalAmount: formData.get("totalAmount"),
    installmentCount: formData.get("installmentCount"),
    startDate: formData.get("startDate"),
    profileId: formData.get("profileId"),
    creditCardId: formData.get("creditCardId"),
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId"),
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

  const { data: plan, error: planError } = await supabase
    .from("installment_plans")
    .insert({
      household_id: householdId,
      profile_id: d.profileId,
      credit_card_id: d.creditCardId,
      description: d.description,
      total_amount: d.totalAmount,
      installment_count: d.installmentCount,
      start_date: d.startDate,
      category_id: d.categoryId ?? null,
      subcategory_id: d.subcategoryId ?? null,
    })
    .select("id")
    .single();

  if (planError || !plan) {
    return { error: "Não foi possível criar o parcelamento. Tente novamente." };
  }

  const baseInstallment = Math.round((d.totalAmount / d.installmentCount) * 100) / 100;
  const lastInstallment =
    Math.round((d.totalAmount - baseInstallment * (d.installmentCount - 1)) * 100) / 100;

  for (let i = 0; i < d.installmentCount; i++) {
    const amount = i === d.installmentCount - 1 ? lastInstallment : baseInstallment;
    const transactionDate = addMonthsToDate(d.startDate, i);

    const billId = await applyBillDelta(
      supabase,
      householdId,
      d.creditCardId,
      transactionDate,
      amount,
    );

    const { error: txError } = await supabase.from("transactions").insert({
      household_id: householdId,
      profile_id: d.profileId,
      credit_card_id: d.creditCardId,
      credit_card_bill_id: billId,
      type: "expense",
      description: `${d.description} (${i + 1}/${d.installmentCount})`,
      amount,
      transaction_date: transactionDate,
      status: "posted",
      category_id: d.categoryId ?? null,
      subcategory_id: d.subcategoryId ?? null,
      nature: "individual",
      source: "manual",
      installment_plan_id: plan.id,
      installment_number: i + 1,
      created_by: user?.id ?? null,
    });

    if (txError) {
      return {
        error: `Parcelamento criado, mas houve erro ao gerar a parcela ${i + 1}. Verifique a fatura do cartão.`,
      };
    }
  }

  revalidatePath("/transacoes");
  revalidatePath("/cartoes");
  return { success: `Parcelamento "${d.description}" criado em ${d.installmentCount}x.` };
}
