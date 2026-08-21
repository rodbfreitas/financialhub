import { addMonthsToDate } from "@/lib/credit-card-billing";

/**
 * Avança uma data ISO (yyyy-mm-dd) para a próxima ocorrência de uma recorrência,
 * dado frequency + interval (recurring_transactions, ERD §17-18). "custom" não tem
 * uma regra própria definida no PRD/ERD — tratamos como múltiplo de meses (mesma
 * lógica de "monthly"), decisão documentada aqui por falta de especificação mais
 * detalhada.
 */
export function advanceOccurrence(
  dateIso: string,
  frequency: "weekly" | "monthly" | "quarterly" | "semiannual" | "annual" | "custom",
  interval: number,
): string {
  switch (frequency) {
    case "weekly": {
      const [y, m, d] = dateIso.split("-").map(Number);
      const date = new Date(y, m - 1, d + 7 * interval);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}`;
    }
    case "quarterly":
      return addMonthsToDate(dateIso, 3 * interval);
    case "semiannual":
      return addMonthsToDate(dateIso, 6 * interval);
    case "annual":
      return addMonthsToDate(dateIso, 12 * interval);
    case "monthly":
    case "custom":
    default:
      return addMonthsToDate(dateIso, interval);
  }
}
