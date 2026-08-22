import { describe, expect, it } from "vitest";
import { formatMoney, formatSignedMoney, parseMoneyInput } from "@/lib/money";

// Intl.NumberFormat("pt-BR", { style: "currency", ... }) usa um espaço NÃO separável
// (U+00A0) entre "R$" e o valor, não um espaço comum — por isso as asserções abaixo
// normalizam pra espaço comum antes de comparar, senão os testes quebrariam de forma
// enganosa (não porque `formatMoney` está errado, mas por um detalhe de encoding do
// próprio Intl que não tem nada a ver com a lógica que estamos testando).
function withoutNbsp(s: string): string {
  return s.replace(/ /g, " ");
}

describe("formatMoney", () => {
  it("formata em padrão brasileiro (R$ 1.234,56)", () => {
    expect(withoutNbsp(formatMoney(1234.56))).toBe("R$ 1.234,56");
  });

  it("formata zero e negativos", () => {
    expect(withoutNbsp(formatMoney(0))).toBe("R$ 0,00");
    expect(withoutNbsp(formatMoney(-50))).toBe("-R$ 50,00");
  });
});

describe("formatSignedMoney", () => {
  it("prefixa positivo com + e negativo com − (Design System §27, nunca só a cor)", () => {
    expect(withoutNbsp(formatSignedMoney(100))).toBe("+ R$ 100,00");
    expect(withoutNbsp(formatSignedMoney(-100))).toBe("− R$ 100,00");
  });

  it("não prefixa zero", () => {
    expect(withoutNbsp(formatSignedMoney(0))).toBe("R$ 0,00");
  });
});

describe("parseMoneyInput", () => {
  it("aceita ponto decimal (1234.56)", () => {
    expect(parseMoneyInput("1234.56")).toBe(1234.56);
  });

  it("aceita vírgula decimal (1234,56)", () => {
    expect(parseMoneyInput("1234,56")).toBe(1234.56);
  });

  it("aceita milhar com ponto + vírgula decimal (1.234,56)", () => {
    expect(parseMoneyInput("1.234,56")).toBe(1234.56);
  });

  it("ignora símbolos e espaços (R$ 1.234,56)", () => {
    expect(parseMoneyInput("R$ 1.234,56")).toBe(1234.56);
  });

  it("aceita negativo", () => {
    expect(parseMoneyInput("-50,00")).toBe(-50);
  });

  it("retorna null para vazio ou inválido", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("   ")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
  });

  // Bug real encontrado ao escrever este teste (ver correção em lib/money.ts): entrada
  // sem nenhum dígito ("R$", "N/A", "texto") virava 0 silenciosamente em vez de null,
  // porque `Number("")` é 0 em JS. Cobrindo os casos que expuseram o bug.
  it("retorna null para entrada com símbolos mas sem nenhum dígito", () => {
    expect(parseMoneyInput("R$")).toBeNull();
    expect(parseMoneyInput("N/A")).toBeNull();
    expect(parseMoneyInput("texto")).toBeNull();
    expect(parseMoneyInput("R$ abc")).toBeNull();
  });

  it("ainda aceita zero explícito", () => {
    expect(parseMoneyInput("0")).toBe(0);
    expect(parseMoneyInput("0,00")).toBe(0);
  });
});
