"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { subscriptionSchema } from "@/lib/validations/subscription";
import type { ActionState } from "@/lib/action-state";

function readFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    amount: formData.get("amount"),
    frequency: formData.get("frequency"),
    nextChargeDate: formData.get("nextChargeDate"),
    profileId: formData.get("profileId"),
    paymentMethod: formData.get("paymentMethod"),
    accountId: formData.get("accountId"),
    creditCardId: formData.get("creditCardId"),
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId"),
  };
}

export async function createSubscription(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = subscriptionSchema.safeParse(readFormData(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const d = parsed.data;
  const accountId = d.paymentMethod === "account" ? d.accountId : undefined;
  const creditCardId = d.paymentMethod === "credit_card" ? d.creditCardId : undefined;

  const { error } = await supabase.from("subscriptions").insert({
    household_id: householdId,
    profile_id: d.profileId,
    name: d.name,
    amount: d.amount,
    frequency: d.frequency,
    category_id: d.categoryId ?? null,
    subcategory_id: d.subcategoryId ?? null,
    account_id: accountId ?? null,
    credit_card_id: creditCardId ?? null,
    next_charge_date: d.nextChargeDate,
  });

  if (error) return { error: "Não foi possível criar a assinatura. Tente novamente." };

  revalidatePath("/assinaturas");
  return { success: `Assinatura "${d.name}" criada.` };
}

export async function updateSubscription(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = subscriptionSchema.safeParse(readFormData(formData));
  if (!id) return { error: "Assinatura inválida." };
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const d = parsed.data;
  const accountId = d.paymentMethod === "account" ? d.accountId : undefined;
  const creditCardId = d.paymentMethod === "credit_card" ? d.creditCardId : undefined;

  const { error } = await supabase
    .from("subscriptions")
    .update({
      profile_id: d.profileId,
      name: d.name,
      amount: d.amount,
      frequency: d.frequency,
      category_id: d.categoryId ?? null,
      subcategory_id: d.subcategoryId ?? null,
      account_id: accountId ?? null,
      credit_card_id: creditCardId ?? null,
      next_charge_date: d.nextChargeDate,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath("/assinaturas");
  return { success: "Assinatura atualizada." };
}

export async function setSubscriptionActive(id: string, active: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("subscriptions").update({ active }).eq("id", id);

  if (error) return { error: "Não foi possível atualizar a assinatura." };

  revalidatePath("/assinaturas");
  return null;
}
