/**
 * Agregações puras (sem I/O) usadas pelo dashboard (Etapa 7 — Prompt Mestre §Etapa 7,
 * PRD §9). A página busca as transações já filtradas por household/perfil/período no
 * server e passa pra essas funções — mantém a lógica de agregação testável e separada
 * da busca de dados, no mesmo espírito de `lib/credit-card-billing.ts` e
 * `lib/recurrence.ts`.
 */

export type DashboardTxRow = {
  type: "income" | "expense";
  amount: number;
  transaction_date: string;
  category_id: string | null;
  profile_id: string;
  recurring_transaction_id: string | null;
  installment_plan_id: string | null;
};

export type PeriodTotals = {
  income: number;
  expenses: number;
  balance: number;
  savingsRate: number;
};

export function sumTotals(rows: DashboardTxRow[]): PeriodTotals {
  const income = rows.filter((r) => r.type === "income").reduce((sum, r) => sum + r.amount, 0);
  const expenses = rows.filter((r) => r.type === "expense").reduce((sum, r) => sum + r.amount, 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;
  return { income, expenses, balance, savingsRate };
}

export type MonthBucket = { label: string; year: number; month: number; income: number; expenses: number; balance: number };

/** Agrupa `rows` nos buckets mensais de `months` (de `lib/filters.ts#trailingMonths`). */
export function groupByMonth(
  rows: DashboardTxRow[],
  months: Array<{ year: number; month: number; from: string; to: string; label: string }>,
): MonthBucket[] {
  return months.map((m) => {
    const inMonth = rows.filter((r) => r.transaction_date >= m.from && r.transaction_date <= m.to);
    const totals = sumTotals(inMonth);
    return { label: m.label, year: m.year, month: m.month, income: totals.income, expenses: totals.expenses, balance: totals.balance };
  });
}

export type CategorySlice = { categoryId: string | null; name: string; amount: number; percentage: number };

/** Top `limit` categorias de despesa por valor; o resto (se houver) vira "Outras". */
export function groupByCategory(
  rows: DashboardTxRow[],
  categoryNames: Map<string, string>,
  limit = 6,
): CategorySlice[] {
  const expenses = rows.filter((r) => r.type === "expense");
  const total = expenses.reduce((sum, r) => sum + r.amount, 0);
  if (total === 0) return [];

  const byCategory = new Map<string, number>();
  for (const r of expenses) {
    const key = r.category_id ?? "__none__";
    byCategory.set(key, (byCategory.get(key) ?? 0) + r.amount);
  }

  const sorted = [...byCategory.entries()]
    .map(([categoryId, amount]) => ({
      categoryId: categoryId === "__none__" ? null : categoryId,
      name: categoryId === "__none__" ? "Sem categoria" : (categoryNames.get(categoryId) ?? "Categoria removida"),
      amount,
      percentage: (amount / total) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (sorted.length <= limit) return sorted;

  const top = sorted.slice(0, limit - 1);
  const rest = sorted.slice(limit - 1);
  const restAmount = rest.reduce((sum, c) => sum + c.amount, 0);
  top.push({ categoryId: null, name: "Outras", amount: restAmount, percentage: (restAmount / total) * 100 });
  return top;
}

export type ProfileSlice = { profileId: string; name: string; type: "individual" | "shared"; income: number; expenses: number };

export function groupByProfile(
  rows: DashboardTxRow[],
  profiles: Array<{ id: string; name: string; type: "individual" | "shared" }>,
): ProfileSlice[] {
  return profiles
    .map((p) => {
      const own = rows.filter((r) => r.profile_id === p.id);
      const totals = sumTotals(own);
      return { profileId: p.id, name: p.name, type: p.type, income: totals.income, expenses: totals.expenses };
    })
    .filter((p) => p.income > 0 || p.expenses > 0)
    .sort((a, b) => b.expenses - a.expenses);
}

export type FixedVariableSplit = { fixed: number; variable: number };

/**
 * Não existe uma flag "is_fixed" no schema (ERD/PRD não definem uma) — a distinção
 * real disponível é a origem da transação: despesas geradas por uma recorrência ou um
 * parcelamento são, por definição, compromissos fixos/previsíveis; o resto é variável.
 * É uma métrica derivada de dados reais, não um valor inventado.
 */
export function splitFixedVariable(rows: DashboardTxRow[]): FixedVariableSplit {
  const expenses = rows.filter((r) => r.type === "expense");
  const fixed = expenses
    .filter((r) => r.recurring_transaction_id !== null || r.installment_plan_id !== null)
    .reduce((sum, r) => sum + r.amount, 0);
  const variable = expenses.reduce((sum, r) => sum + r.amount, 0) - fixed;
  return { fixed, variable };
}
