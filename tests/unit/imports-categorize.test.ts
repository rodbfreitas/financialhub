import { describe, expect, it } from "vitest";
import { matchCategory } from "@/lib/imports/categorize";

function rule(partial: {
  match_type: "contains" | "equals" | "starts_with" | "regex";
  match_value: string;
  category_id: string;
  subcategory_id?: string | null;
  priority?: number;
}) {
  return { subcategory_id: null, priority: 0, ...partial };
}

describe("matchCategory", () => {
  it("sem regras cadastradas, não sugere nada (nunca inventa categoria)", () => {
    expect(matchCategory([], "Supermercado ABC")).toBeNull();
  });

  it('"contains" — bate em qualquer posição da descrição', () => {
    const rules = [rule({ match_type: "contains", match_value: "supermercado", category_id: "food" })];
    expect(matchCategory(rules, "Compra Supermercado ABC")).toEqual({ categoryId: "food", subcategoryId: null });
  });

  it('"equals" exige igualdade exata (case-insensitive)', () => {
    const rules = [rule({ match_type: "equals", match_value: "uber", category_id: "transport" })];
    expect(matchCategory(rules, "UBER")).toEqual({ categoryId: "transport", subcategoryId: null });
    expect(matchCategory(rules, "UBER TRIP")).toBeNull();
  });

  it('"starts_with" exige que a descrição comece com o valor', () => {
    const rules = [rule({ match_type: "starts_with", match_value: "pag*", category_id: "other" })];
    expect(matchCategory(rules, "PAG*LOJA XYZ")).toEqual({ categoryId: "other", subcategoryId: null });
    expect(matchCategory(rules, "LOJA PAG*XYZ")).toBeNull();
  });

  it('"regex" aplica a expressão (case-insensitive) e nunca derruba o app se o regex for inválido', () => {
    const rules = [rule({ match_type: "regex", match_value: "^netflix|spotify$", category_id: "subs" })];
    expect(matchCategory(rules, "Netflix.com")).toEqual({ categoryId: "subs", subcategoryId: null });

    const badRegex = [rule({ match_type: "regex", match_value: "(", category_id: "subs" })];
    expect(() => matchCategory(badRegex, "qualquer coisa")).not.toThrow();
    expect(matchCategory(badRegex, "qualquer coisa")).toBeNull();
  });

  it("respeita prioridade — regra de prioridade maior vence quando mais de uma bate", () => {
    const rules = [
      rule({ match_type: "contains", match_value: "loja", category_id: "generic", priority: 1 }),
      rule({ match_type: "contains", match_value: "loja de roupas", category_id: "clothing", priority: 10 }),
    ];
    expect(matchCategory(rules, "Compra na Loja de Roupas XYZ")).toEqual({
      categoryId: "clothing",
      subcategoryId: null,
    });
  });

  it("devolve a subcategoria quando a regra tem uma", () => {
    const rules = [
      rule({ match_type: "contains", match_value: "ifood", category_id: "food", subcategory_id: "delivery" }),
    ];
    expect(matchCategory(rules, "IFOOD DELIVERY")).toEqual({ categoryId: "food", subcategoryId: "delivery" });
  });
});
