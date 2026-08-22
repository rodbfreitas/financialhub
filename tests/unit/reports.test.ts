import { describe, expect, it } from "vitest";
import {
  budgetVariance,
  dailyCashFlow,
  groupByCard,
  groupByNature,
  groupByNatureByMonth,
  groupCardTotalByMonth,
  groupFixedVariableByMonth,
  type ReportTxRow,
} from "@/lib/reports";

function tx(partial: Partial<ReportTxRow>): ReportTxRow {
  return {
    type: "expense",
    amount: 100,
    transaction_date: "2026-01-15",
    category_id: null,
    profile_id: "p1",
    nature: "individual",
    credit_card_id: null,
    recurring_transaction_id: null,
    installment_plan_id: null,
    ...partial,
  };
}

const MONTHS = [
  { year: 2026, month: 1, from: "2026-01-01", to: "2026-01-31", label: "Jan/26" },
  { year: 2026, month: 2, from: "2026-02-01", to: "2026-02-28", label: "Fev/26" },
];

describe("groupFixedVariableByMonth", () => {
  it("separa fixo (recorrência/parcelamento) de variável, mês a mês", () => {
    const rows = [
      tx({ amount: 200, recurring_transaction_id: "r1", transaction_date: "2026-01-05" }),
      tx({ amount: 100, transaction_date: "2026-01-20" }),
      tx({ amount: 50, installment_plan_id: "i1", transaction_date: "2026-02-10" }),
    ];
    expect(groupFixedVariableByMonth(rows, MONTHS)).toEqual([
      { label: "Jan/26", year: 2026, month: 1, fixed: 200, variable: 100 },
      { label: "Fev/26", year: 2026, month: 2, fixed: 50, variable: 0 },
    ]);
  });
});

describe("groupByNature", () => {
  it("agrega individual x compartilhado, independente do titular", () => {
    const rows = [
      tx({ nature: "individual", type: "expense", amount: 100 }),
      tx({ nature: "shared", type: "expense", amount: 300 }),
      tx({ nature: "shared", type: "income", amount: 500 }),
    ];
    expect(groupByNature(rows)).toEqual({
      individual: { income: 0, expenses: 100 },
      shared: { income: 500, expenses: 300 },
    });
  });
});

describe("groupByNatureByMonth", () => {
  it("só despesas contam, agrupadas por mês e natureza", () => {
    const rows = [
      tx({ nature: "individual", amount: 100, transaction_date: "2026-01-10" }),
      tx({ nature: "shared", amount: 200, transaction_date: "2026-01-15" }),
      tx({ type: "income", nature: "shared", amount: 9999, transaction_date: "2026-01-15" }),
    ];
    expect(groupByNatureByMonth(rows, MONTHS)).toEqual([
      { label: "Jan/26", year: 2026, month: 1, individual: 100, shared: 200 },
      { label: "Fev/26", year: 2026, month: 2, individual: 0, shared: 0 },
    ]);
  });
});

describe("groupByCard", () => {
  it("agrupa gasto por cartão e calcula percentual, ordenado por valor desc", () => {
    const rows = [
      tx({ credit_card_id: "c1", amount: 300 }),
      tx({ credit_card_id: "c2", amount: 100 }),
      tx({ credit_card_id: null, amount: 999 }), // sem cartão, não conta
    ];
    const names = new Map([
      ["c1", "Nubank"],
      ["c2", "Inter"],
    ]);
    expect(groupByCard(rows, names)).toEqual([
      { creditCardId: "c1", name: "Nubank", amount: 300, percentage: 75 },
      { creditCardId: "c2", name: "Inter", amount: 100, percentage: 25 },
    ]);
  });

  it("cartão removido (sem nome no mapa) usa rótulo honesto", () => {
    const rows = [tx({ credit_card_id: "gone", amount: 50 })];
    expect(groupByCard(rows, new Map())).toEqual([
      { creditCardId: "gone", name: "Cartão removido", amount: 50, percentage: 100 },
    ]);
  });

  it("sem gasto em cartão, retorna vazio", () => {
    expect(groupByCard([tx({ credit_card_id: null })], new Map())).toEqual([]);
  });
});

describe("groupCardTotalByMonth", () => {
  it("soma todos os cartões por mês", () => {
    const rows = [
      tx({ credit_card_id: "c1", amount: 100, transaction_date: "2026-01-05" }),
      tx({ credit_card_id: "c2", amount: 50, transaction_date: "2026-01-06" }),
    ];
    const buckets = groupCardTotalByMonth(rows, MONTHS);
    expect(buckets[0]).toEqual({ label: "Jan/26", year: 2026, month: 1, income: 0, expenses: 150, balance: -150 });
    // `balance` do mês sem gasto é `-total` com total=0 -> -0 em JS (numericamente
    // igual a 0; `Object.is`/`toEqual` diferenciam -0 de 0, então comparamos com `===`
    // em vez de `toEqual` pra esse campo especificamente — não é um bug do app).
    expect(buckets[1]).toMatchObject({ label: "Fev/26", year: 2026, month: 2, income: 0, expenses: 0 });
    expect(buckets[1].balance === 0).toBe(true);
  });
});

describe("dailyCashFlow", () => {
  it("saldo do dia e saldo acumulado dentro do período", () => {
    const rows = [
      { type: "income" as const, amount: 100, transaction_date: "2026-01-01" },
      { type: "expense" as const, amount: 30, transaction_date: "2026-01-02" },
      { type: "expense" as const, amount: 999, transaction_date: "2026-02-01" }, // fora do período
    ];
    const points = dailyCashFlow(rows, "2026-01-01", "2026-01-03");
    expect(points).toHaveLength(3);
    expect(points[0]).toMatchObject({ date: "2026-01-01", net: 100, cumulative: 100 });
    expect(points[1]).toMatchObject({ date: "2026-01-02", net: -30, cumulative: 70 });
    expect(points[2]).toMatchObject({ date: "2026-01-03", net: 0, cumulative: 70 });
  });
});

describe("budgetVariance", () => {
  it("calcula variância em valor e percentual, ordenada da mais estourada pra menos", () => {
    const rows = [
      { categoryId: "a", categoryName: "A", planned: 100, realized: 150 },
      { categoryId: "b", categoryName: "B", planned: 200, realized: 100 },
    ];
    expect(budgetVariance(rows)).toEqual([
      { categoryId: "a", categoryName: "A", planned: 100, realized: 150, variance: 50, variancePercent: 50 },
      { categoryId: "b", categoryName: "B", planned: 200, realized: 100, variance: -100, variancePercent: -50 },
    ]);
  });

  it("planejado zero não gera divisão por zero (variancePercent = 0)", () => {
    const rows = [{ categoryId: "a", categoryName: "A", planned: 0, realized: 50 }];
    expect(budgetVariance(rows)[0].variancePercent).toBe(0);
  });
});
