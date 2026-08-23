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

/**
 * PRD 2.0 §9.4: "Boletos representam inicialmente uma obrigação/documento
 * financeiro. A existência do boleto não significa que a despesa foi paga." Por
 * isso um boleto NUNCA gera um candidato a lançamento (`extracted_financial_events`)
 * — só este resumo, como obrigação em aberto. Só quando um comprovante de
 * pagamento correspondente aparecer (ou for reconciliado, Macrofase 7) é que a
 * liquidação vira um evento de verdade.
 */
export type BoletoHeaderFacts = {
  kind: "boleto";
  beneficiary: string | null;
  dueDate: string | null;
  amount: number | null;
  digitableLine: string | null;
};

export type DocumentHeaderFacts = FaturaHeaderFacts | ExtratoHeaderFacts | BoletoHeaderFacts;

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

  if (documentType === "boleto") {
    return {
      kind: "boleto",
      beneficiary: findValueAfterKeyword(fullText, /\bbenefici[aá]rio\b|\bcedente\b|\bfavorecido\b/),
      dueDate: findDateNearKeyword(fullText, /\bvencimento\b/),
      amount: findAmountNearKeyword(fullText, /\bvalor\s+do\s+documento\b|\bvalor\s+cobrado\b|\bvalor\b/),
      digitableLine: findDigitableLine(fullText),
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

/** Acha o valor depois de um rótulo tipo "Beneficiário: João Silva" ou
 * "Beneficiário\nJoão Silva" (rótulo numa linha, valor na próxima — comum em
 * boletos/comprovantes gerados como formulário). */
export function findValueAfterKeyword(fullText: string, keywordRe: RegExp): string | null {
  const lines = fullText.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!keywordRe.test(normalize(lines[i]))) continue;

    const colonIdx = lines[i].indexOf(":");
    if (colonIdx !== -1) {
      const sameLine = lines[i].slice(colonIdx + 1).trim();
      if (sameLine && sameLine.length < 120) return sameLine;
    }

    // Sem ":" na própria linha — comum quando o rótulo e o valor vêm em linhas
    // separadas (formulário). Só usa a próxima linha se ela não for, ela mesma,
    // outro rótulo reconhecido.
    const nextLine = lines[i + 1]?.trim();
    if (nextLine && nextLine.length < 120 && !keywordRe.test(normalize(nextLine))) return nextLine;
  }
  return null;
}

// Linha digitável de boleto: 47-48 dígitos, normalmente separados em blocos por
// ponto/espaço (ex.: "34191.79001 01043.510047 91020.150008 1 84410026000000150000").
function findDigitableLine(fullText: string): string | null {
  // Espaço/ponto literais, nunca `\s` — evita o regex atravessar a quebra de linha e
  // engolir dígitos de uma linha anterior (a linha digitável nunca quebra de linha).
  const candidates = fullText.match(/(?:\d[\d. ]{45,80}\d)/g) ?? [];
  for (const candidate of candidates) {
    const digitsOnly = candidate.replace(/\D/g, "");
    if (digitsOnly.length === 47 || digitsOnly.length === 48) return digitsOnly;
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
