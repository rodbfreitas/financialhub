import { describe, expect, it } from "vitest";
import { extractDocumentHeader, isSummaryLine } from "@/lib/documents/document-header";

describe("isSummaryLine", () => {
  it("reconhece linhas de total/saldo/limite como resumo, não lançamento", () => {
    expect(isSummaryLine("Total desta fatura R$ 1.234,56")).toBe(true);
    expect(isSummaryLine("Saldo final 3.400,12")).toBe(true);
    expect(isSummaryLine("Saldo anterior 3.000,00")).toBe(true);
    expect(isSummaryLine("Pagamento mínimo R$ 150,00")).toBe(true);
    expect(isSummaryLine("Limite disponível R$ 5.000,00")).toBe(true);
  });

  it("não marca uma compra normal como linha de resumo", () => {
    expect(isSummaryLine("15/03/2026 PADARIA SILVA 45,90")).toBe(false);
  });
});

describe("extractDocumentHeader — fatura_cartao", () => {
  const text = [
    "FATURA NUBANK",
    "Cartão final 1234",
    "Fechamento 10/03/2026",
    "Vencimento 17/03/2026",
    "15/03/2026 PADARIA SILVA 45,90",
    "16/03/2026 UBER TRIP 22,50",
    "Total desta fatura R$ 1.234,56",
    "Pagamento mínimo R$ 150,00",
  ].join("\n");

  it("extrai vencimento, fechamento, total, pagamento mínimo e final do cartão", () => {
    const facts = extractDocumentHeader("fatura_cartao", text);
    expect(facts).toEqual({
      kind: "fatura_cartao",
      cardLast4: "1234",
      dueDate: "2026-03-17",
      closingDate: "2026-03-10",
      totalAmount: 1234.56,
      minimumPayment: 150,
    });
  });

  it("reconhece o padrão de cartão mascarado (**** **** **** 1234)", () => {
    const facts = extractDocumentHeader("fatura_cartao", "**** **** **** 5678\nCompras do mes");
    expect(facts?.kind).toBe("fatura_cartao");
    expect((facts as { cardLast4: string | null }).cardLast4).toBe("5678");
  });

  it("retorna campos null quando o documento não traz aquele dado (honesto, nunca inventa)", () => {
    const facts = extractDocumentHeader("fatura_cartao", "Documento sem nenhum campo reconhecivel");
    expect(facts).toEqual({
      kind: "fatura_cartao",
      cardLast4: null,
      dueDate: null,
      closingDate: null,
      totalAmount: null,
      minimumPayment: null,
    });
  });
});

describe("extractDocumentHeader — extrato_bancario", () => {
  it("extrai saldo inicial e final sem confundir com movimentações", () => {
    const text = [
      "EXTRATO CONTA CORRENTE",
      "Saldo anterior 1.000,00",
      "10/01/2026 PIX RECEBIDO JOAO 500,00",
      "12/01/2026 PIX ENVIADO MARIA 200,00 D",
      "Saldo final 1.300,00",
    ].join("\n");

    const facts = extractDocumentHeader("extrato_bancario", text);
    expect(facts).toEqual({
      kind: "extrato_bancario",
      initialBalance: 1000,
      finalBalance: 1300,
    });
  });
});

describe("extractDocumentHeader — outros tipos de documento", () => {
  it("retorna null para tipos sem resumo estruturado definido (ex.: boleto)", () => {
    expect(extractDocumentHeader("boleto", "qualquer texto")).toBeNull();
  });
});
