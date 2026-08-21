"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { budgetSchema } from "@/lib/validations/budget";
import type { ActionState } from "@/lib/action-state";

function readFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    periodType: formData.get("periodType"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    totalLimit: formData.get("totalLimit"),
    profileId: formData.get("profileId"),
    items: formData.get("items"),
  };
}

export async function createBudget(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = budgetSchema.safeParse(readFormData(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);
  if (!householdId) return { error: "Não foi possível identificar seu household." };

  const d = parsed.data;

  const { data: budget, error } = await supabase
    .from("budgets")
    .insert({
      household_id: householdId,
      profile_id: d.profileId ?? null,
      name: d.name,
      period_type: d.periodType,
      start_date: d.startDate,
      end_date: d.endDate,
      total_limit: d.totalLimit ?? null,
    })
    .select("id")
    .single();

  if (error || !budget) return { error: "Não foi possível criar o orçamento. Tente novamente." };

  const { error: itemsError } = await supabase.from("budget_items").insert(
    d.items.map((item) => ({
      budget_id: budget.id,
      category_id: item.categoryId,
      subcategory_id: item.subcategoryId ?? null,
      planned_amount: item.plannedAmount,
    })),
  );

  if (itemsError) {
    // Orçamento sem nenhuma categoria não serve pra nada — desfaz pra não deixar lixo.
    await supabase.from("budgets").delete().eq("id", budget.id);
    return { error: "Não foi possível salvar as categorias do orçamento. Tente novamente." };
  }

  revalidatePath("/planejamento/orcamento");
  revalidatePath("/dashboard");
  return { success: `Orçamento "${d.name}" criado.` };
}

export async function updateBudget(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = budgetSchema.safeParse(readFormData(formData));
  if (!id) return { error: "Orçamento inválido." };
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const d = parsed.data;

  const { error } = await supabase
    .from("budgets")
    .update({
      profile_id: d.profileId ?? null,
      name: d.name,
      period_type: d.periodType,
      start_date: d.startDate,
      end_date: d.endDate,
      total_limit: d.totalLimit ?? null,
    })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  // supabase-js não expõe transação multi-statement; delete+insert não é atômico. Sem
  // trigger de constraint envolvida aqui (diferente de transaction_splits), o pior
  // cenário de uma falha no meio do caminho é o orçamento ficar sem itens — visível e
  // corrigível reabrindo o formulário, não um estado corrompido silencioso.
  const { error: deleteError } = await supabase.from("budget_items").delete().eq("budget_id", id);
  if (deleteError) return { error: "Não foi possível atualizar as categorias do orçamento." };

  const { error: itemsError } = await supabase.from("budget_items").insert(
    d.items.map((item) => ({
      budget_id: id,
      category_id: item.categoryId,
      subcategory_id: item.subcategoryId ?? null,
      planned_amount: item.plannedAmount,
    })),
  );

  if (itemsError) return { error: "Não foi possível salvar as categorias do orçamento." };

  revalidatePath("/planejamento/orcamento");
  revalidatePath("/dashboard");
  return { success: "Orçamento atualizado." };
}

export async function deleteBudget(id: string): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir o orçamento." };

  revalidatePath("/planejamento/orcamento");
  revalidatePath("/dashboard");
  return null;
}
