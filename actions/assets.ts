"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { assetSchema } from "@/lib/validations/asset";
import type { ActionState } from "@/lib/action-state";

function readFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    type: formData.get("type"),
    currentValue: formData.get("currentValue"),
    valuationDate: formData.get("valuationDate"),
    profileId: formData.get("profileId"),
  };
}

/** Depois de mexer em assets/liabilities, atualiza o snapshot de hoje (021_net_worth_snapshots.sql). */
async function refreshSnapshot(supabase: Awaited<ReturnType<typeof createClient>>, householdId: string) {
  await supabase.rpc("snapshot_net_worth", { p_household_id: householdId });
}

export async function createAsset(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = assetSchema.safeParse(readFormData(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const d = parsed.data;

  const { error } = await supabase.from("assets").insert({
    household_id: householdId,
    name: d.name,
    type: d.type,
    current_value: d.currentValue,
    valuation_date: d.valuationDate,
    profile_id: d.profileId ?? null,
  });

  if (error) return { error: "Não foi possível criar o ativo. Tente novamente." };

  await refreshSnapshot(supabase, householdId);
  revalidatePath("/analises/patrimonio");
  revalidatePath("/analises/relatorios");
  return { success: `Ativo "${d.name}" criado.` };
}

export async function updateAsset(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = assetSchema.safeParse(readFormData(formData));
  if (!id) return { error: "Ativo inválido." };
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const d = parsed.data;

  const { error } = await supabase
    .from("assets")
    .update({
      name: d.name,
      type: d.type,
      current_value: d.currentValue,
      valuation_date: d.valuationDate,
      profile_id: d.profileId ?? null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  await refreshSnapshot(supabase, householdId);
  revalidatePath("/analises/patrimonio");
  revalidatePath("/analises/relatorios");
  return { success: "Ativo atualizado." };
}

export async function deleteAsset(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o ativo." };

  await refreshSnapshot(supabase, householdId);
  revalidatePath("/analises/patrimonio");
  revalidatePath("/analises/relatorios");
  return null;
}
