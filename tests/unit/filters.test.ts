import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  currentMonthPeriod,
  formatPeriodLabel,
  parsePeriodCookie,
  parseProfileCookie,
  periodToDateRange,
  previousPeriodRange,
  serializePeriodCookie,
  shiftMonthPeriod,
  trailingMonths,
  type PeriodFilter,
} from "@/lib/filters";

describe("currentMonthPeriod", () => {
  it("usa o mês/ano de `now`", () => {
    expect(currentMonthPeriod(new Date(2026, 2, 10))).toEqual({ kind: "month", year: 2026, month: 3 });
  });
});

describe("parsePeriodCookie / serializePeriodCookie", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1)); // agosto/2026
  });
  afterEach(() => vi.useRealTimers());

  it("faz round-trip de um período de mês", () => {
    const period: PeriodFilter = { kind: "month", year: 2026, month: 5 };
    expect(parsePeriodCookie(serializePeriodCookie(period))).toEqual(period);
  });

  it("faz round-trip de um range personalizado", () => {
    const period: PeriodFilter = { kind: "range", from: "2026-01-01", to: "2026-01-31" };
    expect(parsePeriodCookie(serializePeriodCookie(period))).toEqual(period);
  });

  it("cai no mês atual se o cookie estiver ausente ou corrompido", () => {
    expect(parsePeriodCookie(undefined)).toEqual({ kind: "month", year: 2026, month: 8 });
    expect(parsePeriodCookie("%invalido%%%")).toEqual({ kind: "month", year: 2026, month: 8 });
    expect(parsePeriodCookie(encodeURIComponent(JSON.stringify({ kind: "bogus" })))).toEqual({
      kind: "month",
      year: 2026,
      month: 8,
    });
  });
});

describe("parseProfileCookie", () => {
  it('sem cookie -> "all"', () => {
    expect(parseProfileCookie(undefined)).toBe("all");
  });

  it("aceita um UUID válido de profiles.id", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(parseProfileCookie(uuid)).toBe(uuid);
  });

  it('valor que não é UUID (cookie corrompido/malicioso) cai em "all" — protege o filtro .or() do PostgREST', () => {
    expect(parseProfileCookie("'; drop table profiles; --")).toBe("all");
    expect(parseProfileCookie("not-a-uuid")).toBe("all");
  });
});

describe("shiftMonthPeriod", () => {
  it("avança e retrocede meses, virando o ano quando necessário", () => {
    expect(shiftMonthPeriod({ kind: "month", year: 2026, month: 12 }, 1)).toEqual({
      kind: "month",
      year: 2027,
      month: 1,
    });
    expect(shiftMonthPeriod({ kind: "month", year: 2026, month: 1 }, -1)).toEqual({
      kind: "month",
      year: 2025,
      month: 12,
    });
  });
});

describe("periodToDateRange", () => {
  it("cobre o mês inteiro, respeitando meses com 28/30/31 dias", () => {
    expect(periodToDateRange({ kind: "month", year: 2026, month: 2 })).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(periodToDateRange({ kind: "month", year: 2026, month: 4 })).toEqual({
      from: "2026-04-01",
      to: "2026-04-30",
    });
  });

  it("range personalizado passa direto", () => {
    expect(periodToDateRange({ kind: "range", from: "2026-01-05", to: "2026-01-20" })).toEqual({
      from: "2026-01-05",
      to: "2026-01-20",
    });
  });
});

describe("previousPeriodRange", () => {
  it("mês anterior de mesma duração pra período em mês", () => {
    expect(previousPeriodRange({ kind: "month", year: 2026, month: 3 })).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("range personalizado: mesmo número de dias imediatamente antes de `from`", () => {
    // 10 dias (01 a 10) -> os 10 dias anteriores terminam em 31/12 e começam em 22/12
    expect(previousPeriodRange({ kind: "range", from: "2026-01-01", to: "2026-01-10" })).toEqual({
      from: "2025-12-22",
      to: "2025-12-31",
    });
  });
});

describe("trailingMonths", () => {
  it("os últimos N meses terminando no mês âncora (inclusive)", () => {
    const months = trailingMonths("2026-03-15", 3);
    expect(months.map((m) => `${m.year}-${m.month}`)).toEqual(["2026-1", "2026-2", "2026-3"]);
    expect(months[months.length - 1].label).toBe("Mar/26");
  });
});

describe("formatPeriodLabel", () => {
  it("formata período de mês por extenso", () => {
    expect(formatPeriodLabel({ kind: "month", year: 2026, month: 8 })).toBe("Agosto 2026");
  });
});
