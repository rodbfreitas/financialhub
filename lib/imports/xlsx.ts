import ExcelJS from "exceljs";
import type { ParsedGrid } from "@/lib/imports/types";

/** Lê a primeira planilha de um .xls/.xlsx e devolve a mesma grade que o parser de CSV. */
export async function parseSpreadsheet(buffer: ArrayBuffer): Promise<ParsedGrid> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const grid: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(cellToString(cell.value));
    });
    if (cells.some((c) => c.trim() !== "")) grid.push(cells);
  });

  if (grid.length === 0) return { headers: [], rows: [] };
  const [headerRow, ...dataRows] = grid;
  return { headers: headerRow.map((h) => h.trim()), rows: dataRows };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  if (typeof value === "object") {
    // Fórmula ({formula, result}), hyperlink ({text, hyperlink}) ou rich text ({richText: [...]})
    if ("result" in value && value.result !== undefined) return cellToString(value.result as ExcelJS.CellValue);
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    return "";
  }
  return String(value);
}
