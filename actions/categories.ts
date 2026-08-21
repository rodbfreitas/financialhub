"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { categorySchema, subcategorySchema } from "@/lib/validations/category";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import type { ActionState } from "@/lib/action-state";
import type { Database } from "@/types/database";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

function toDbType(type: string): TransactionType | null {
  return type === "any" ? null : (type as TransactionType);
}

export async function createCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = categorySchema.safeParse({
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

  const { error } = await supabase.from("categories").insert({
    household_id: householdId,
    name: parsed.data.name,
    type: toDbType(parsed.data.type),
  });

  if (error) {
    return { error: "Não foi possível criar a categoria. Tente novamente." };
  }

  revalidatePath("/configuracoes/categorias");
  return { success: `Categoria "${parsed.data.name}" criada.` };
}

export async function updateCategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
  });

  if (!id) return { error: "Categoria inválida." };
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name, type: toDbType(parsed.data.type) })
    .eq("id", id);

  if (error) return { error: "Não foi possível salvar as alterações." };

  revalidatePath("/configuracoes/categorias");
  return { success: "Categoria atualizada." };
}

export async function setCategoryActive(id: string, active: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ active }).eq("id", id);

  if (error) return { error: "Não foi possível atualizar a categoria." };

  revalidatePath("/configuracoes/categorias");
  return null;
}

export async function createSubcategory(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = subcategorySchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("subcategories").insert({
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
  });

  if (error) {
    return { error: "Não foi possível criar a subcategoria." };
  }

  revalidatePath("/configuracoes/categorias");
  return { success: "Subcategoria criada." };
}

export async function setSubcategoryActive(id: string, active: boolean): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("subcategories").update({ active }).eq("id", id);

  if (error) return { error: "Não foi possível atualizar a subcategoria." };

  revalidatePath("/configuracoes/categorias");
  return null;
}

/**
 * Semeia a lista de categorias sugeridas do PRD §11. Só chamada pela UI quando o
 * household ainda não tem nenhuma categoria (o botão nem aparece caso contrário), mas
 * a guarda abaixo também protege contra duplicar em caso de duplo clique/race.
 */
export async function seedDefaultCategories(): Promise<ActionState> {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    return { error: "Não foi possível identificar seu household." };
  }

  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId);

  if (count && count > 0) {
    return { error: "Seu household já tem categorias cadastradas." };
  }

  for (const def of DEFAULT_CATEGORIES) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .insert({
        household_id: householdId,
        name: def.name,
        type: def.type,
        is_system: true,
      })
      .select("id")
      .single();

    if (categoryError || !category) {
      return { error: "Não foi possível criar as categorias sugeridas. Tente novamente." };
    }

    if (def.subcategories.length > 0) {
      const { error: subError } = await supabase.from("subcategories").insert(
        def.subcategories.map((name) => ({ category_id: category.id, name })),
      );
      if (subError) {
        return { error: "Categorias criadas, mas algumas subcategorias falharam." };
      }
    }
  }

  revalidatePath("/configuracoes/categorias");
  return { success: "Categorias sugeridas criadas." };
}
