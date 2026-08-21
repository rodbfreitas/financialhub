/**
 * Filtro global de perfil + período (Design System §5-6): precisa persistir durante a
 * navegação inteira, então fica em cookies (lidos no server pela shell, atualizados no
 * client sem precisar de round-trip). Ainda não há nenhuma página lendo isso pra
 * filtrar dados de verdade — isso chega junto com as telas que os consomem (Etapa 6+)
 * — a Etapa 5 só cobre o estado global + a UI dos seletores.
 */

export const PROFILE_COOKIE = "fh_profile";
export const PERIOD_COOKIE = "fh_period";

/** "all" = opção "Todos" do ProfileSelector; qualquer outro valor é um profiles.id. */
export type ProfileFilter = "all" | string;

export type PeriodFilter =
  | { kind: "month"; year: number; month: number } // month: 1-12
  | { kind: "range"; from: string; to: string }; // ISO yyyy-mm-dd

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function currentMonthPeriod(now: Date = new Date()): Extract<PeriodFilter, { kind: "month" }> {
  return { kind: "month", year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function parsePeriodCookie(value: string | undefined): PeriodFilter {
  if (!value) return currentMonthPeriod();
  try {
    const parsed = JSON.parse(decodeURIComponent(value));
    if (parsed?.kind === "month" && Number.isInteger(parsed.year) && Number.isInteger(parsed.month)) {
      return { kind: "month", year: parsed.year, month: parsed.month };
    }
    if (parsed?.kind === "range" && typeof parsed.from === "string" && typeof parsed.to === "string") {
      return { kind: "range", from: parsed.from, to: parsed.to };
    }
  } catch {
    // cookie corrompido ou de um formato antigo — cai no padrão abaixo
  }
  return currentMonthPeriod();
}

export function serializePeriodCookie(period: PeriodFilter): string {
  return encodeURIComponent(JSON.stringify(period));
}

export function parseProfileCookie(value: string | undefined): ProfileFilter {
  return value && value.trim().length > 0 ? value : "all";
}

export function shiftMonthPeriod(period: PeriodFilter, delta: number): PeriodFilter {
  const base = period.kind === "month" ? period : currentMonthPeriod();
  const date = new Date(base.year, base.month - 1 + delta, 1);
  return { kind: "month", year: date.getFullYear(), month: date.getMonth() + 1 };
}

/** Converte o período em um intervalo de datas ISO (yyyy-mm-dd, inclusive nas pontas). */
export function periodToDateRange(period: PeriodFilter): { from: string; to: string } {
  if (period.kind === "range") return { from: period.from, to: period.to };

  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(period.year, period.month, 0).getDate();
  return {
    from: `${period.year}-${pad(period.month)}-01`,
    to: `${period.year}-${pad(period.month)}-${pad(lastDay)}`,
  };
}

export function formatPeriodLabel(period: PeriodFilter): string {
  if (period.kind === "month") {
    return `${MONTH_NAMES[period.month - 1]} ${period.year}`;
  }
  const from = new Date(period.from + "T00:00:00");
  const to = new Date(period.to + "T00:00:00");
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  return `${fmt(from)} – ${fmt(to)}`;
}
