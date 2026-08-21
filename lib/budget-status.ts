/**
 * Status visual de orçamento — Design System §33 / PRD §20: 4 faixas com cor + texto +
 * percentual sempre juntos (nunca só a cor). Compartilhado entre o card de orçamento
 * (Etapa 8) e o resumo do dashboard (Etapa 7) pra manter os mesmos limiares em
 * qualquer lugar que mostre "planejado x realizado".
 */
export type BudgetStatus = "normal" | "atencao" | "critico" | "excedido";

export function budgetStatus(plannedAmount: number, realizedAmount: number): BudgetStatus {
  if (plannedAmount <= 0) return realizedAmount > 0 ? "excedido" : "normal";
  const pct = (realizedAmount / plannedAmount) * 100;
  if (pct >= 100) return "excedido";
  if (pct >= 90) return "critico";
  if (pct >= 70) return "atencao";
  return "normal";
}

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  normal: "Normal",
  atencao: "Atenção",
  critico: "Crítico",
  excedido: "Excedido",
};

export const BUDGET_STATUS_BADGE_VARIANT: Record<BudgetStatus, "outline" | "warning" | "negative"> = {
  normal: "outline",
  atencao: "warning",
  critico: "negative",
  excedido: "negative",
};

export const BUDGET_STATUS_BAR_CLASS: Record<BudgetStatus, string> = {
  normal: "bg-primary",
  atencao: "bg-warning",
  critico: "bg-negative",
  excedido: "bg-negative",
};
