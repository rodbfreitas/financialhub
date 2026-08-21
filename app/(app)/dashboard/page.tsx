import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowDownRight, ArrowUpRight, PiggyBank, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import {
  PROFILE_COOKIE,
  PERIOD_COOKIE,
  parsePeriodCookie,
  parseProfileCookie,
  periodToDateRange,
  previousPeriodRange,
  trailingMonths,
  formatPeriodLabel,
} from "@/lib/filters";
import {
  sumTotals,
  groupByMonth,
  groupByCategory,
  groupByProfile,
  splitFixedVariable,
  type DashboardTxRow,
} from "@/lib/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { BalanceTrendChart } from "@/components/dashboard/balance-trend-chart";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { ProfileBreakdown } from "@/components/dashboard/profile-breakdown";
import { FixedVariableBar } from "@/components/dashboard/fixed-variable-bar";
import { BudgetProgressList, type BudgetRow } from "@/components/dashboard/budget-progress-list";
import { UpcomingCommitments, type UpcomingRecurring, type UpcomingBill } from "@/components/dashboard/upcoming-commitments";

export const metadata: Metadata = { title: "Visão Geral — Financial Hub Familiar" };

const TXN_COLUMNS = "type, amount, transaction_date, category_id, profile_id, recurring_transaction_id, installment_plan_id";

