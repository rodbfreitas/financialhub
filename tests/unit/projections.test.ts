import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { projectBalance, projectGoalCompletion } from "@/lib/projections";

describe("projectGoalCompletion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15)); // 15/01/2026
  });
  afterEach(() => vi.useRealTimers());

  it("já alcançada quando o valor atual atinge (ou passa) o alvo", () => {
    expect(projectGoalCompletion({ targetAmount: 1000, currentAmount: 1000, monthlyContribution: 100 })).toEqual({
      kind: "already_reached",
    });
    expect(projectGoalCompletion({ targetAmount: 1000, currentAmount: 1200, monthlyContribution: 100 })).toEqual({
      kind: "already_reached",
    });
  });

  it("sem contribuição mensal cadastrada não projeta uma data (nunca inventa dado)", () => {
    expect(projectGoalCompletion({ targetAmount: 1000, currentAmount: 0, monthlyContribution: null })).toEqual({
      kind: "no_contribution",
    });
    expect(projectGoalCompletion({ targetAmount: 1000, currentAmount: 0, monthlyContribution: 0 })).toEqual({
      kind: "no_contribution",
    });
  });

  it("projeta meses restantes e data a partir de hoje, arredondando pra cima", () => {
    // falta R$ 950, contribuição de R$ 500/mês -> ceil(950/500) = 2 meses
    const result = projectGoalCompletion({ targetAmount: 1000, currentAmount: 50, monthlyContribution: 500 });
    expect(result).toEqual({ kind: "projected", monthsRemaining: 2, projectedDate: "2026-03-15" });
  });

  it("contribuição que exatamente completa a meta em 1 mês", () => {
    const result = projectGoalCompletion({ targetAmount: 1000, currentAmount: 500, monthlyContribution: 500 });
    expect(result).toEqual({ kind: "projected", monthsRemaining: 1, projectedDate: "2026-02-15" });
  });
});

describe("projectBalance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1)); // 01/01/2026
  });
  afterEach(() => vi.useRealTimers());

  it("sem recorrências, retorna o saldo atual inalterado", () => {
    expect(projectBalance(1000, [])).toBe(1000);
  });

  it("soma receita recorrente e subtrai despesa recorrente dentro da janela", () => {
    const total = projectBalance(1000, [
      { type: "income", amount: 200, nextOccurrence: "2026-01-10", frequency: "monthly", interval: 1, endDate: null },
      { type: "expense", amount: 50, nextOccurrence: "2026-01-05", frequency: "monthly", interval: 1, endDate: null },
    ]);
    // dentro de 30 dias a partir de 01/01: só a primeira ocorrência de cada uma cai na janela
    expect(total).toBe(1000 + 200 - 50);
  });

  it("expande recorrência semanal — pode cair mais de uma vez em 30 dias", () => {
    const total = projectBalance(0, [
      { type: "expense", amount: 100, nextOccurrence: "2026-01-01", frequency: "weekly", interval: 1, endDate: null },
    ]);
    // 01, 08, 15, 22, 29/01 -> 5 ocorrências dentro de 30 dias
    expect(total).toBe(-500);
  });

  it("respeita endDate da recorrência (não expande além dela)", () => {
    const total = projectBalance(0, [
      {
        type: "expense",
        amount: 100,
        nextOccurrence: "2026-01-01",
        frequency: "weekly",
        interval: 1,
        endDate: "2026-01-08",
      },
    ]);
    // só 01/01 e 08/01 (endDate inclusive) -> 2 ocorrências
    expect(total).toBe(-200);
  });

  it("não conta ocorrência fora da janela de dias", () => {
    const total = projectBalance(500, [
      { type: "income", amount: 999, nextOccurrence: "2026-03-01", frequency: "monthly", interval: 1, endDate: null },
    ]);
    expect(total).toBe(500);
  });
});
