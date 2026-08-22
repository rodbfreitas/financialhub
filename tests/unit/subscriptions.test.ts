import { describe, expect, it } from "vitest";
import { annualEquivalent, monthlyEquivalent } from "@/lib/subscriptions";

describe("monthlyEquivalent", () => {
  it("weekly: 52 semanas / 12 meses", () => {
    expect(monthlyEquivalent(10, "weekly")).toBeCloseTo((10 * 52) / 12);
  });
  it("quarterly: divide por 3", () => {
    expect(monthlyEquivalent(90, "quarterly")).toBeCloseTo(30);
  });
  it("semiannual: divide por 6", () => {
    expect(monthlyEquivalent(120, "semiannual")).toBeCloseTo(20);
  });
  it("annual: divide por 12", () => {
    expect(monthlyEquivalent(1200, "annual")).toBeCloseTo(100);
  });
  it("monthly (ou qualquer outra): passa direto", () => {
    expect(monthlyEquivalent(50, "monthly")).toBe(50);
  });
});

describe("annualEquivalent", () => {
  it("weekly: x52", () => {
    expect(annualEquivalent(10, "weekly")).toBe(520);
  });
  it("quarterly: x4", () => {
    expect(annualEquivalent(90, "quarterly")).toBe(360);
  });
  it("semiannual: x2", () => {
    expect(annualEquivalent(120, "semiannual")).toBe(240);
  });
  it("annual: passa direto", () => {
    expect(annualEquivalent(1200, "annual")).toBe(1200);
  });
  it("monthly (ou qualquer outra): x12", () => {
    expect(annualEquivalent(50, "monthly")).toBe(600);
  });
});

describe("consistência monthly <-> annual", () => {
  it("monthlyEquivalent * 12 == annualEquivalent, pra qualquer frequência", () => {
    for (const freq of ["weekly", "quarterly", "semiannual", "annual", "monthly"]) {
      expect(monthlyEquivalent(100, freq) * 12).toBeCloseTo(annualEquivalent(100, freq));
    }
  });
});