export default async function DashboardPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const profileFilter = parseProfileCookie(cookieStore.get(PROFILE_COOKIE)?.value);
  const period = parsePeriodCookie(cookieStore.get(PERIOD_COOKIE)?.value);
  const { from, to } = periodToDateRange(period);
  const previous = previousPeriodRange(period);
  const todayIso = new Date().toISOString().slice(0, 10);
  // Ancora o gráfico de evolução mensal em hoje quando o fim do período selecionado
  // está no futuro (ex.: atalho "Este ano" com `to` em 31/12) — senão os últimos meses
  // do gráfico ficariam vazios (ainda não aconteceram) e empurrariam os meses com dados
  // pra fora da janela de 6 meses.
  const months = trailingMonths(to < todayIso ? to : todayIso, 6);

  function withProfileFilter<T extends { eq: (col: string, val: string) => T }>(query: T): T {
    return profileFilter === "all" ? query : query.eq("profile_id", profileFilter);
  }

  const [
    { data: profiles },
    { data: categories },
    { data: periodTxns },
    { data: previousTxns },
    { data: trendTxns },
    { data: budgets },
    { data: recurringRaw },
    { data: billsRaw },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, type")
      .eq("household_id", householdId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase.from("categories").select("id, name").eq("household_id", householdId),
    withProfileFilter(
      supabase
        .from("transactions")
        .select(TXN_COLUMNS)
        .eq("household_id", householdId)
        .is("deleted_at", null)
        .eq("status", "posted")
        .in("type", ["income", "expense"])
        .gte("transaction_date", from)
        .lte("transaction_date", to),
    ),
    withProfileFilter(
      supabase
        .from("transactions")
        .select(TXN_COLUMNS)
        .eq("household_id", householdId)
        .is("deleted_at", null)
        .eq("status", "posted")
        .in("type", ["income", "expense"])
        .gte("transaction_date", previous.from)
        .lte("transaction_date", previous.to),
    ),
    withProfileFilter(
      supabase
        .from("transactions")
        .select(TXN_COLUMNS)
        .eq("household_id", householdId)
        .is("deleted_at", null)
        .eq("status", "posted")
        .in("type", ["income", "expense"])
        .gte("transaction_date", months[0].from)
        .lte("transaction_date", months[months.length - 1].to),
    ),
    (() => {
      let q = supabase
        .from("budgets")
        .select("id")
        .eq("household_id", householdId)
        .lte("start_date", to)
        .gte("end_date", from);
      if (profileFilter !== "all") q = q.or(`profile_id.is.null,profile_id.eq.${profileFilter}`);
      return q;
    })(),
    withProfileFilter(
      supabase
        .from("recurring_transactions")
        .select("id, description, amount, type, next_occurrence, frequency, profile_id, profiles(name)")
        .eq("household_id", householdId)
        .eq("active", true)
        .gte("next_occurrence", todayIso)
        .order("next_occurrence", { ascending: true })
        .limit(8),
    ),
    supabase
      .from("credit_card_bills")
      .select("id, due_date, total_amount, status, credit_cards(name, profile_id, profiles(name))")
      .eq("household_id", householdId)
      .neq("status", "paid")
      .order("due_date", { ascending: true })
      .limit(20),
  ]);

  const periodRows = (periodTxns ?? []) as DashboardTxRow[];
  const previousRows = (previousTxns ?? []) as DashboardTxRow[];
  const trendRows = (trendTxns ?? []) as DashboardTxRow[];

  const totals = sumTotals(periodRows);
  const previousTotals = sumTotals(previousRows);
  const monthly = groupByMonth(trendRows, months);

  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const categorySlices = groupByCategory(periodRows, categoryMap);

  const profileList = (profiles ?? []) as Array<{ id: string; name: string; type: "individual" | "shared" }>;
  const profileSlices = groupByProfile(periodRows, profileList);

  const fixedVariable = splitFixedVariable(periodRows);

  // budget_performance é uma view (sem FK reconhecível pelo PostgREST pra embutir
  // categories(name)) — busca separada por budget_id e resolve o nome via categoryMap.
  const budgetIds = (budgets ?? []).map((b) => b.id);
  let budgetRows: BudgetRow[] = [];
  if (budgetIds.length > 0) {
    const { data: performance } = await supabase
      .from("budget_performance")
      .select("category_id, planned_amount, realized_amount")
      .in("budget_id", budgetIds);

    const byCategory = new Map<string, { planned: number; realized: number }>();
    for (const row of performance ?? []) {
      // budget_items.category_id é NOT NULL no schema; a view só aparece nullable
      // nos tipos gerados por ser view (sem metadata de constraint pro PostgREST).
      if (!row.category_id) continue;
      const key = row.category_id;
      const current = byCategory.get(key) ?? { planned: 0, realized: 0 };
      current.planned += Number(row.planned_amount);
      current.realized += Number(row.realized_amount);
      byCategory.set(key, current);
    }
    budgetRows = [...byCategory.entries()]
      .map(([categoryId, v]) => ({
        categoryId,
        categoryName: categoryMap.get(categoryId) ?? "Categoria removida",
        planned: v.planned,
        realized: v.realized,
      }))
      .sort((a, b) => b.planned - a.planned);
  }

  const recurringUpcoming: UpcomingRecurring[] = (recurringRaw ?? []).map((r) => ({
    id: r.id,
    description: r.description,
    amount: Number(r.amount),
    type: r.type as "income" | "expense",
    nextOccurrence: r.next_occurrence,
    frequency: r.frequency,
    profileName: (r.profiles as { name: string } | null)?.name ?? "—",
  }));

  const billsUpcoming: UpcomingBill[] = (billsRaw ?? [])
    .filter((b) => profileFilter === "all" || (b.credit_cards as { profile_id: string } | null)?.profile_id === profileFilter)
    .slice(0, 8)
    .map((b) => ({
      id: b.id,
      cardName: (b.credit_cards as { name: string } | null)?.name ?? "Cartão",
      dueDate: b.due_date,
      totalAmount: Number(b.total_amount),
      status: b.status,
      profileName: (b.credit_cards as { profiles: { name: string } | null } | null)?.profiles?.name ?? "—",
    }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Visão Geral</h1>
        <p className="text-sm text-muted-foreground">{formatPeriodLabel(period)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={ArrowUpRight} label="Receitas" value={totals.income} previousValue={previousTotals.income} higherIsBetter />
        <KpiCard
          icon={ArrowDownRight}
          label="Despesas"
          value={totals.expenses}
          previousValue={previousTotals.expenses}
          higherIsBetter={false}
        />
        <KpiCard icon={Wallet} label="Saldo" value={totals.balance} previousValue={previousTotals.balance} higherIsBetter />
        <KpiCard
          icon={PiggyBank}
          label="Taxa de poupança"
          value={totals.savingsRate}
          previousValue={previousTotals.savingsRate}
          higherIsBetter
          unit="percent"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">Receitas x despesas — evolução mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <CashFlowChart data={monthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">Evolução do saldo</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceTrendChart data={monthly} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">Orçamento x realizado</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetProgressList data={budgetRows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">Fixas x variáveis</CardTitle>
          </CardHeader>
          <CardContent>
            <FixedVariableBar data={fixedVariable} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={categorySlices} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">Gastos por perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileBreakdown data={profileSlices} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">Compromissos futuros</CardTitle>
        </CardHeader>
        <CardContent>
          <UpcomingCommitments recurring={recurringUpcoming} bills={billsUpcoming} />
        </CardContent>
      </Card>
    </div>
  );
}
