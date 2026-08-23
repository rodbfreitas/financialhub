import type { Database } from "@/types/database";
import type { ExtractedPage } from "./extraction-provider";
import type {
  ClassifiedEventCandidate,
  FinancialInterpretationProvider,
  InterpretedEventDraft,
} from "./interpretation-provider";

type DocumentType = Database["public"]["Enums"]["document_type"];
type FinancialEventType = Database["public"]["Enums"]["financial_event_type"];

const DATE_RE = /\b(\d{2})\/(\d{2})\/(\d{4}|\d{2})\b/;
// Valor em formato brasileiro (1.234,56 / R$ 45,90), com sinal ou sufixo D/C opcionais
// (extratos bancários costumam marcar débito/crédito assim: "150,00 D").
const MONEY_RE = /(-)?\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})\s?(-)?\s?\b([DC])?\b/gi;

/**
 * Implementação heurística (regex + palavras-chave, sem IA/LLM) de
 * `FinancialInterpretationProvider`, primeira versão real da Macrofase 3-4. Serve
 * pra popular `extracted_financial_events`/`interpreted_financial_events` de forma
 * honesta: confiança sempre moderada (nunca > 0.85), `reasonCodes` documentam a
 * decisão pra o revisor humano entender o porquê na tela de evidência (DOC-08) —
 * nada disso escreve em `transactions` diretamente, só sugere pra revisão.
 */
export class HeuristicInterpretationProvider implements FinancialInterpretationProvider {
  readonly name = "heuristic-br-regex";

  classify(input: { documentType: DocumentType; pages: ExtractedPage[] }): ClassifiedEventCandidate[] {
    const candidates: ClassifiedEventCandidate[] = [];
    let eventIndex = 0;

    for (const page of input.pages) {
      for (const line of page.lines) {
        const dateMatch = line.text.match(DATE_RE);
        const moneyMatches = [...line.text.matchAll(MONEY_RE)].filter((m) => m[2]);
        if (!dateMatch || moneyMatches.length === 0) continue;

        // A última ocorrência de valor na linha costuma ser o total do lançamento
        // (descrição geralmente vem antes, em extratos/faturas em formato tabular).
        const moneyMatch = moneyMatches[moneyMatches.length - 1];
        const parsedAmount = parseAmount(moneyMatch);
        const parsedDate = parseDate(dateMatch);
        if (parsedAmount === null && parsedDate === null) continue;

        const direction = inferDirection(moneyMatch);
        const rawDescription = line.text
          .replace(dateMatch[0], " ")
          .replace(moneyMatch[0], " ")
          .replace(/\s+/g, " ")
          .trim();

        let extractionConfidence = 0.55;
        if (/r\$/i.test(moneyMatch[0])) extractionConfidence += 0.15;
        if (direction !== null) extractionConfidence += 0.1;
        extractionConfidence = Math.min(extractionConfidence, 0.9);

        candidates.push({
          sourcePage: page.pageNumber,
          sourceEventIndex: eventIndex++,
          rawDescription: rawDescription || null,
          rawAmount: moneyMatch[2] ?? null,
          rawDate: dateMatch[0],
          direction,
          parsedAmount,
          parsedDate,
          extractionConfidence,
          sourceLineY: line.y,
        });
      }
    }

    return candidates;
  }

