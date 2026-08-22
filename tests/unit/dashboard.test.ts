import { describe, expect, it } from "vitest";
import {
  groupByCategory,
  groupByMonth,
  groupByProfile,
  splitFixedVariable,
  sumTotals,
  type DashboardTxRow,
} from "@/lib/dashboard";

function tx(partial: Partial<DashboardTxRow>): DashboardTxRow {
  return {
    type: "expense",
    amount: 100,
    transaction_date: "2026-01-15",
    category_id: null,
    profile_id: "p1",
    recurring_transaction_id: null,
    installment_plan_id: null,
    ...partial,
  };
}

describe("sumTotals", () => {
  it("soma receitas e despesas e calcula saldo/taxa de poupança", () => {
    const rows = [tx({ type: "income", amount: 1000 }), tx({ type: "expense", amount: 400 })];
    expect(sumTotals(rows)).toEqual({ income: 1000, expenses: 400, balance: 600, savingsRate: 60 });
  });

  it("taxa de poupança é 0 quando não há receita (evita divisão por zero)", () => {
    const rows = [tx({ type: "expense", amount: 400 })];
    expect(sumTotals(rows).savingsRate).toBe(0);
  });
});

describe("groupByMonth", () => {
  it("agrupa transações nos buckets mensais corretos", () => {
    const rows = [
      tx({ type: "income", amount: 500, transaction_date: "2026-01-10" }),
      tx({ type: "expense", amount: 200, transaction_date: "2026-01-20" }),
      tx({ type: "expense", amount: 300, transaction_date: "2026-02-05" }),
    ];
    const months = [
      { year: 2026, month: 1, from: "2026-01-01", to: "2026-01-31", label: "Jan/26" },
      { year: 2026, month: 2, from: "2026-02-01", to: "2026-02-28", label: "Fev/26" },
    ];
    const buckets = groupByMonth(rows, months);
    expect(buckets).toEqual([
      { label: "Jan/26", year: 2026, month: 1, income: 500, expenses: 200, balance: 300 },
      { label: "Fev/26", year: 2026, month: 2, income: 0, expenses: 300, balance: -300 },
    ]);
  });
});

describe("groupByCategory", () => {
  it("agrupa por categoria e calcula percentuais sobre o total de despesas", () => {
    const rows = [
      tx({ category_id: "food", amount: 300 }),
      tx({ category_id: "transport", amount: 100 }),
      tx({ type: "income", category_id: "food", amount: 9999 }), // receita não entra
    ];
    const names = new Map([
      ["food", "Alimentação"],
      ["transport", "Transporte"],
    ]);
    const slices = groupByCategory(rows, names, 6);
    expect(slices).toEqual([
      { categoryId: "food", name: "Alimentação", amount: 300, percentage: 75 },
      { categoryId: "transport", name: "Transporte", amount: 100, percentage: 25 },
    ]);
  });

  it("agrupa o restante em 'Outras' quando excede o limite", () => {
    const rows = [
      tx({ category_id: "a", amount: 500 }),
      tx({ category_id: "b", amount: 300 }),
      tx({ category_id: "c", amount: 100 }),
      tx({ category_id: "d", amount: 100 }),
    ];
    const names = new Map([
      ["a", "A"],
      ["b", "B"],
      ["c", "C"],
      ["d", "D"],
    ]);
    const slices = groupByCategory(rows, names, 3);
    expect(slices).toHaveLength(3);
    expect(slices[2]).toEqual({ categoryId: null, name: "Outras", amount: 200, percentage: 20 });
  });

  it("sem despesas, retorna array vazio (nunca divide por zero)", () => {
    expect(groupByCategory([], new Map())).toEqual([]);
  });

  it("transação sem categoria vira 'Sem categoria'", () => {
    const slices = groupByCategory([tx({ category_id: null, amount: 50 })], new Map());
    expect(slices).toEqual([{ categoryId: null, name: "Sem categoria", amount: 50, percentage: 100 }]);
  });
});

describe("groupByProfile", () => {
  it("só inclui perfis com movimentação real e ordena por despesa desc", () => {
    const rows = [
      tx({ profile_id: "p1", amount: 100 }),
      tx({ profile_id: "p2", amount: 500 }),
    ];
    const profiles = [
      { id: "p1", name: "Rodrigo", type: "individual" as const },
      { id: "p2", name: "Lenise", type: "individual" as const },
      { id: "p3", name: "Sem movimento", type: "individual" as const },
    ];
    const slices = groupByProfile(rows, profiles);
    expect(slices.map((s) => s.name)).toEqual(["Lenise", "Rodrigo"]);
  });
});

describe("splitFixedVariable", () => {
  it("despesa de recorrência ou parcelamento conta como fixa; o resto é variável", () => {
    const rows = [
      tx({ amount: 200, recurring_transaction_id: "r1" }),
      tx({ amount: 150, installment_plan_id: "i1" }),
      tx({ amount: 100 }),
    ];
    expect(splitFixedVariable(rows)).toEqual({ fixed: 350, variable: 100 });
  });
});
