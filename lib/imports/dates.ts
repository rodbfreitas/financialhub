/**
 * Datas de extrato vêm em formatos variados (a maioria dos bancos brasileiros usa
 * dd/mm/aaaa; o parser de XLSX já normaliza para aaaa-mm-dd). Nunca usa `new Date(str)`
 * puro pra isso — o parsing nativo de string é ambíguo entre dd/mm e mm/dd dependendo
 * do runtime/locale, e dado financeiro não pode depender disso.
 */
export function parseFlexibleDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const pad = (n: number) => String(n).padStart(2, "0");

  // aaaa-mm-dd (já normalizado, ex.: vindo do parser de XLSX)
  let m = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return isoIfValid(Number(m[1]), Number(m[2]), Number(m[3]));

  // dd/mm/aaaa ou dd-mm-aaaa
  m = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return isoIfValid(Number(m[3]), Number(m[2]), Number(m[1]));

  // dd/mm/aa ou dd-mm-aa (assume 20xx)
  m = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
  if (m) return isoIfValid(2000 + Number(m[3]), Number(m[2]), Number(m[1]));

  return null;

  function isoIfValid(year: number, month: number, day: number): string | null {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
  }
}

/** Datas OFX: aaaammddhhmmss[.mmm][±hhmm] — só a parte da data importa aqui. */
export function parseOfxDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}
