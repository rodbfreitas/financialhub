import type { ParsedGrid } from "@/lib/imports/types";

/**
 * Parser de CSV feito à mão (RFC 4180: campos entre aspas, vírgula/aspas escapadas
 * duplicando a aspa, quebra de linha dentro de campo entre aspas) — deliberadamente
 * sem depender de uma lib de terceiros pra ler arquivo de origem não confiável (o
 * usuário sobe um extrato bancário; não é o lugar pra puxar uma dependência com
 * histórico de CVE, como aconteceu com `xlsx`/SheetJS — ver decisão registrada no
 * status do projeto).
 */
export function parseCsv(text: string): ParsedGrid {
  const delimiter = detectDelimiter(text);
  const rows = parseCsvRows(text, delimiter);
  const nonEmpty = rows.filter((r) => r.some((cell) => cell.trim() !== ""));

  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const [headerRow, ...dataRows] = nonEmpty;
  return { headers: headerRow.map((h) => h.trim()), rows: dataRows };
}

function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, 2000).split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const c of candidates) {
    const count = firstLine.split(c).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = c;
    }
  }
  return best;
}

function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  // Normaliza BOM e CRLF antes de percorrer caractere a caractere.
  const input = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
