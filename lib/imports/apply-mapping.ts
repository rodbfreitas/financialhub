import type { ColumnMapping, ParsedGrid, ParsedTransactionRow } from "@/lib/imports/types";
import { parseFlexibleDate } from "@/lib/imports/dates";
import { parseMoneyInput } from "@/lib/money";

/** Aplica um `ColumnMapping` (detectado ou escolhido manualmente) a cada linha da grade. */
export function applyMapping(grid: ParsedGrid, mapping: ColumnMapping): ParsedTransactionRow[] {
  const idx = (col: string) => grid.headers.indexOf(col);
  const dateIdx = idx(mapping.dateColumn);
  const descIdx = idx(mapping.descriptionColumn);

  return grid.rows.map((cells) => {
    const rawData: Record<string, unknown> = {};
    grid.headers.forEach((h, i) => (rawData[h] = cells[i] ?? ""));

    const parsedDate = dateIdx >= 0 ? parseFlexibleDate(cells[dateIdx] ?? "") : null;
    const parsedDescription = descIdx >= 0 ? (cells[descIdx] ?? "").trim() || null : null;
    const parsedAmount = computeAmount(cells, grid.headers, mapping);

    const errors: string[] = [];
    if (!parsedDate) errors.push("data inválida");
    if (!parsedDescription) errors.push("descrição vazia");
    if (parsedAmount === null || parsedAmount === 0) errors.push("valor inválido");

    return {
      rawData,
      parsedDate,
      parsedDescription,
      parsedAmount,
      error: errors.length > 0 ? errors.join(", ") : undefined,
    };
  });
}

function computeAmount(cells: string[], headers: string[], mapping: ColumnMapping): number | null {
  const idx = (col: string) => headers.indexOf(col);

  if (mapping.mode === "debitCredit") {
    const debit = parseMoneyInput(cells[idx(mapping.debitColumn)] ?? "") ?? 0;
    const credit = parseMoneyInput(cells[idx(mapping.creditColumn)] ?? "") ?? 0;
    if (debit === 0 && credit === 0) return null;
    return credit - Math.abs(debit);
  }

  const raw = parseMoneyInput(cells[idx(mapping.amountColumn)] ?? "");
  if (raw === null) return null;

  if (mapping.mode === "signed") return raw;
  if (mapping.mode === "allExpense") return -Math.abs(raw);
  return Math.abs(raw); // allIncome
}
