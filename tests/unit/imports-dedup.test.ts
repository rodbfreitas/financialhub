import { describe, expect, it } from "vitest";
import { computeDedupHash, normalizeMerchant } from "@/lib/imports/dedup";

describe("normalizeMerchant", () => {
  it("remove acentos, baixa a caixa e colapsa espaços", () => {
    expect(normalizeMerchant("Supermercado São João  ")).toBe("supermercado sao joao");
  });

  it("remove pontuação/símbolos, mantendo letras e números", () => {
    expect(normalizeMerchant("PAG*RESTAURANTE Nº 42!!!")).toBe("pag restaurante n 42");
  });

  it("trunca em 60 caracteres", () => {
    const long = "A".repeat(100);
    expect(normalizeMerchant(long)).toHaveLength(60);
  });
});

describe("computeDedupHash", () => {
  const base = { accountId: "acc1", creditCardId: null, date: "2026-01-15", amount: 89.9, description: "Mercado ABC" };

  it("é determinístico — mesma entrada gera o mesmo hash", () => {
    expect(computeDedupHash(base)).toBe(computeDedupHash({ ...base }));
  });

  it("ignora o sinal do valor (usa Math.abs) — despesa e 'mesmo valor' de outro tipo colidem por design", () => {
    expect(computeDedupHash(base)).toBe(computeDedupHash({ ...base, amount: -89.9 }));
  });

  it("é insensível a acento/maiúscula/pontuação na descrição (via normalizeMerchant)", () => {
    expect(computeDedupHash(base)).toBe(computeDedupHash({ ...base, description: "MERCADO, ABC!!" }));
  });

  it("muda se a conta, o cartão, a data ou o valor mudarem", () => {
    const h = computeDedupHash(base);
    expect(computeDedupHash({ ...base, accountId: "acc2" })).not.toBe(h);
    expect(computeDedupHash({ ...base, accountId: null, creditCardId: "card1" })).not.toBe(h);
    expect(computeDedupHash({ ...base, date: "2026-01-16" })).not.toBe(h);
    expect(computeDedupHash({ ...base, amount: 90 })).not.toBe(h);
  });

  it("produz um hash sha256 (64 caracteres hex)", () => {
    expect(computeDedupHash(base)).toMatch(/^[0-9a-f]{64}$/);
  });
});
