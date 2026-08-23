import type { Database } from "@/types/database";
import { DATE_RE, normalize, parseAmountMatch, parseDateMatch, findLastMoneyMatch } from "./br-financial-format";

type DocumentType = Database["public"]["Enums"]["document_type"];

/**
 * Fase 2 — Macrofase 5 (PRD 2.0 §9.1/§9.3): resumo estruturado por tipo de
 * documento, extraído de forma heurística sobre o texto já obtido pela Macrofase
 * 3. Sempre contexto, nunca lançamento — "saldo inicial e saldo final como
 * contexto, nunca como transação" (§9.3) se aplica igualmente ao total/pagamento
 * mínimo de uma fatura. Por isso mesmo essas linhas são explicitamente excluídas
 * de `HeuristicInterpretationProvider.classify()` via `isSummaryLine()` abaixo —
 * nunca aparecem duplicadas como "lançamento".
 *
 * Todo campo é "quando disponível" (linguagem do próprio PRD): documentos reais
 * variam muito de layout, então a ausência de um campo não é um erro, só um
 * heurística que não encontrou aquele dado neste documento específico.
 */
export type FaturaHeaderFacts = {
  kind: "fatura_cartao";
  cardLast4: string | null;
  dueDate: string | null;
  closingDate: string | null;
  totalAmount: number | null;
  minimumPayment: number | null;
};

export type ExtratoHeaderFacts = {
  kind: "extrato_bancario";
  initialBalance: number | null;
  finalBalance: number | null;
};

export type DocumentHeaderFacts = FaturaHeaderFacts | ExtratoHeaderFacts;

const SUMMARY_KEYWORDS_RE =
  /\btotal\s+(da\s+|desta\s+)?fatura\b|\bvalor\s+total\b|\btotal\s+a\s+pagar\b|\bsaldo\s+(inicial|anterior|final|atual)\b|\bpagamento\s+minimo\b|\bminimo\s+a\s+pagar\b|\blimite\s+dispon[i1]vel\b|\blimite\s+total\b|\blimite\s+de\s+credito\b/;

/** Usado por `HeuristicInterpretationProvider.classify()` pra nunca tratar uma
 * linha de resumo (total, saldo, limite) como se fosse um lançamento individual. */
export function isSummaryLine(text: string): boolean {
  return SUMMARY_KEYWORDS_RE.test(normalize(text));
}

export function extractDocumentHeader(documentType: DocumentType, fullText: string): DocumentHeaderFacts | null {
  if (documentType === "fatura_cartao") {
    return {
      kind: "fatura_cartao",
      cardLast4: findCardLast4(fullText),
      dueDate: findDateNearKeyword(fullText, /\bvencimento\b/),
      closingDate: findDateNearKeyword(fullText, /\bfechamento\b/),
      totalAmount: findAmountNearKeyword(fullText, /\btotal\s+(da\s+|desta\s+)?fatura\b|\bvalor\s+total\b|\btotal\s+a\s+pagar\b/),
      minimumPayment: findAmountNearKeyword(fullText, /\bpagamento\s+minimo\b|\bminimo\s+a\s+pagar\b|\bvalor\s+minimo\b/),
    };
  }

  if (documentType === "extrato_bancario") {
    return {
      kind: "extrato_bancario",
      initialBalance: findAmountNearKeyword(fullText, /\bsaldo\s+(inicial|anterior)\b/),
      finalBalance: findAmountNearKeyword(fullText, /\bsaldo\s+(final|atual)\b/),
    };
  }

  return null;
}

function findAmountNearKeyword(fullText: string, keywordRe: RegExp): number | null {
  for (const line of fullText.split("\n")) {
    if (!keywordRe.test(normalize(line))) continue;
    const moneyMatch = findLastMoneyMatch(line);
    if (moneyMatch) return parseAmountMatch(moneyMatch);
  }
  return null;
}

function findDateNearKeyword(fullText: string, keywordRe: RegExp): string | null {
  for (const line of fullText.split("\n")) {
    if (!keywordRe.test(normalize(line))) continue;
    const dateMatch = line.match(DATE_RE);
    if (dateMatch) return parseDateMatch(dateMatch);
  }
  return null;
}

// "final 1234", "**** **** **** 1234", "terminado em 1234", "últimos 4 dígitos: 1234".
const CARD_LAST4_RE =
  /(?:final|terminad[oa]\s+em|[uú]ltim[oa]s?\s+4\s+d[ií]gitos)\D{0,12}(\d{4})\b|(?:\*{4}[\s.-]*){3}(\d{4})\b/i;

function findCardLast4(fullText: string): string | null {
  const match = fullText.match(CARD_LAST4_RE);
  if (!match) return null;
  return match[1] ?? match[2] ?? null;
}
