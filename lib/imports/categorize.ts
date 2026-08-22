import type { Database } from "@/types/database";

type CategorizationRule = Pick<
  Database["public"]["Tables"]["categorization_rules"]["Row"],
  "match_type" | "match_value" | "category_id" | "subcategory_id" | "priority"
>;

/**
 * Sugestão de categoria durante a importação (PRD §24: "O sistema deverá identificar
 * ... categoria existente"), usando as regras reais de `categorization_rules` (tabela
 * que já existia desde a Etapa 2 e não tinha nenhum consumidor até agora). Sem regra
 * cadastrada, a linha fica sem sugestão — nunca inventa uma categoria.
 */
export function matchCategory(
  rules: CategorizationRule[],
  description: string,
): { categoryId: string; subcategoryId: string | null } | null {
  const target = description.toLowerCase();
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    if (matches(rule.match_type, rule.match_value, target)) {
      return { categoryId: rule.category_id, subcategoryId: rule.subcategory_id };
    }
  }
  return null;
}

function matches(matchType: CategorizationRule["match_type"], matchValue: string, target: string): boolean {
  const value = matchValue.toLowerCase();
  switch (matchType) {
    case "contains":
      return target.includes(value);
    case "equals":
      return target === value;
    case "starts_with":
      return target.startsWith(value);
    case "regex":
      try {
        return new RegExp(matchValue, "i").test(target);
      } catch {
        return false;
      }
    default:
      return false;
  }
}
