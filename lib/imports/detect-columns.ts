import type { ColumnDetection, ColumnMapping, ParsedGrid } from "@/lib/imports/types";
import { parseFlexibleDate } from "@/lib/imports/dates";
import { parseMoneyInput } from "@/lib/money";

/**
 * Detecção automática de colunas (PRD §24). Tenta achar Data/Descrição/Valor pelo
 * nome do cabeçalho; quando não consegue com confiança — cabeçalho não bate com
 * nenhum termo conhecido, ou a coluna de valor não deixa claro o sinal (nenhum valor
 * negativo e nenhuma coluna débito/crédito separada) — devolve `confident: false` com
 * a melhor sugestão parcial, e a tela pede o mapeamento manual do usuário antes de
 * importar (nunca assume, PRD §24: "O usuário confirma antes da importação").
 */

const DATE_KEYWORDS = ["data", "date", "dt lancamento", "dt lancto", "data lancamento", "data da compra"];
const DESCRIPTION_KEYWORDS = [
  "descricao",
  "historico",
  "estabelecimento",
  "description",
  "memo",
  "lancamento",
  "detalhes",
];
const AMOUNT_KEYWORDS = ["valor", "amount", "valor (r$)", "valor total", "valor pago"];
const DEBIT_KEYWORDS = ["debito", "valor debito", "saida", "debit"];
const CREDIT_KEYWORDS = ["credito", "valor credito", "entrada", "credit"];

function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function findColumn(headers: string[], keywords: string[]): string | null {
  const normalized = headers.map((h) => ({ original: h, norm: normalizeHeader(h) }));
  for (const kw of keywords) {
    const exact = normalized.find((h) => h.norm === kw);
    if (exact) return exact.original;
  }
  for (const kw of keywords) {
    const partial = normalized.find((h) => h.norm.includes(kw));
    if (partial) return partial.original;
  }
  return null;
}

export function detectColumns(grid: ParsedGrid): ColumnDetection {
  const dateColumn = findColumn(grid.headers, DATE_KEYWORDS);
  const descriptionColumn = findColumn(grid.headers, DESCRIPTION_KEYWORDS);
  const amountColumn = findColumn(grid.headers, AMOUNT_KEYWORDS);
  const debitColumn = findColumn(grid.headers, DEBIT_KEYWORDS);
  const creditColumn = findColumn(grid.headers, CREDIT_KEYWORDS);

  if (!dateColumn || !descriptionColumn) {
    return {
      confident: false,
      suggestion:
        dateColumn || descriptionColumn
          ? { dateColumn: dateColumn ?? undefined, descriptionColumn: descriptionColumn ?? undefined }
          : null,
    };
  }

  // Par débito/crédito separado — sinal já é inequívoco, não precisa de mais nada.
  if (debitColumn && creditColumn) {
    return {
      confident: true,
      mapping: { mode: "debitCredit", dateColumn, descriptionColumn, debitColumn, creditColumn },
    };
  }

  if (amountColumn) {
    const amountIdx = grid.headers.indexOf(amountColumn);
    const dateIdx = grid.headers.indexOf(dateColumn);
    const sample = grid.rows.slice(0, 50);
    const hasNegative = sample.some((r) => (parseMoneyInput(r[amountIdx] ?? "") ?? 0) < 0);
    const datesLookValid = sample
      .slice(0, 5)
      .every((r) => !r[dateIdx] || parseFlexibleDate(r[dateIdx]) !== null);

    if (hasNegative && datesLookValid) {
      return { confident: true, mapping: { mode: "signed", dateColumn, descriptionColumn, amountColumn } };
    }

    // Coluna de valor existe mas o sinal é ambíguo (tudo positivo, sem indicador de
    // tipo) — não dá pra assumir despesa ou receita sem confirmação do usuário.
    return {
      confident: false,
      suggestion: { dateColumn, descriptionColumn, amountColumn } as Partial<ColumnMapping>,
    };
  }

  return { confident: false, suggestion: { dateColumn, descriptionColumn } };
}
