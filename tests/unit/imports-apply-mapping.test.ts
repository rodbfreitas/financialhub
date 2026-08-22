import { describe, expect, it } from "vitest";
import { applyMapping } from "@/lib/imports/apply-mapping";
import type { ParsedGrid } from "@/lib/imports/types";

const GRID: ParsedGrid = {
  headers: ["Data", "Descrição", "Valor", "Débito", "Crédito"],
  rows: [
    ["15/01/2026", "Mercado", "-89,90", "89,90", ""],
    ["16/01/2026", "Salário", "1500,00", "", "1500,00"],
    ["", "", "", "", ""], // linha inválida
  ],
};

describe("applyMapping — modo signed", () => {
  it("usa o valor com sinal diretamente", () => {
    const rows = applyMapping(GRID, {
      mode: "signed",
      dateColumn: "Data",
      descriptionColumn: "Descrição",
      amountColumn: "Valor",
    });
    expect(rows[0]).toMatchObject({ parsedDate: "2026-01-15", parsedDescription: "Mercado", parsedAmount: -89.9 });
    expect(rows[1]).toMatchObject({ parsedAmount: 1500 });
  });
});

describe("applyMapping — modo allExpense / allIncome", () => {
  it("allExpense força negativo mesmo se a coluna já tiver sinal", () => {
    const rows = applyMapping(GRID, {
      mode: "allExpense",
      dateColumn: "Data",
      descriptionColumn: "Descrição",
      amountColumn: "Valor",
    });
    expect(rows[0].parsedAmount).toBe(-89.9);
    expect(rows[1].parsedAmount).toBe(-1500); // era positivo, vira despesa
  });

  it("allIncome força positivo", () => {
    const rows = applyMapping(GRID, {
      mode: "allIncome",
      dateColumn: "Data",
      descriptionColumn: "Descrição",
      amountColumn: "Valor",
    });
    expect(rows[0].parsedAmount).toBe(89.9); // era negativo, vira receita
  });
});

describe("applyMapping — modo debitCredit", () => {
  it("débito vira negativo, crédito vira positivo", () => {
    const rows = applyMapping(GRID, {
      mode: "debitCredit",
      dateColumn: "Data",
      descriptionColumn: "Descrição",
      debitColumn: "Débito",
      creditColumn: "Crédito",
    });
    expect(rows[0].parsedAmount).toBe(-89.9);
    expect(rows[1].parsedAmount).toBe(1500);
  });

  it("débito e crédito ambos vazios (ou zero) -> valor inválido", () => {
    const rows = applyMapping(GRID, {
      mode: "debitCredit",
      dateColumn: "Data",
      descriptionColumn: "Descrição",
      debitColumn: "Débito",
      creditColumn: "Crédito",
    });
    expect(rows[2].parsedAmount).toBeNull();
    expect(rows[2].error).toBeDefined();
  });
});

describe("applyMapping — validação de linha", () => {
  it("linha sem data/descrição/valor acumula todos os erros", () => {
    const rows = applyMapping(GRID, {
      mode: "signed",
      dateColumn: "Data",
      descriptionColumn: "Descrição",
      amountColumn: "Valor",
    });
    expect(rows[2].error).toBe("data inválida, descrição vazia, valor inválido");
  });
});
