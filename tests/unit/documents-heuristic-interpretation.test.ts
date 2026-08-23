import { describe, expect, it } from "vitest";
import { HeuristicInterpretationProvider } from "@/lib/documents/providers/heuristic-interpretation-provider";
import type { ExtractedPage } from "@/lib/documents/providers/extraction-provider";

function pageWithLines(lines: string[]): ExtractedPage {
  return {
    pageNumber: 1,
    width: 600,
    height: 800,
    rawText: lines.join("\n"),
    lines: lines.map((text) => ({ pageNumber: 1, text })),
  };
}

const provider = new HeuristicInterpretationProvider();

describe("HeuristicInterpretationProvider.classify", () => {
  it("encontra candidatos em linhas com data e valor", () => {
    const pages = [
      pageWithLines([
        "15/03/2026 PADARIA SILVA 45,90",
        "Isso aqui não tem data nem valor",
        "16/03/2026 UBER TRIP 22,50",
      ]),
    ];
    const candidates = provider.classify({ documentType: "fatura_cartao", pages });
    expect(candidates).toHaveLength(2);
    expect(candidates[0].rawDate).toBe("15/03/2026");
    expect(candidates[0].parsedAmount).toBeCloseTo(45.9);
    expect(candidates[0].parsedDate).toBe("2026-03-15");
    expect(candidates[0].rawDescription).toContain("PADARIA SILVA");
  });

  it("ignora linhas sem os dois sinais (só data ou só valor)", () => {
    const pages = [pageWithLines(["15/03/2026 sem valor nenhum aqui", "45,90 sem data nenhuma aqui"])];
    expect(provider.classify({ documentType: "fatura_cartao", pages })).toHaveLength(0);
  });

  it("reconhece valores negativos (pagamento/estorno em extrato)", () => {
    const pages = [pageWithLines(["10/01/2026 PAGAMENTO FATURA -1.250,00"])];
    const candidates = provider.classify({ documentType: "extrato_bancario", pages });
    expect(candidates[0].parsedAmount).toBeCloseTo(-1250);
    expect(candidates[0].direction).toBe("debit");
  });

  it("reconhece o sufixo D/C comum em extratos bancários", () => {
    const pages = [pageWithLines(["10/01/2026 TARIFA MANUTENCAO CONTA 12,00 D"])];
    const candidates = provider.classify({ documentType: "extrato_bancario", pages });
    expect(candidates[0].direction).toBe("debit");
  });

  it("nunca trata total/saldo/pagamento mínimo como lançamento individual (Macrofase 5)", () => {
    const pages = [
      pageWithLines([
        "15/03/2026 PADARIA SILVA 45,90",
        "Total desta fatura R$ 1.234,56",
        "Pagamento mínimo R$ 150,00",
        "Saldo final 3.400,12",
      ]),
    ];
    const candidates = provider.classify({ documentType: "fatura_cartao", pages });
    expect(candidates).toHaveLength(1);
    expect(candidates[0].rawDescription).toContain("PADARIA SILVA");
  });
});

describe("HeuristicInterpretationProvider.interpret", () => {
  const baseCandidate = {
    sourcePage: 1,
    sourceEventIndex: 0,
    rawAmount: "45,90",
    rawDate: "15/03/2026",
    parsedAmount: 45.9,
    parsedDate: "2026-03-15",
    extractionConfidence: 0.8,
  };

  it("classifica PIX recebido pela palavra-chave e direção", () => {
    const draft = provider.interpret({
      documentType: "extrato_bancario",
      candidate: { ...baseCandidate, rawDescription: "PIX RECEBIDO JOAO SILVA", direction: "credit" },
    });
    expect(draft.eventType).toBe("pix_received");
    expect(draft.amount).toBeCloseTo(45.9);
  });

  it("classifica PIX enviado", () => {
    const draft = provider.interpret({
      documentType: "extrato_bancario",
      candidate: { ...baseCandidate, rawDescription: "PIX ENVIADO MARIA SOUZA", direction: "debit" },
    });
    expect(draft.eventType).toBe("pix_sent");
  });

  it("usa fallback por tipo de documento quando não reconhece palavra-chave", () => {
    const draft = provider.interpret({
      documentType: "fatura_cartao",
      candidate: { ...baseCandidate, rawDescription: "PADARIA SILVA", direction: null },
    });
    expect(draft.eventType).toBe("purchase");
    expect(draft.interpretationConfidence).toBeLessThan(0.6);
    expect(draft.reasonCodes).toContain("fallback:document_type_default:fatura_cartao");
  });

  it("detecta parcelamento no formato NN/NN sem confundir com data", () => {
    const draft = provider.interpret({
      documentType: "fatura_cartao",
      candidate: { ...baseCandidate, rawDescription: "LOJA XPTO PARC 03/12", direction: null },
    });
    expect(draft.installmentCurrent).toBe(3);
    expect(draft.installmentTotal).toBe(12);
  });

  it("nunca ultrapassa a confiança máxima de 0.85", () => {
    const draft = provider.interpret({
      documentType: "extrato_bancario",
      candidate: { ...baseCandidate, rawDescription: "ESTORNO COMPRA", direction: "credit", extractionConfidence: 0.9 },
    });
    expect(draft.interpretationConfidence).toBeLessThanOrEqual(0.85);
  });
});
