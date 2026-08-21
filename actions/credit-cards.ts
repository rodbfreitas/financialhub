"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { creditCardSchema } from "@/lib/validations/credit-card";
import type { ActionState } from "@/lib/action-state";

function readFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    institutionName: formData.get("institutionName"),
    brand: formData.get("brand"),
    lastFourDigits: formData.get("lastFourDigits"),
    creditLimit: formData.get("creditLimit"),
    closingDay: formData.get("closingDay"),
    dueDay: formData.get("dueDay"),
    profileId: formData.get("profileId"),
  };
}

export async function createCreditCard(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = creditCardSchema.safeParse(readFormData(formData));

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    return { error: "Não foi possível identificar seu household." };
  }

  const { error } = await supabase.from("credit_cards").insert({
    household_id: householdId,
    profile_id: parsed.data.profileId,
    institution_name: parsed.data.institutionName ?? null,
    name: parsed.data.name,
    brand: parsed.data.brand,
    last_four_digits: parsed.data.lastFourDigits,
    credit_limit: parsed.data.creditLimit,
    closing_day: parsed.data.closingDay,
    due_day: parsed.data.dueDay,
  });

  if (error) {
    return { error: "Não foi possível criar o cartão. Tente novamente." };
  }

  revalidatePath("/cartoes");
  return { success: `Cartão "${parsed.data.name}" criado.` };
}

export async function updateCreditCard(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = creditCardSchema.safeParse(readFormData(formData));

  if (!id) return { error: "Cartão inválido." };
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("credit_cards")
    .update({
      profile_id: parsed.data.profileId,
      institution_name: parsed.data.institutionName ?? null,
      name: parsed.data.name,
      brand: parsed.data.brand,
      last_four_digits: parsed.data.lastFourDigits,
      credit_limit: parsed.data.creditLimit,
      closing_day: parsed.data.closingDay,
      due_day: parsed.data.dueDay,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath("/cartoes");
  return { success: "Cartão atualizado." };
}

export async function setCreditCardActive(id: string, active: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("credit_cards").update({ active }).eq("id", id);

  if (error) return { error: "Não foi possível atualizar o cartão." };

  revalidatePath("/cartoes");
  return null;
}
