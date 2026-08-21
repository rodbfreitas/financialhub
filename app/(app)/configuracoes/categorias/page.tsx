import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { SubcategoryQuickAdd } from "@/components/categories/subcategory-quick-add";
import { SeedCategoriesButton } from "@/components/categories/seed-categories-button";
import { EntityActiveToggle } from "@/components/shared/entity-active-toggle";
import { SubcategoryPill } from "@/components/categories/subcategory-pill";
import { Badge } from "@/components/ui/badge";
import { setCategoryActive } from "@/actions/categories";

export const metadata: Metadata = { title: "Categorias — Financial Hub Familiar" };

const TYPE_LABELS: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
  transfer: "Transferência",
  adjustment: "Ajuste",
};

export default async function CategoriasPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type, active, subcategories(id, name, active)")
    .eq("household_id", householdId)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  const hasCategories = !!categories && categories.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <Link
          href="/configuracoes"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ChevronLeft className="size-4" />
          Configurações
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Categorias</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Categorias e subcategorias usadas nas suas transações.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!hasCategories ? <SeedCategoriesButton /> : null}
            <CategoryFormDialog />
          </div>
        </div>
      </div>

      {hasCategories ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Tag className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{category.name}</p>
                    {category.type ? (
                      <Badge variant="outline" className="mt-0.5 text-[10px] font-normal">
                        {TYPE_LABELS[category.type] ?? category.type}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">Qualquer tipo</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CategoryFormDialog
                    category={{
                      id: category.id,
                      name: category.name,
                      type: (category.type ?? "any") as "income" | "expense" | "transfer" | "adjustment" | "any",
                    }}
                  />
                  <EntityActiveToggle id={category.id} active={category.active} action={setCategoryActive} />
                </div>
              </div>

              {category.subcategories.length > 0 ? (
                <ul className="flex flex-wrap gap-1.5">
                  {category.subcategories.map((sub) => (
                    <li key={sub.id}>
                      <SubcategoryPill id={sub.id} name={sub.name} active={sub.active} />
                    </li>
                  ))}
                </ul>
              ) : null}

              <SubcategoryQuickAdd categoryId={category.id} />
            </div>
          ))}
        </div>
      ) : (
        <div
          className="flex max-w-lg flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <Tag className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Nenhuma categoria cadastrada</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            Comece com a lista de categorias sugeridas ou crie a sua própria.
          </p>
          <div className="flex gap-2">
            <SeedCategoriesButton />
            <CategoryFormDialog />
          </div>
        </div>
      )}
    </div>
  );
}
