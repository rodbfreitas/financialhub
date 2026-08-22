import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowUpRight, ArrowDownRight, Wallet, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveHouseholdId } from "@/lib/supabase/household";
import {
  PROFILE_COOKIE,
  PERIOD_COOKIE,
  parsePeriodCookie,
  parseProfileCookie,
  periodToDateRange,
  trailingMonths,
  formatPeriodLabel,
} from "@/lib/filters";
import { sumTotals, groupByMonth, groupByCategory, groupByProfile, type DashboardTxRow } from "@/lib/dashboard";
import {
  groupFixedVariableByMonth,
  groupByNature,
  groupByNatureByMonth,
  groupByCard,
  groupCardTotalByMonth,
  dailyCashFlow,
  budgetVariance,
  type ReportTxRow,
} from "@/lib/reports";
import { monthlyEquivalent, annualEquivalent } from "@/lib/subscriptions";
import { formatMoney } from "@/lib/money";
import { MoneyDisplay } from "@/components/finance/money-display";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { BalanceTrendChart } from "@/components/dashboard/balance-trend-chart";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { ProfileBreakdown } from "@/components/dashboard/profile-breakdown";
import { DailyCashFlowChart } from "@/components/reports/daily-cash-flow-chart";
import { NatureTrendChart } from "@/components/reports/nature-trend-chart";
import { FixedVariableTrendChart } from "@/components/reports/fixed-variable-trend-chart";
import { SpendTrendChart } from "@/components/reports/spend-trend-chart";
import { NetWorthTrendChart, type NetWorthPoint } from "@/components/reports/net-worth-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Relatórios — Financial Hub Familiar" };

const TXN_COLUMNS =
  "type, amount, transaction_date, category_id, profile_id, nature, credit_card_id, recurring_transaction_id, installment_plan_id";

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Semanal",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Personalizada",
};

