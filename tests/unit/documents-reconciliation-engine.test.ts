import { describe, expect, it } from "vitest";
import {
  amountCloseness,
  classifyRelationType,
  computeMatchScore,
  dateDeltaDays,
  descriptionSimilarity,
} from "@/lib/documents/reconciliation/engine";

describe("amountCloseness", () => {
  it("retorna 1 pra valores praticamente iguais (compara por módulo)", () => {
    expect(amountCloseness(150, 150)).toBe(1);
    expect(amountCloseness(150, -150)).toBe(1);
    expect(amountCloseness(150.001, 150)).toBe(1);
  });

  it("decai conforme a diferença relativa cresce", () => {
    const closeness = amountCloseness(100, 102);
    expect(closeness).toBeGreaterThan(0);
    expect(closeness).toBeLessThan(1);
  });

  it("retorna 0 quando a diferença relativa é grande demais (>=5%)", () => {
    expect(amountCloseness(100, 200)).toBe(0);
  });
});

describe("descriptionSimilarity", () => {
  it("retorna alta similaridade pra descrições quase idênticas", () => {
    expect(descriptionSimilarity("PADARIA SILVA LTDA", "Padaria Silva")).toBeGreaterThan(0.3);
  });

  it("retorna 0 quando uma das descrições é nula", () => {
    expect(descriptionSimilarity(null, "algo")).toBe(0);
    expect(descriptionSimilarity("algo", null)).toBe(0);
  });

  it("retorna 0 pra descrições sem nenhum token em comum", () => {
    expect(descriptionSimilarity("PADARIA SILVA", "POSTO IPIRANGA")).toBe(0);
  });
});

describe("dateDeltaDays", () => {
  it("calcula a diferença absoluta em dias", () => {
    expect(dateDeltaDays("2026-03-15", "2026-03-17")).toBe(2);
    expect(dateDeltaDays("2026-03-17", "2026-03-15")).toBe(2);
  });

  it("retorna null quando uma das datas está ausente", () => {
    expect(dateDeltaDays(null, "2026-03-15")).toBeNull();
    expect(dateDeltaDays("2026-03-15", null)).toBeNull();
  });
});

describe("computeMatchScore", () => {
  it("dá score alto quando valor, data, descrição e direção batem", () => {
    const score = computeMatchScore({
      amountCloseness: 1,
      dateDeltaDays: 0,
      descriptionSimilarity: 1,
      sameDirection: true,
    });
    expect(score).toBeCloseTo(1);
  });

  it("dá score baixo quando só o valor bate, sem mais nenhum sinal", () => {
    const score = computeMatchScore({
      amountCloseness: 1,
      dateDeltaDays: null,
      descriptionSimilarity: 0,
      sameDirection: null,
    });
    expect(score).toBeCloseTo(0.45);
  });

  it("nunca ultrapassa 1 nem fica negativo", () => {
    expect(
      computeMatchScore({ amountCloseness: 1, dateDeltaDays: 0, descriptionSimilarity: 1, sameDirection: true }),
    ).toBeLessThanOrEqual(1);
    expect(
      computeMatchScore({ amountCloseness: 0, dateDeltaDays: 30, descriptionSimilarity: 0, sameDirection: false }),
    ).toBeGreaterThanOrEqual(0);
  });
});

describe("classifyRelationType", () => {
  it("classifica candidato de fatura/boleto sempre como BILL_PAYMENT", () => {
    expect(
      classifyRelationType({
        candidateKind: "bill_entity",
        eventType: "card_payment",
        amountsMatch: true,
        dateDeltaDays: 3,
        descriptionSimilarity: 0,
        sameDirection: null,
      }),
    ).toBe("BILL_PAYMENT");

    expect(
      classifyRelationType({
        candidateKind: "boleto_entity",
        eventType: "boleto_payment",
        amountsMatch: true,
        dateDeltaDays: 1,
        descriptionSimilarity: 0.1,
        sameDirection: null,
      }),
    ).toBe("BILL_PAYMENT");
  });

  it("classifica evento de estorno como REFUND", () => {
    expect(
      classifyRelationType({
        candidateKind: "transaction",
        eventType: "refund",
        amountsMatch: true,
        dateDeltaDays: 2,
        descriptionSimilarity: 0.5,
        sameDirection: true,
      }),
    ).toBe("REFUND");
  });

  it("classifica como DUPLICATE quando valor, data (<=1 dia) e descrição batem bem", () => {
    expect(
      classifyRelationType({
        candidateKind: "transaction",
        eventType: "purchase",
        amountsMatch: true,
        dateDeltaDays: 0,
        descriptionSimilarity: 0.8,
        sameDirection: true,
      }),
    ).toBe("DUPLICATE");
  });

  it("classifica PIX com valor igual e direção oposta como TRANSFER_PAIR", () => {
    expect(
      classifyRelationType({
        candidateKind: "transaction",
        eventType: "pix_sent",
        amountsMatch: true,
        dateDeltaDays: 0,
        descriptionSimilarity: 0,
        sameDirection: false,
      }),
    ).toBe("TRANSFER_PAIR");
  });

  it("classifica pagamento com valor batendo como SETTLEMENT", () => {
    expect(
      classifyRelationType({
        candidateKind: "interpreted_event",
        eventType: "card_payment",
        amountsMatch: true,
        dateDeltaDays: 4,
        descriptionSimilarity: 0.1,
        sameDirection: null,
      }),
    ).toBe("SETTLEMENT");
  });

  it("cai pra RELATED quando nada mais específico se aplica", () => {
    expect(
      classifyRelationType({
        candidateKind: "interpreted_event",
        eventType: "purchase",
        amountsMatch: false,
        dateDeltaDays: 5,
        descriptionSimilarity: 0.4,
        sameDirection: null,
      }),
    ).toBe("RELATED");
  });
});
