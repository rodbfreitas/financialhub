/**
 * Agregações puras (sem I/O) usadas pela página de Relatórios (Etapa 10 — Prompt
 * Mestre, PRD §32). Mesmo espírito de `lib/dashboard.ts`: a página busca as linhas já
 * filtradas por household/perfil/período no server e passa pra essas funções.
 */

import type { MonthBucket } from "@/lib/dashboard";

export type ReportTxRow = {
  type: "income" | "expense";
  amount: number;
  transaction_date: string;
  category_id: string | null;
  profile_id: string;
  nature: "individual" | "shared";
  credit_card_id: string | null;
  recurring_transaction_id: string | null;
  installment_plan_id: string | null;
};

/** Fixas x variáveis por mês (mesma regra de `splitFixedVariable`, mas em série). */
export type FixedVariableMonthBucket = { label: string; year: number; month: number; fixed: number; variable: number };

export function groupFixedVariableByMonth(
  rows: ReportTxRow[],
  months: Array<{ year: number; month: number; from: string; to: string; label: string }>,
): FixedVariableMonthBucket[] {
  return months.map((m) => {
    const expenses = rows.filter(
      (r) => r.type === "expense" && r.transaction_date >= m.from && r.transaction_date <= m.to,
    );
    const fixed = expenses
      .filter((r) => r.recurring_transaction_id !== null || r.installment_plan_id !== null)
      .reduce((sum, r) => sum + r.amount, 0);
    const total = expenses.reduce((sum, r) => sum + r.amount, 0);
    return { label: m.label, year: m.year, month: m.month, fixed, variable: total - fixed };
  });
}

export type NatureTotals = { individual: { income: number; expenses: number }; shared: { income: number; expenses: number } };

/**
 * Gastos compartilhados (PRD §32 + §5): usa `transactions.nature`, que é
 * independente do titular (`profile_id`) — uma compra do Rodrigo pode ser
 * "compartilhada" mesmo lançada no perfil dele.
 */
export function groupByNature(rows: ReportTxRow[]): NatureTotals {
  const totals: NatureTotals = { individual: { income: 0, expenses: 0 }, shared: { income: 0, expenses: 0 } };
  for (const r of rows) {
    const bucket = totals[r.nature];
    if (r.type === "income") bucket.income += r.amount;
    else bucket.expenses += r.amount;
  }
  return totals;
}

export type NatureMonthBucket = { label: string; year: number; month: number; individual: number; shared: number };

/** Despesas individuais x compartilhadas, mês a mês. */
export function groupByNatureByMonth(
  rows: ReportTxRow[],
  months: Array<{ year: number; month: number; from: string; to: string; label: string }>,
): NatureMonthBucket[] {
  return months.map((m) => {
    const inMonth = rows.filter(
      (r) => r.type === "expense" && r.transaction_date >= m.from && r.transaction_date <= m.to,
    );
    const individual = inMonth.filter((r) => r.nature === "individual").reduce((sum, r) => sum + r.amount, 0);
    const shared = inMonth.filter((r) => r.nature === "shared").reduce((sum, r) => sum + r.amount, 0);
    return { label: m.label, year: m.year, month: m.month, individual, shared };
  });
}

export type CardSlice = { creditCardId: string; name: string; amount: number; percentage: number };

/** Gasto por cartão no período (transações com `credit_card_id`, tipo despesa). */
export function groupByCard(rows: ReportTxRow[], cardNames: Map<string, string>): CardSlice[] {
  const expenses = rows.filter((r) => r.type === "expense" && r.credit_card_id !== null);
  const total = expenses.reduce((sum, r) => sum + r.amount, 0);
  if (total === 0) return [];

  const byCard = new Map<string, number>();
  for (const r of expenses) {
    const key = r.credit_card_id as string;
    byCard.set(key, (byCard.get(key) ?? 0) + r.amount);
  }

  return [...byCard.entries()]
    .map(([creditCardId, amount]) => ({
      creditCardId,
      name: cardNames.get(creditCardId) ?? "Cartão removido",
      amount,
      percentage: (amount / total) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Total em cartões por mês (soma de todos os cartões) — trend pro relatório de Cartões. */
export function groupCardTotalByMonth(
  rows: ReportTxRow[],
  months: Array<{ year: number; month: number; from: string; to: string; label: string }>,
): MonthBucket[] {
  return months.map((m) => {
    const inMonth = rows.filter(
      (r) =>
        r.type === "expense" &&
        r.credit_card_id !== null &&
        r.transaction_date >= m.from &&
        r.transaction_date <= m.to,
    );
    const total = inMonth.reduce((sum, r) => sum + r.amount, 0);
    return { label: m.label, year: m.year, month: m.month, income: 0, expenses: total, balance: -total };
  });
}

export type DailyCashFlowPoint = { date: string; label: string; net: number; cumulative: number };

/**
 * Fluxo de caixa diário dentro do período selecionado (PRD §32 "Fluxo de caixa"):
 * saldo do dia (receitas - despesas) e saldo acumulado desde o início do período.
 */
export function dailyCashFlow(
  rows: Array<{ type: "income" | "expense"; amount: number; transaction_date: string }>,
  from: string,
  to: string,
): DailyCashFlowPoint[] {
  const byDate = new Map<string, number>();
  for (const r of rows) {
    if (r.transaction_date < from || r.transaction_date > to) continue;
    const delta = r.type === "income" ? r.amount : -r.amount;
    byDate.set(r.transaction_date, (byDate.get(r.transaction_date) ?? 0) + delta);
  }

  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const points: DailyCashFlowPoint[] = [];
  let cumulative = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const net = byDate.get(iso) ?? 0;
    cumulative += net;
    points.push({
      date: iso,
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      net,
      cumulative,
    });
  }
  return points;
}

export type BudgetVarianceRow = {
  categoryId: string;
  categoryName: string;
  planned: number;
  realized: number;
  variance: number;
  variancePercent: number;
};

/** Orçamento x realizado com variância — versão detalhada pro relatório (dashboard só mostra o progresso). */
export function budgetVariance(
  rows: Array<{ categoryId: string; categoryName: string; planned: number; realized: number }>,
): BudgetVarianceRow[] {
  return rows
    .map((r) => ({
      ...r,
      variance: r.realized - r.planned,
      variancePercent: r.planned > 0 ? ((r.realized - r.planned) / r.planned) * 100 : 0,
    }))
    .sort((a, b) => b.variance - a.variance);
}
