"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { createAccountSchema, updateAccountSchema } from "@/lib/validations/account";
import type { ActionState } from "@/lib/action-state";

export async function createAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createAccountSchema.safeParse({
    name: formData.get("name"),
    institutionName: formData.get("institutionName"),
    type: formData.get("type"),
    profileId: formData.get("profileId"),
    currency: formData.get("currency"),
    currentBalance: formData.get("currentBalance"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    return { error: "Não foi possível identificar seu household." };
  }

  const { error } = await supabase.from("accounts").insert({
    household_id: householdId,
    profile_id: parsed.data.profileId,
    institution_name: parsed.data.institutionName ?? null,
    name: parsed.data.name,
    type: parsed.data.type,
    currency: parsed.data.currency,
    current_balance: parsed.data.currentBalance,
  });

  if (error) {
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  revalidatePath("/contas");
  return { success: `Conta "${parsed.data.name}" criada.` };
}

export async function updateAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = updateAccountSchema.safeParse({
    name: formData.get("name"),
    institutionName: formData.get("institutionName"),
    type: formData.get("type"),
    profileId: formData.get("profileId"),
    currency: formData.get("currency"),
  });

  if (!id) return { error: "Conta inválida." };
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({
      profile_id: parsed.data.profileId,
      institution_name: parsed.data.institutionName ?? null,
      name: parsed.data.name,
      type: parsed.data.type,
      currency: parsed.data.currency,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath("/contas");
  return { success: "Conta atualizada." };
}

export async function setAccountActive(id: string, active: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").update({ active }).eq("id", id);

  if (error) return { error: "Não foi possível atualizar a conta." };

  revalidatePath("/contas");
  return null;
}