export default async function RelatoriosPage() {
  const supabase = await createClient();
  const householdId = await getActiveHouseholdId(supabase);

  if (!householdId) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const profileFilter = parseProfileCookie(cookieStore.get(PROFILE_COOKIE)?.value);
  const period = parsePeriodCookie(cookieStore.get(PERIOD_COOKIE)?.value);
  const { from, to } = periodToDateRange(period);
  const todayIso = new Date().toISOString().slice(0, 10);
  const months = trailingMonths(to < todayIso ? to : todayIso, 12);

  function withProfileFilter<T extends { eq: (col: string, val: string) => T }>(query: T): T {
    return profileFilter === "all" ? query : query.eq("profile_id", profileFilter);
  }

  const [
    { data: profiles },
    { data: categories },
    { data: creditCards },
    { data: periodTxns },
    { data: trendTxns },
    { data: budgets },
    { data: subscriptionsRaw },
    { data: snapshots },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, type")
      .eq("household_id", householdId)
      .eq("active", true)
      .is("deleted_at", null)
      .order("name", { ascending: true }),
    supabase.from("categories").select("id, name").eq("household_id", householdId),
    supabase
      .from("credit_cards")
      .select("id, name, profile_id")
      .eq("household_id", householdId)
      .eq("active", true)
      .is("deleted_at", null),
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
        .from("subscriptions")
        .select("id, name, amount, frequency, active, category_id, categories(name)")
        .eq("household_id", householdId)
        .eq("active", true),
    ),
    supabase
      .from("net_worth_snapshots")
      .select("snapshot_date, total_accounts, total_assets, total_credit_card_debt, total_liabilities, net_worth")
      .eq("household_id", householdId)
      .order("snapshot_date", { ascending: true })
      .limit(180),
  ]);

  const periodRows = (periodTxns ?? []) as ReportTxRow[];
  const trendRows = (trendTxns ?? []) as ReportTxRow[];
  const dashboardPeriodRows = periodRows as DashboardTxRow[];
  const dashboardTrendRows = trendRows as DashboardTxRow[];

  const totals = sumTotals(dashboardPeriodRows);
  const monthly = groupByMonth(dashboardTrendRows, months);
  const fixedVariableTrend = groupFixedVariableByMonth(trendRows, months);

  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const categoryFull = groupByCategory(dashboardPeriodRows, categoryMap, 999);

  const profileList = (profiles ?? []) as Array<{ id: string; name: string; type: "individual" | "shared" }>;
  const profileSlices = groupByProfile(dashboardPeriodRows, profileList);

  const natureTotals = groupByNature(periodRows);
  const natureTrend = groupByNatureByMonth(trendRows, months);
  const natureSlices = [
    { categoryId: "individual", name: "Individual", amount: natureTotals.individual.expenses, percentage: 0 },
    { categoryId: "shared", name: "Compartilhado", amount: natureTotals.shared.expenses, percentage: 0 },
  ].filter((s) => s.amount > 0);
  const natureSliceTotal = natureSlices.reduce((sum, s) => sum + s.amount, 0);
  natureSlices.forEach((s) => (s.percentage = natureSliceTotal > 0 ? (s.amount / natureSliceTotal) * 100 : 0));

  const cardMap = new Map((creditCards ?? []).map((c) => [c.id, c.name]));
  const cardSlices = groupByCard(periodRows, cardMap);
  const cardSlicesAsCategory = cardSlices.map((c) => ({
    categoryId: c.creditCardId,
    name: c.name,
    amount: c.amount,
    percentage: c.percentage,
  }));
  const cardTrend = groupCardTotalByMonth(trendRows, months);

  const daily = dailyCashFlow(periodRows, from, to);

  const subscriptions = subscriptionsRaw ?? [];
  const subscriptionsMonthly = subscriptions.reduce((sum, s) => sum + monthlyEquivalent(Number(s.amount), s.frequency), 0);
  const subscriptionsAnnual = subscriptions.reduce((sum, s) => sum + annualEquivalent(Number(s.amount), s.frequency), 0);

  // budget_performance é uma view (sem FK reconhecível pelo PostgREST) — mesma
  // estratégia do dashboard: busca separada por budget_id, resolve nome via categoryMap.
  const budgetIds = (budgets ?? []).map((b) => b.id);
  let budgetRows: Array<{ categoryId: string; categoryName: string; planned: number; realized: number }> = [];
  if (budgetIds.length > 0) {
    const { data: performance } = await supabase
      .from("budget_performance")
      .select("category_id, planned_amount, realized_amount")
      .in("budget_id", budgetIds);

    const byCategory = new Map<string, { planned: number; realized: number }>();
    for (const row of performance ?? []) {
      if (!row.category_id) continue;
      const key = row.category_id;
      const current = byCategory.get(key) ?? { planned: 0, realized: 0 };
      current.planned += Number(row.planned_amount);
      current.realized += Number(row.realized_amount);
      byCategory.set(key, current);
    }
    budgetRows = [...byCategory.entries()].map(([categoryId, v]) => ({
      categoryId,
      categoryName: categoryMap.get(categoryId) ?? "Categoria removida",
      planned: v.planned,
      realized: v.realized,
    }));
  }
  const budgetVarianceRows = budgetVariance(budgetRows);

  const trend: NetWorthPoint[] = (snapshots ?? []).map((s) => ({
    date: s.snapshot_date,
    label: new Date(s.snapshot_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    totalAccounts: Number(s.total_accounts),
    totalAssets: Number(s.total_assets),
    totalCreditCardDebt: Number(s.total_credit_card_debt),
    totalLiabilities: Number(s.total_liabilities),
    netWorth: Number(s.net_worth),
  }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">{formatPeriodLabel(period)} · relatórios prioritários do PRD §32</p>
      </div>

      <Tabs defaultValue="fluxo" className="flex flex-col gap-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="fluxo">Fluxo de caixa</TabsTrigger>
          <TabsTrigger value="receitas">Receitas x despesas</TabsTrigger>
          <TabsTrigger value="categorias">Categorias, perfis e natureza</TabsTrigger>
          <TabsTrigger value="cartoes">Cartões e assinaturas</TabsTrigger>
          <TabsTrigger value="orcamento">Orçamento</TabsTrigger>
          <TabsTrigger value="patrimonio">Patrimônio</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo" className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard icon={ArrowUpRight} label="Receitas no período" value={totals.income} higherIsBetter />
            <KpiCard icon={ArrowDownRight} label="Despesas no período" value={totals.expenses} higherIsBetter={false} />
            <KpiCard icon={Wallet} label="Saldo do período" value={totals.balance} higherIsBetter />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground">Fluxo de caixa acumulado no período</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyCashFlowChart data={daily} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receitas" className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">Receitas x despesas — evolução mensal (12 meses)</CardTitle>
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
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">Fixas x variáveis</CardTitle>
              </CardHeader>
              <CardContent>
                <FixedVariableTrendChart data={fixedVariableTrend} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categorias" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground">Gastos por categoria — {formatPeriodLabel(period)}</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryDonut data={categoryFull} />
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">Gastos por pessoa</CardTitle>
              </CardHeader>
              <CardContent>
                <ProfileBreakdown data={profileSlices} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">Gastos compartilhados x individuais</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryDonut data={natureSlices} />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground">Compartilhado x individual — evolução mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <NatureTrendChart data={natureTrend} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cartoes" className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">Gastos por cartão — {formatPeriodLabel(period)}</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryDonut data={cardSlicesAsCategory} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium text-foreground">Total em cartões — evolução mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <SpendTrendChart data={cardTrend} label="Cartões" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground">Assinaturas ativas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Custo mensal equivalente</p>
                  <p className="text-lg font-semibold tabular-nums">{formatMoney(subscriptionsMonthly)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Custo anual equivalente</p>
                  <p className="text-lg font-semibold tabular-nums">{formatMoney(subscriptionsAnnual)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Assinaturas ativas</p>
                  <p className="text-lg font-semibold tabular-nums">{subscriptions.length}</p>
                </div>
              </div>
              {subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma assinatura ativa neste filtro.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead className="text-right">Equivalente mensal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions
                      .slice()
                      .sort((a, b) => monthlyEquivalent(Number(b.amount), b.frequency) - monthlyEquivalent(Number(a.amount), a.frequency))
                      .map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.name}</TableCell>
                          <TableCell className="text-muted-foreground">{(s.categories as { name: string } | null)?.name ?? "—"}</TableCell>
                          <TableCell>{FREQUENCY_LABELS[s.frequency] ?? s.frequency}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            <MoneyDisplay amount={monthlyEquivalent(Number(s.amount), s.frequency)} />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orcamento" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium text-foreground">Orçamento x realizado — {formatPeriodLabel(period)}</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetVarianceRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum orçamento definido para este período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Planejado</TableHead>
                      <TableHead className="text-right">Realizado</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetVarianceRows.map((row) => (
                      <TableRow key={row.categoryId}>
                        <TableCell>{row.categoryName}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(row.planned)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(row.realized)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <div className="flex items-center justify-end gap-2">
                            <MoneyDisplay amount={row.variance} signed />
                            <Badge variant={row.variance > 0 ? "negative" : "outline"}>
                              {row.variancePercent > 0 ? "+" : ""}
                              {row.variancePercent.toFixed(0)}%
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patrimonio" className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base font-medium text-foreground">Evolução patrimonial</CardTitle>
              <Link href="/analises/patrimonio" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Ver detalhes <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent>
              <NetWorthTrendChart data={trend} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
