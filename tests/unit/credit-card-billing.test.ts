import { describe, expect, it } from "vitest";
import { addMonthsToDate, resolveBillingCycle } from "@/lib/credit-card-billing";

describe("addMonthsToDate", () => {
  it("soma meses simples", () => {
    expect(addMonthsToDate("2026-01-15", 1)).toBe("2026-02-15");
    expect(addMonthsToDate("2026-01-15", 3)).toBe("2026-04-15");
  });

  it("vira o ano quando ultrapassa dezembro", () => {
    expect(addMonthsToDate("2026-11-15", 2)).toBe("2027-01-15");
  });

  it("ajusta dia inexistente pro último dia do mês (31/01 + 1 mês -> 28 ou 29/02)", () => {
    expect(addMonthsToDate("2026-01-31", 1)).toBe("2026-02-28"); // 2026 não é bissexto
    expect(addMonthsToDate("2024-01-31", 1)).toBe("2024-02-29"); // 2024 é bissexto
  });
});

describe("resolveBillingCycle", () => {
  it("compra até o dia de fechamento (inclusive) entra na fatura do mesmo mês", () => {
    // fecha dia 20, vence dia 27 (dueDay > closingDay -> vencimento no mesmo mês)
    const result = resolveBillingCycle("2026-03-20", 20, 27);
    expect(result.referenceMonth).toBe("2026-03-01");
    expect(result.closingDate).toBe("2026-03-20");
    expect(result.dueDate).toBe("2026-03-27");
  });

  it("compra depois do fechamento entra na fatura do mês seguinte", () => {
    const result = resolveBillingCycle("2026-03-21", 20, 27);
    expect(result.referenceMonth).toBe("2026-04-01");
    expect(result.closingDate).toBe("2026-04-20");
    expect(result.dueDate).toBe("2026-04-27");
  });

  it("vencimento cai no mês seguinte quando dueDay <= closingDay (padrão comum: fecha 28, vence 5)", () => {
    const result = resolveBillingCycle("2026-03-15", 28, 5);
    expect(result.referenceMonth).toBe("2026-03-01");
    expect(result.closingDate).toBe("2026-03-28");
    expect(result.dueDate).toBe("2026-04-05");
  });

  it("compra depois do fechamento vira dezembro -> janeiro do ano seguinte", () => {
    const result = resolveBillingCycle("2026-12-25", 20, 27);
    expect(result.referenceMonth).toBe("2027-01-01");
    expect(result.closingDate).toBe("2027-01-20");
    expect(result.dueDate).toBe("2027-01-27");
  });

  it("ajusta dia de fechamento/vencimento inexistente no mês (ex.: fechamento 31 em fevereiro)", () => {
    const result = resolveBillingCycle("2026-02-05", 31, 10);
    expect(result.closingDate).toBe("2026-02-28"); // fevereiro de 2026 tem 28 dias
  });
});
