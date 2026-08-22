"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { liabilitySchema } from "@/lib/validations/liability";
import type { ActionState } from "@/lib/action-state";

function readFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    type: formData.get("type"),
    currentBalance: formData.get("currentBalance"),
    interestRate: formData.get("interestRate"),
    dueDate: formData.get("dueDate"),
    profileId: formData.get("profileId"),
  };
}

/** Depois de mexer em assets/liabilities, atualiza o snapshot de hoje (021_net_worth_snapshots.sql). */
async function refreshSnapshot(supabase: Awaited<ReturnType<typeof createClient>>, householdId: string) {
  await supabase.rpc("snapshot_net_worth", { p_household_id: householdId });
}

export async function createLiability(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = liabilitySchema.safeParse(readFormData(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const d = parsed.data;

  const { error } = await supabase.from("liabilities").insert({
    household_id: householdId,
    name: d.name,
    type: d.type,
    current_balance: d.currentBalance,
    interest_rate: d.interestRate ?? null,
    due_date: d.dueDate ?? null,
    profile_id: d.profileId ?? null,
  });

  if (error) return { error: "Não foi possível criar o passivo. Tente novamente." };

  await refreshSnapshot(supabase, householdId);
  revalidatePath("/analises/patrimonio");
  revalidatePath("/analises/relatorios");
  return { success: `Passivo "${d.name}" criado.` };
}

export async function updateLiability(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = liabilitySchema.safeParse(readFormData(formData));
  if (!id) return { error: "Passivo inválido." };
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const d = parsed.data;

  const { error } = await supabase
    .from("liabilities")
    .update({
      name: d.name,
      type: d.type,
      current_balance: d.currentBalance,
      interest_rate: d.interestRate ?? null,
      due_date: d.dueDate ?? null,
      profile_id: d.profileId ?? null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  await refreshSnapshot(supabase, householdId);
  revalidatePath("/analises/patrimonio");
  revalidatePath("/analises/relatorios");
  return { success: "Passivo atualizado." };
}

export async function deleteLiability(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const { error } = await supabase.from("liabilities").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o passivo." };

  await refreshSnapshot(supabase, householdId);
  revalidatePath("/analises/patrimonio");
  revalidatePath("/analises/relatorios");
  return null;
}
