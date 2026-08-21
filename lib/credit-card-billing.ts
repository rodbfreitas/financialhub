/**
 * Resolve o ciclo de fatura (mês de referência, fechamento e vencimento) de uma
 * compra no cartão, a partir do dia de fechamento e vencimento cadastrados no cartão.
 *
 * Convenção adotada (não especificada em detalhe pelo PRD/ERD, decisão documentada):
 * - Se a compra ocorre até o dia de fechamento (inclusive), ela entra na fatura que
 *   fecha no mesmo mês da compra.
 * - Se ocorre depois do fechamento, entra na fatura do mês seguinte.
 * - O vencimento cai no mesmo mês do fechamento quando `dueDay > closingDay`
 *   (ex.: fecha dia 20, vence dia 27); cai no mês seguinte quando `dueDay <=
 *   closingDay` (ex.: fecha dia 28, vence dia 5) — é o padrão mais comum em cartões
 *   brasileiros.
 * - Dias que não existem no mês (ex.: 31 em fevereiro) são ajustados para o último
 *   dia do mês.
 */

function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function clampedDate(year: number, monthIndex0: number, day: number): Date {
  return new Date(year, monthIndex0, Math.min(day, daysInMonth(year, monthIndex0)));
}

function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/** Soma `months` meses a uma data ISO (yyyy-mm-dd), ajustando dias inexistentes (ex.: 31/04 -> 30/04). */
export function addMonthsToDate(dateIso: string, months: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = clampedDate(y, m - 1 + months, d);
  return toDateOnly(date);
}

export function resolveBillingCycle(
  transactionDate: string,
  closingDay: number,
  dueDay: number,
): { referenceMonth: string; closingDate: string; dueDate: string } {
  const [y, m, d] = transactionDate.split("-").map(Number);
  let year = y;
  let monthIndex0 = m - 1;

  if (d > closingDay) {
    monthIndex0 += 1;
    if (monthIndex0 > 11) {
      monthIndex0 = 0;
      year += 1;
    }
  }

  const referenceMonth = new Date(year, monthIndex0, 1);
  const closingDate = clampedDate(year, monthIndex0, closingDay);

  let dueMonthIndex0 = monthIndex0;
  let dueYear = year;
  if (dueDay <= closingDay) {
    dueMonthIndex0 += 1;
    if (dueMonthIndex0 > 11) {
      dueMonthIndex0 = 0;
      dueYear += 1;
    }
  }
  const dueDate = clampedDate(dueYear, dueMonthIndex0, dueDay);

  return {
    referenceMonth: toDateOnly(referenceMonth),
    closingDate: toDateOnly(closingDate),
    dueDate: toDateOnly(dueDate),
  };
}
