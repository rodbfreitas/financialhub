import { describe, expect, it } from "vitest";
import { HeuristicInterpretationProvider } from "@/lib/documents/providers/heuristic-interpretation-provider";
import type { ExtractedPage } from "@/lib/documents/providers/extraction-provider";
import {
  amountCloseness,
  dateDeltaDays,
  descriptionSimilarity,
  computeMatchScore,
  classifyRelationType,
} from "@/lib/documents/reconciliation/engine";
import { signedAmountForMaterialization } from "@/lib/documents/materialization/import-materializer";

/**
 * Fase 2 — Macrofase 11 (Hardening, Prompt Mestre §17-18): prova que os módulos de
 * Document Intelligence, cada um testado isoladamente em tests/unit/documents-*,
 * também funcionam ENCADEADOS na ordem real do domínio — extração → interpretação →
 * reconciliação → sinal de materialização — sem transformação manual no teste, e
 * cobre dois cenários do "Suíte de testes" obrigatório do Prompt Mestre §18:
 * "mesmo evento em documentos diferentes" e "dois valores iguais legítimos".
 */
function pageOf(rawText: string): ExtractedPage {
  const lines = rawText.split("\n").map((text, i) => ({ pageNumber: 1, text, y: i }));
  return { pageNumber: 1, width: null, height: null, rawText, lines };
}

describe("pipeline de Document Intelligence: extração até sinal de materialização", () => {
  const provider = new HeuristicInterpretationProvider();

  it("um PIX no comprovante e a mesma linha no extrato do banco convergem pra DUPLICATE, nunca duplicam o lançamento", () => {
    // Documento 1: comprovante de PIX (Macrofase 6 — formulário rótulo/valor).
    const comprovanteText = [
      "Comprovante de Pagamento PIX",
      "Para: Padaria Sao Jose",
      "Valor: R$ 45,90",
      "Data: 15/03/2026 14:32",
    ].join("\n");
    const [comprovanteCandidate] = provider.classify({
      documentType: "comprovante_pix",
      pages: [pageOf(comprovanteText)],
    });
    expect(comprovanteCandidate).toBeDefined();
    const comprovanteEvent = provider.interpret({ documentType: "comprovante_pix", candidate: comprovanteCandidate });
    expect(comprovanteEvent).toMatchObject({ eventType: "pix_sent", amount: 45.9, effectiveDate: "2026-03-15" });

    // Documento 2: extrato bancário (Macrofase 5 — linha tabular data+descrição+valor).
    const extratoText = "15/03/2026 PIX ENVIADO PADARIA SAO JOSE -45,90";
    const [extratoCandidate] = provider.classify({ documentType: "extrato_bancario", pages: [pageOf(extratoText)] });
    expect(extratoCandidate).toBeDefined();
    const extratoEvent = provider.interpret({ documentType: "extrato_bancario", candidate: extratoCandidate });
    expect(extratoEvent).toMatchObject({ eventType: "pix_sent", amount: 45.9, effectiveDate: "2026-03-15" });

    // Os dois eventos interpretados, vindos de documentos diferentes, alimentam a
    // Reconciliation Engine (Macrofase 7) exatamente como `runReconciliationForEvent`
    // faria pra cada candidato encontrado nas 3 piscinas de busca.
    const signals = {
      amountCloseness: amountCloseness(comprovanteEvent.amount!, extratoEvent.amount!),
      dateDeltaDays: dateDeltaDays(comprovanteEvent.effectiveDate, extratoEvent.effectiveDate),
      descriptionSimilarity: descriptionSimilarity(comprovanteEvent.merchantNormalized, extratoEvent.merchantNormalized),
      sameDirection: comprovanteCandidate.direction === extratoCandidate.direction,
    };
    const score = computeMatchScore(signals);
    expect(score).toBeGreaterThan(0.4); // acima do MIN_SCORE_TO_PERSIST do engine — vira sugestão de verdade

    const relationType = classifyRelationType({
      candidateKind: "interpreted_event",
      eventType: extratoEvent.eventType,
      amountsMatch: signals.amountCloseness >= 0.999,
      dateDeltaDays: signals.dateDeltaDays,
      descriptionSimilarity: signals.descriptionSimilarity,
      sameDirection: signals.sameDirection,
    });
    expect(relationType).toBe("DUPLICATE");

    // Se a fila de revisão (Macrofase 8) aceitar essa correspondência como DUPLICATE
    // contra uma transação já confirmada, a regra de correção da Macrofase 9 pula a
    // materialização de um segundo `import_row` — nunca duplica o lançamento real.
    // Aqui provamos só que o sinal de valor final, se materializado sozinho, é
    // consistente entre as duas origens (mesmo valor, mesmo sinal).
    const signedFromComprovante = signedAmountForMaterialization(
      comprovanteEvent.eventType,
      comprovanteCandidate.direction,
      comprovanteEvent.amount!,
    );
    const signedFromExtrato = signedAmountForMaterialization(
      extratoEvent.eventType,
      extratoCandidate.direction,
      extratoEvent.amount!,
    );
    expect(signedFromComprovante).toBe(signedFromExtrato);
    expect(signedFromComprovante).toBe(-45.9);
  });

  it("dois valores iguais legítimos (compras distintas, mesmo valor) NÃO são colapsados por um único sinal", () => {
    const linha1 = "10/03/2026 CAFE BOM DIA -18,50";
    const linha2 = "20/03/2026 PADARIA ESTRELA -18,50";

    const [candidate1] = provider.classify({ documentType: "extrato_bancario", pages: [pageOf(linha1)] });
    const [candidate2] = provider.classify({ documentType: "extrato_bancario", pages: [pageOf(linha2)] });
    const event1 = provider.interpret({ documentType: "extrato_bancario", candidate: candidate1 });
    const event2 = provider.interpret({ documentType: "extrato_bancario", candidate: candidate2 });

    expect(event1.amount).toBe(18.5);
    expect(event2.amount).toBe(18.5);

    const signals = {
      amountCloseness: amountCloseness(event1.amount!, event2.amount!),
      dateDeltaDays: dateDeltaDays(event1.effectiveDate, event2.effectiveDate),
      descriptionSimilarity: descriptionSimilarity(event1.merchantNormalized, event2.merchantNormalized),
      sameDirection: candidate1.direction === candidate2.direction,
    };
    // O sinal de valor sozinho (amountCloseness = 1) não é suficiente pra classificar
    // como duplicata — data 10 dias de diferença e descrição sem sobreposição real
    // derrubam o score e a classificação continua "apenas relacionado", nunca
    // colapsado automaticamente (PRD 2.0 §11 / ERD 2.0 §28).
    expect(signals.amountCloseness).toBe(1);
    expect(signals.descriptionSimilarity).toBeLessThan(0.5);

    const relationType = classifyRelationType({
      candidateKind: "interpreted_event",
      eventType: event2.eventType,
      amountsMatch: signals.amountCloseness >= 0.999,
      dateDeltaDays: signals.dateDeltaDays,
      descriptionSimilarity: signals.descriptionSimilarity,
      sameDirection: signals.sameDirection,
    });
    expect(relationType).not.toBe("DUPLICATE");
  });
});
