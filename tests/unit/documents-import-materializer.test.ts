import { describe, expect, it } from "vitest";
import { signedAmountForMaterialization } from "@/lib/documents/materialization/import-materializer";

describe("signedAmountForMaterialization", () => {
  it("usa a direção quando disponível, mesmo se o tipo de evento sugerisse o contrário", () => {
    expect(signedAmountForMaterialization("purchase", "credit", 100)).toBe(100);
    expect(signedAmountForMaterialization("income", "debit", 100)).toBe(-100);
  });

  it("sempre normaliza pro módulo antes de aplicar o sinal da direção", () => {
    expect(signedAmountForMaterialization("purchase", "debit", -100)).toBe(-100);
    expect(signedAmountForMaterialization("purchase", "credit", -100)).toBe(100);
  });

  it("sem direção, usa o tipo de evento como default — despesa fica negativa", () => {
    expect(signedAmountForMaterialization("purchase", null, 45.9)).toBeCloseTo(-45.9);
    expect(signedAmountForMaterialization("boleto_payment", null, 189.9)).toBeCloseTo(-189.9);
    expect(signedAmountForMaterialization("fee", null, 12)).toBeCloseTo(-12);
  });

  it("sem direção, usa o tipo de evento como default — receita fica positiva", () => {
    expect(signedAmountForMaterialization("income", null, 500)).toBeCloseTo(500);
    expect(signedAmountForMaterialization("refund", null, 45.9)).toBeCloseTo(45.9);
    expect(signedAmountForMaterialization("pix_received", null, 80)).toBeCloseTo(80);
  });

  it("sem direção e sem tipo reconhecido (transfer/unknown), mantém o sinal já presente — nunca inventa uma direção", () => {
    expect(signedAmountForMaterialization("transfer", null, -300)).toBe(-300);
    expect(signedAmountForMaterialization("unknown", null, 300)).toBe(300);
  });
});
