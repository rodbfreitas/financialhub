/**
 * Formatos numéricos/data brasileiros usados em faturas, extratos, boletos e
 * comprovantes — compartilhado entre o interpretador heurístico de lançamentos
 * (`heuristic-interpretation-provider.ts`) e o extrator de resumo do documento
 * (`document-header.ts`, Macrofase 5), pra nunca ter duas implementações de
 * "o que é uma data" ou "o que é um valor em real" divergindo entre si.
 */

export const DATE_RE = /\b(\d{2})\/(\d{2})\/(\d{4}|\d{2})\b/;

// Valor em formato brasileiro (1.234,56 / R$ 45,90), com sinal ou sufixo D/C opcionais
// (extratos bancários costumam marcar débito/crédito assim: "150,00 D").
export const MONEY_RE = /(-)?\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2})\s?(-)?\s?\b([DC])?\b/gi;

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function parseAmountMatch(match: RegExpMatchArray): number | null {
  const [, leadingMinus, digits, trailingMinus] = match;
  if (!digits) return null;
  const normalized = Number(digits.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(normalized)) return null;
  const negative = Boolean(leadingMinus) || Boolean(trailingMinus);
  return negative ? -normalized : normalized;
}

export function inferDirectionMatch(match: RegExpMatchArray): "debit" | "credit" | null {
  const [, leadingMinus, , trailingMinus, letter] = match;
  if (letter) return letter.toUpperCase() === "D" ? "debit" : "credit";
  if (leadingMinus || trailingMinus) return "debit";
  return null;
}

export function parseDateMatch(match: RegExpMatchArray): string | null {
  const [, dd, mm, yy] = match;
  const day = Number(dd);
  const month = Number(mm);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  if (year < 2000 || year > 2100) return null;
  return `${year}-${mm}-${dd}`;
}

/** Última ocorrência de valor numa linha — em extratos/faturas tabulares a
 * descrição costuma vir antes e o valor no final da linha. */
export function findLastMoneyMatch(text: string): RegExpMatchArray | null {
  const matches = [...text.matchAll(MONEY_RE)].filter((m) => m[2]);
  return matches.length > 0 ? matches[matches.length - 1] : null;
}
