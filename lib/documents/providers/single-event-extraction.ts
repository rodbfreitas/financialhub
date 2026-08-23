import { DATE_RE, findLastMoneyMatch, parseAmountMatch, parseDateMatch, normalize } from "../br-financial-format";
import { findValueAfterKeyword } from "../document-header";
import type { ClassifiedEventCandidate } from "./interpretation-provider";

const VALUE_KEYWORD_RE = /\bvalor\b/;
const DATE_KEYWORD_RE = /\bdata\b|\brealizad[oa]\s+em\b/;
// Exige ":" (ou variação de rótulo de formulário) pra não casar com o uso comum
// dessas palavras no meio de uma frase (ex.: "comprovante DE pagamento",
// "PARA consultar o status" não devem virar nome de pagador/beneficiário).
const PAYEE_KEYWORD_RE = /\bbenefici[aá]rio\b|\bfavorecido\b|\brecebedor\b|\bdestinat[aá]rio\b|\bpara\s*:/;
const PAYER_KEYWORD_RE = /\bpagador\b|\bremetente\b|\bde\s*:/;

/**
 * Fase 2 — Macrofase 6 (PRD 2.0 §9.5): comprovantes normalmente são um formulário
 * de rótulo/valor ("Valor: R$ 150,00" numa linha, "Data: 15/03/2026" em outra) —
 * bem diferente do formato tabular de fatura/extrato, onde data e valor moram na
 * MESMA linha. O scanner linha-a-linha de `HeuristicInterpretationProvider.classify()`
 * não encontra nada nesse formato. Esta função varre o documento inteiro procurando
 * o valor e a data principais perto de palavras-chave — o comprovante inteiro é UM
 * evento, não uma lista de lançamentos.
 */
export function extractSingleEventCandidate(fullText: string): ClassifiedEventCandidate | null {
  const amountMatch = findAmountMatchNearKeyword(fullText, VALUE_KEYWORD_RE);
  const dateMatch = findDateMatchNearKeyword(fullText, DATE_KEYWORD_RE);
  if (!amountMatch && !dateMatch) return null;

  const parsedAmount = amountMatch ? parseAmountMatch(amountMatch) : null;
  const parsedDate = dateMatch ? parseDateMatch(dateMatch) : null;
  if (parsedAmount === null && parsedDate === null) return null;

  const payee = findValueAfterKeyword(fullText, PAYEE_KEYWORD_RE);
  const payer = findValueAfterKeyword(fullText, PAYER_KEYWORD_RE);
  const direction = inferDirection({ hasPayee: payee !== null, hasPayer: payer !== null });

  let extractionConfidence = 0.5;
  if (amountMatch && /r\$/i.test(amountMatch[0])) extractionConfidence += 0.1;
  if (amountMatch && dateMatch) extractionConfidence += 0.15;
  extractionConfidence = Math.min(extractionConfidence, 0.85);

  return {
    sourcePage: 1,
    sourceEventIndex: 0,
    rawDescription: payee ?? payer ?? null,
    rawAmount: amountMatch?.[2] ?? null,
    rawDate: dateMatch?.[0] ?? null,
    direction,
    parsedAmount,
    parsedDate,
    extractionConfidence,
  };
}

// Um comprovante que mostra "Beneficiário/Para: X" tipicamente é uma saída (você
// pagou/enviou); um que só mostra "Pagador/De: X" (sem beneficiário) tipicamente é
// uma entrada (você recebeu). Quando nenhum dos dois aparece, fica indefinido —
// `interpret()` decide o event_type pelo tipo de documento nesse caso.
function inferDirection(signal: { hasPayee: boolean; hasPayer: boolean }): "debit" | "credit" | null {
  if (signal.hasPayee) return "debit";
  if (signal.hasPayer) return "credit";
  return null;
}

function findAmountMatchNearKeyword(fullText: string, keywordRe: RegExp): RegExpMatchArray | null {
  for (const line of fullText.split("\n")) {
    if (!keywordRe.test(normalize(line))) continue;
    const match = findLastMoneyMatch(line);
    if (match) return match;
  }
  return null;
}

function findDateMatchNearKeyword(fullText: string, keywordRe: RegExp): RegExpMatchArray | null {
  for (const line of fullText.split("\n")) {
    if (!keywordRe.test(normalize(line))) continue;
    const match = line.match(DATE_RE);
    if (match) return match;
  }
  return null;
}
