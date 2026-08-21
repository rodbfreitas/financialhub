"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { profileSchema } from "@/lib/validations/profile";
import type { ActionState } from "@/lib/action-state";

export async function createProfile(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    return { error: "Não foi possível identificar seu household." };
  }

  const { error } = await supabase.from("profiles").insert({
    household_id: householdId,
    name: parsed.data.name,
    type: parsed.data.type,
  });

  if (error) {
    return { error: "Não foi possível criar o perfil. Tente novamente." };
  }

  revalidatePath("/configuracoes/perfis");
  return { success: `Perfil "${parsed.data.name}" criado.` };
}

export async function updateProfile(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });

  if (!id) {
    return { error: "Perfil inválido." };
  }
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ name: parsed.data.name, type: parsed.data.type })
    .eq("id", id);

  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  revalidatePath("/configuracoes/perfis");
  return { success: "Perfil atualizado." };
}

/**
 * Só alterna `active` — nunca exclui de verdade. profiles tem `on delete cascade` em
 * accounts/credit_cards/transactions; um hard delete apagaria histórico financeiro
 * inteiro sem aviso. Desativar esconde o perfil dos seletores sem perder nada.
 */
export async function setProfileActive(id: string, active: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ active }).eq("id", id);

  if (error) {
    return { error: "Não foi possível atualizar o perfil." };
  }

  revalidatePath("/configuracoes/perfis");
  return null;
}
