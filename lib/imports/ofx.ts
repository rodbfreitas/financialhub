import type { ParsedTransactionRow } from "@/lib/imports/types";
import { parseOfxDate } from "@/lib/imports/dates";

/**
 * OFX é SGML, não XML — muitas tags não são fechadas (`<DTPOSTED>20240115000000`, sem
 * `</DTPOSTED>`), terminando na quebra de linha ou na próxima tag. Por isso não dá pra
 * usar um parser de XML genérico; percorremos linha a linha extraindo pares tag/valor
 * dentro de cada bloco `<STMTTRN>...</STMTTRN>` (Prompt Mestre §25-27: OFX é formato
 * previsto; FITID vira `external_id`, prioridade #1 de deduplicação).
 */
export function parseOfx(text: string): ParsedTransactionRow[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? [];

  return blocks.map((block) => {
    const fields = extractFields(block);
    const dateRaw = fields.DTPOSTED ?? fields.DTUSER ?? "";
    const parsedDate = parseOfxDate(dateRaw);
    const amountRaw = fields.TRNAMT ?? "";
    const parsedAmount = amountRaw ? Number(amountRaw.replace(",", ".")) : null;
    const parsedDescription = (fields.NAME || fields.MEMO || fields.PAYEE || "").trim() || null;

    const errors: string[] = [];
    if (!parsedDate) errors.push("data inválida");
    if (!parsedDescription) errors.push("descrição vazia");
    if (parsedAmount === null || Number.isNaN(parsedAmount) || parsedAmount === 0) errors.push("valor inválido");

    return {
      rawData: fields,
      parsedDate,
      parsedDescription,
      parsedAmount: parsedAmount !== null && !Number.isNaN(parsedAmount) ? parsedAmount : null,
      externalId: fields.FITID || null,
      error: errors.length > 0 ? errors.join(", ") : undefined,
    };
  });
}

function extractFields(block: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const lines = block.split("\n");
  for (const line of lines) {
    const m = line.match(/^\s*<([A-Za-z0-9.]+)>(.*)$/);
    if (m) fields[m[1].toUpperCase()] = m[2].trim();
  }
  return fields;
}
