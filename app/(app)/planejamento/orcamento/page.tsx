import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { PiggyBank } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import {
  PROFILE_COOKIE,
  PERIOD_COOKIE,
  parsePeriodCookie,
  parseProfileCookie,
  periodToDateRange,
  formatPeriodLabel,
} from "@/lib/filters";
import { BudgetFormDialog } from "@/components/budgets/budget-form-dialog";
import { BudgetCard } from "@/components/budgets/budget-card";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Orçamento — Financial Hub Familiar" };

export default async function OrcamentoPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const profileFilter = parseProfileCookie(cookieStore.get(PROFILE_COOKIE)?.value);
  const period = parsePeriodCookie(cookieStore.get(PERIOD_COOKIE)?.value);
  const { from, to } = periodToDateRange(period);

  let budgetsQuery = supabase
    .from("budgets")
    .select("id, name, period_type, start_date, end_date, total_limit, profile_id, profiles(name)")
    .eq("household_id", householdId)
    .lte("start_date", to)
    .gte("end_date", from)
    .order("start_date", { ascending: false });

  if (profileFilter !== "all") {
    budgetsQuery = budgetsQuery.or(`profile_id.is.null,profile_id.eq.${profileFilter}`);
  }

  const [{ data: budgets }, { data: profiles }, { data: categories }] = await Promise.all([
    budgetsQuery,
    supabase
      .from("profiles")
      .select("id, name")
      .eq("household_id", householdId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select("id, name, subcategories(id, name)")
      .eq("household_id", householdId)
      .eq("active", true)
      .order("display_order", { ascending: true }),
  ]);

  const profileOptions = profiles ?? [];
  const categoryOptions = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    subcategories: c.subcategories.map((s) => ({ id: s.id, name: s.name })),
  }));

  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const subcategoryMap = new Map(
    (categories ?? []).flatMap((c) => c.subcategories.map((s) => [s.id, s.name] as const)),
  );

  const budgetIds = (budgets ?? []).map((b) => b.id);
  const { data: performance } =
    budgetIds.length > 0
      ? await supabase
          .from("budget_performance")
          .select("budget_id, category_id, subcategory_id, planned_amount, realized_amount")
          .in("budget_id", budgetIds)
      : { data: [] };

  const itemsByBudget = new Map<
    string,
    Array<{ categoryId: string; categoryName: string; subcategoryName: string | null; planned: number; realized: number }>
  >();
  for (const row of performance ?? []) {
    if (!row.category_id || !row.budget_id) continue;
    const list = itemsByBudget.get(row.budget_id) ?? [];
    list.push({
      categoryId: row.category_id,
      categoryName: categoryMap.get(row.category_id) ?? "Categoria removida",
      subcategoryName: row.subcategory_id ? (subcategoryMap.get(row.subcategory_id) ?? null) : null,
      planned: Number(row.planned_amount),
      realized: Number(row.realized_amount),
    });
    itemsByBudget.set(row.budget_id, list);
  }

  const hasBudgets = !!budgets && budgets.length > 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Orçamento</h1>
          <p className="text-sm text-muted-foreground">
            Orçamentos que cobrem {formatPeriodLabel(period)}.
          </p>
        </div>
        <BudgetFormDialog profiles={profileOptions} categories={categoryOptions} />
      </div>

      {!hasBudgets ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <PiggyBank className="size-8" />
            <p>Nenhum orçamento cobre o período selecionado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {(budgets ?? []).map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={{
                id: budget.id,
                name: budget.name,
                periodType: budget.period_type,
                startDate: budget.start_date,
                endDate: budget.end_date,
                totalLimit: budget.total_limit !== null ? Number(budget.total_limit) : null,
                profileId: budget.profile_id,
                profileName: budget.profiles?.name ?? null,
              }}
              items={itemsByBudget.get(budget.id) ?? []}
              profiles={profileOptions}
              categories={categoryOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
