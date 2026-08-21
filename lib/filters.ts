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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * O cookie é gravado pelo próprio client (`FiltersProvider`), então tecnicamente é
 * controlado pelo usuário — `profiles.id` é sempre um UUID gerado pelo banco, então
 * qualquer outro formato é tratado como cookie corrompido/malicioso e cai em "all".
 * Importa principalmente pra quem usa esse valor num filtro `.or()` do PostgREST
 * (string crua, diferente de `.eq()` que já é parametrizado) — ver dashboard.
 */
export function parseProfileCookie(value: string | undefined): ProfileFilter {
  if (!value) return "all";
  const trimmed = value.trim();
  return UUID_RE.test(trimmed) ? trimmed : "all";
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

/**
 * Período imediatamente anterior, de mesma duração — usado pelo dashboard pra
 * calcular a tendência ("↑ R$ 1.420 vs mês anterior", Prompt Mestre §16). Pra período
 * em mês, é literalmente o mês anterior; pra range personalizado, é o mesmo número de
 * dias imediatamente antes de `from`.
 */
export function previousPeriodRange(period: PeriodFilter): { from: string; to: string } {
  if (period.kind === "month") {
    return periodToDateRange(shiftMonthPeriod(period, -1));
  }

  const from = new Date(period.from + "T00:00:00");
  const to = new Date(period.to + "T00:00:00");
  const durationDays = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;

  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (durationDays - 1));

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(prevFrom), to: iso(prevTo) };
}

/** Os `count` meses de calendário terminando no mês que contém `anchorIso` (inclusive). */
export function trailingMonths(
  anchorIso: string,
  count: number,
): Array<{ year: number; month: number; from: string; to: string; label: string }> {
  const anchor = new Date(anchorIso + "T00:00:00");
  const months: Array<{ year: number; month: number; from: string; to: string; label: string }> = [];

  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1);
    const period: PeriodFilter = { kind: "month", year: date.getFullYear(), month: date.getMonth() + 1 };
    const { from, to } = periodToDateRange(period);
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      from,
      to,
      label: `${MONTH_NAMES[date.getMonth()].slice(0, 3)}/${String(date.getFullYear()).slice(2)}`,
    });
  }

  return months;
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
