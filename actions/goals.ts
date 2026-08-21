"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { goalSchema } from "@/lib/validations/goal";
import type { ActionState } from "@/lib/action-state";

function readFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    targetAmount: formData.get("targetAmount"),
    currentAmount: formData.get("currentAmount"),
    targetDate: formData.get("targetDate"),
    monthlyContribution: formData.get("monthlyContribution"),
    profileId: formData.get("profileId"),
    status: formData.get("status"),
  };
}

export async function createGoal(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = goalSchema.safeParse(readFormData(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const d = parsed.data;

  const { error } = await supabase.from("financial_goals").insert({
    household_id: householdId,
    profile_id: d.profileId ?? null,
    name: d.name,
    description: d.description ?? null,
    target_amount: d.targetAmount,
    current_amount: d.currentAmount,
    target_date: d.targetDate ?? null,
    monthly_contribution: d.monthlyContribution ?? null,
    status: d.status,
  });

  if (error) return { error: "Não foi possível criar a meta. Tente novamente." };

  revalidatePath("/planejamento/metas");
  return { success: `Meta "${d.name}" criada.` };
}

export async function updateGoal(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = goalSchema.safeParse(readFormData(formData));
  if (!id) return { error: "Meta inválida." };
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const d = parsed.data;

  const { error } = await supabase
    .from("financial_goals")
    .update({
      profile_id: d.profileId ?? null,
      name: d.name,
      description: d.description ?? null,
      target_amount: d.targetAmount,
      current_amount: d.currentAmount,
      target_date: d.targetDate ?? null,
      monthly_contribution: d.monthlyContribution ?? null,
      status: d.status,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath("/planejamento/metas");
  return { success: "Meta atualizada." };
}

export async function deleteGoal(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("financial_goals").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir a meta." };

  revalidatePath("/planejamento/metas");
  return null;
}
