import { describe, expect, it } from "vitest";
import { detectColumns } from "@/lib/imports/detect-columns";
import type { ParsedGrid } from "@/lib/imports/types";

describe("detectColumns", () => {
  it("detecta data/descrição/valor com sinal (tem valor negativo) — modo signed, confiante", () => {
    const grid: ParsedGrid = {
      headers: ["Data", "Descrição", "Valor"],
      rows: [
        ["15/01/2026", "Mercado", "-89,90"],
        ["16/01/2026", "Salário", "1500,00"],
      ],
    };
    const result = detectColumns(grid);
    expect(result.confident).toBe(true);
    if (result.confident) {
      expect(result.mapping).toEqual({
        mode: "signed",
        dateColumn: "Data",
        descriptionColumn: "Descrição",
        amountColumn: "Valor",
      });
    }
  });

  it("detecta colunas de débito/crédito separadas — sinal inequívoco, sempre confiante", () => {
    const grid: ParsedGrid = {
      headers: ["Data", "Histórico", "Débito", "Crédito"],
      rows: [["15/01/2026", "Mercado", "89,90", ""]],
    };
    const result = detectColumns(grid);
    expect(result.confident).toBe(true);
    if (result.confident) {
      expect(result.mapping).toEqual({
        mode: "debitCredit",
        dateColumn: "Data",
        descriptionColumn: "Histórico",
        debitColumn: "Débito",
        creditColumn: "Crédito",
      });
    }
  });

  it("coluna de valor só com positivos e sem indicador de tipo — não confiante, pede mapeamento manual", () => {
    const grid: ParsedGrid = {
      headers: ["Data", "Descrição", "Valor"],
      rows: [
        ["15/01/2026", "Mercado", "89,90"],
        ["16/01/2026", "Farmácia", "50,00"],
      ],
    };
    const result = detectColumns(grid);
    expect(result.confident).toBe(false);
  });

  it("cabeçalho não reconhecido — não confiante", () => {
    const grid: ParsedGrid = { headers: ["Col1", "Col2", "Col3"], rows: [["a", "b", "c"]] };
    const result = detectColumns(grid);
    expect(result.confident).toBe(false);
    if (!result.confident) expect(result.suggestion).toBeNull();
  });

  it("reconhece cabeçalho com acento/maiúsculas de formas variadas", () => {
    const grid: ParsedGrid = {
      headers: ["DATA LANÇAMENTO", "Estabelecimento", "Valor (R$)"],
      rows: [
        ["15/01/2026", "Mercado", "-89,90"],
      ],
    };
    const result = detectColumns(grid);
    expect(result.confident).toBe(true);
  });
});