  interpret(input: { documentType: DocumentType; candidate: ClassifiedEventCandidate }): InterpretedEventDraft {
    const { documentType, candidate } = input;
    const desc = normalize(candidate.rawDescription ?? "");
    const reasonCodes: string[] = [];

    let eventType: FinancialEventType = "unknown";
    let confidence = 0.35;

    const setType = (type: FinancialEventType, code: string, conf = 0.6) => {
      eventType = type;
      confidence = conf;
      reasonCodes.push(code);
    };

    // Ordem importa: do mais específico pro mais genérico. PIX é tratado à parte
    // porque a direção (recebido/enviado) muda o event_type inteiro.
    if (/\bpix\b/.test(desc)) {
      if (/recebid/.test(desc) || candidate.direction === "credit") {
        setType("pix_received", "keyword:pix+recebido_ou_direction_credit");
      } else if (/enviad/.test(desc) || candidate.direction === "debit") {
        setType("pix_sent", "keyword:pix+enviado_ou_direction_debit");
      } else {
        setType("pix_sent", "keyword:pix_sem_direcao_definida", 0.4);
      }
    } else if (/\bestorno\b/.test(desc)) {
      setType("refund", "keyword:estorno");
    } else if (/\bmulta\b/.test(desc)) {
      setType("penalty", "keyword:multa");
    } else if (/\bjuros\b/.test(desc)) {
      setType("interest", "keyword:juros");
    } else if (/\btarifa\b|\banuidade\b/.test(desc)) {
      setType("fee", "keyword:tarifa");
    } else if (/\brendimento\b/.test(desc)) {
      setType("yield", "keyword:rendimento");
    } else if (/\bsaque\b/.test(desc)) {
      setType("withdrawal", "keyword:saque");
    } else if (/\bdeposito\b/.test(desc)) {
      setType("deposit", "keyword:deposito");
    } else if (/debito automatico/.test(desc)) {
      setType("direct_debit", "keyword:debito_automatico");
    } else if (/\bboleto\b/.test(desc)) {
      setType("boleto_payment", "keyword:boleto");
    } else if (/\btransferencia\b|\bted\b|\bdoc\b/.test(desc)) {
      setType("transfer", "keyword:transferencia");
    } else if (/\bpagamento\b/.test(desc)) {
      setType("payment", "keyword:pagamento");
    }

    if (eventType === "unknown") {
      // Sem palavra-chave reconhecida — usa um padrão honesto por tipo de documento,
      // sempre com confiança baixa (é um chute razoável, não uma leitura).
      const fallback: Partial<Record<DocumentType, FinancialEventType>> = {
        fatura_cartao: "purchase",
        boleto: "boleto_payment",
        comprovante_pix: candidate.direction === "credit" ? "pix_received" : "pix_sent",
        comprovante_pagamento: "payment",
        comprovante_transferencia: "transfer",
      };
      eventType = fallback[documentType] ?? "unknown";
      confidence = eventType === "unknown" ? 0.25 : 0.35;
      reasonCodes.push(`fallback:document_type_default:${documentType}`);
    }

    // Parcelamento (ex.: "03/12" dentro da descrição) — mantém o event_type já
    // resolvido, só enriquece com os campos de parcela.
    let installmentCurrent: number | null = null;
    let installmentTotal: number | null = null;
    const installmentMatch = desc.match(/\b(\d{1,2})\s?\/\s?(\d{1,2})\b/);
    if (installmentMatch && !DATE_RE.test(candidate.rawDescription ?? "")) {
      const current = Number(installmentMatch[1]);
      const total = Number(installmentMatch[2]);
      if (current > 0 && total > 0 && current <= total && total <= 60) {
        installmentCurrent = current;
        installmentTotal = total;
        reasonCodes.push("installment_pattern_detected");
      }
    }

    if (candidate.extractionConfidence > 0.7) {
      confidence = Math.min(confidence + 0.1, 0.85);
      reasonCodes.push("high_extraction_confidence");
    }

    const amount = candidate.parsedAmount !== null ? Math.abs(candidate.parsedAmount) : null;

    return {
      eventType,
      amount,
      effectiveDate: candidate.parsedDate,
      merchantNormalized: candidate.rawDescription,
      installmentCurrent,
      installmentTotal,
      interpretationConfidence: confidence,
      reasonCodes,
    };
  }
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseAmount(match: RegExpMatchArray): number | null {
  const [, leadingMinus, digits, trailingMinus] = match;
  if (!digits) return null;
  const normalized = Number(digits.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(normalized)) return null;
  const negative = Boolean(leadingMinus) || Boolean(trailingMinus);
  return negative ? -normalized : normalized;
}

function inferDirection(match: RegExpMatchArray): "debit" | "credit" | null {
  const [, leadingMinus, , trailingMinus, letter] = match;
  if (letter) return letter.toUpperCase() === "D" ? "debit" : "credit";
  if (leadingMinus || trailingMinus) return "debit";
  return null;
}

function parseDate(match: RegExpMatchArray): string | null {
  const [, dd, mm, yy] = match;
  const day = Number(dd);
  const month = Number(mm);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  if (year < 2000 || year > 2100) return null;
  return `${year}-${mm}-${dd}`;
}
