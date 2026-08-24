import { describe, expect, it } from "vitest";
import { priorityOf, sortQueueItems, type ReviewQueueItem } from "@/lib/documents/review/queue";

function item(overrides: Partial<ReviewQueueItem>): ReviewQueueItem {
  return {
    interpretedEventId: overrides.interpretedEventId ?? "event-1",
    extractedEventId: "extracted-1",
    eventType: "purchase",
    amount: 100,
    effectiveDate: "2026-03-15",
    merchantNormalized: null,
    rawDescription: "Compra qualquer",
    interpretationConfidence: 0.8,
    installmentCurrent: null,
    installmentTotal: null,
    candidates: [],
    ...overrides,
  };
}

describe("priorityOf", () => {
  it("dá prioridade máxima (0) pra evento com candidato DUPLICATE", () => {
    const level = priorityOf(
      item({ candidates: [{ candidateId: "c1", candidateType: "transaction", relationTypeSuggested: "DUPLICATE", score: 0.9, label: "x", amount: null, date: null, sourceDocumentName: null }] }),
    );
    expect(level).toBe(0);
  });

  it("dá prioridade 1 pra baixa confiança sem candidato duplicado", () => {
    expect(priorityOf(item({ interpretationConfidence: 0.3, candidates: [] }))).toBe(1);
  });

  it("dá prioridade 2 pra evento com candidato pendente (não-duplicado) e confiança razoável", () => {
    const level = priorityOf(
      item({
        interpretationConfidence: 0.8,
        candidates: [{ candidateId: "c1", candidateType: "transaction", relationTypeSuggested: "RELATED", score: 0.5, label: "x", amount: null, date: null, sourceDocumentName: null }],
      }),
    );
    expect(level).toBe(2);
  });

  it("dá prioridade 3 (mais baixa) pra evento novo, sem candidato, confiança razoável", () => {
    expect(priorityOf(item({ interpretationConfidence: 0.8, candidates: [] }))).toBe(3);
  });

  it("trata confiança ausente (null) como razoável, não como baixa confiança automática", () => {
    expect(priorityOf(item({ interpretationConfidence: null, candidates: [] }))).toBe(3);
  });
});

describe("sortQueueItems", () => {
  it("ordena por prioridade sem embaralhar a ordem original dentro do mesmo nível", () => {
    const a = item({ interpretedEventId: "a", interpretationConfidence: 0.8, candidates: [] }); // prioridade 3
    const b = item({ interpretedEventId: "b", interpretationConfidence: 0.2, candidates: [] }); // prioridade 1
    const c = item({ interpretedEventId: "c", interpretationConfidence: 0.8, candidates: [] }); // prioridade 3
    const d = item({
      interpretedEventId: "d",
      candidates: [{ candidateId: "c1", candidateType: "transaction", relationTypeSuggested: "DUPLICATE", score: 0.9, label: "x", amount: null, date: null, sourceDocumentName: null }],
    }); // prioridade 0

    const sorted = sortQueueItems([a, b, c, d]);
    expect(sorted.map((i) => i.interpretedEventId)).toEqual(["d", "b", "a", "c"]);
  });

  it("não modifica o array original", () => {
    const a = item({ interpretedEventId: "a", interpretationConfidence: 0.8 });
    const b = item({ interpretedEventId: "b", interpretationConfidence: 0.2 });
    const original = [a, b];
    sortQueueItems(original);
    expect(original).toEqual([a, b]);
  });
});
