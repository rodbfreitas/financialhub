import { describe, expect, it } from "vitest";
import { advanceOccurrence } from "@/lib/recurrence";

describe("advanceOccurrence", () => {
  it("weekly: soma 7 dias por intervalo", () => {
    expect(advanceOccurrence("2026-01-01", "weekly", 1)).toBe("2026-01-08");
    expect(advanceOccurrence("2026-01-01", "weekly", 2)).toBe("2026-01-15");
  });

  it("monthly: soma meses por intervalo", () => {
    expect(advanceOccurrence("2026-01-15", "monthly", 1)).toBe("2026-02-15");
    expect(advanceOccurrence("2026-01-15", "monthly", 3)).toBe("2026-04-15");
  });

  it("quarterly: soma 3 meses por intervalo", () => {
    expect(advanceOccurrence("2026-01-15", "quarterly", 1)).toBe("2026-04-15");
  });

  it("semiannual: soma 6 meses por intervalo", () => {
    expect(advanceOccurrence("2026-01-15", "semiannual", 1)).toBe("2026-07-15");
  });

  it("annual: soma 12 meses por intervalo", () => {
    expect(advanceOccurrence("2026-01-15", "annual", 1)).toBe("2027-01-15");
  });

  it("custom: tratado como múltiplo de meses (mesma regra de monthly)", () => {
    expect(advanceOccurrence("2026-01-15", "custom", 2)).toBe("2026-03-15");
  });

  it("weekly vira mês/ano corretamente", () => {
    expect(advanceOccurrence("2026-01-29", "weekly", 1)).toBe("2026-02-05");
  });
});
