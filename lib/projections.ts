import { advanceOccurrence } from "@/lib/recurrence";

/**
 * Projeções básicas (Prompt Mestre Etapa 8) — cálculos simples e explicáveis a partir
 * de dado real (nada de modelo preditivo). PRD §49 cobre o saldo projetado do
 * dashboard; a projeção de prazo de meta é a extensão natural do fato de
 * `financial_goals.monthly_contribution` já existir no schema (PRD §21 só pede
 * mostrar "percentual concluído", mas com contribuição mensal cadastrada dá pra
 * calcular quando a meta é atingida sem inventar nenhum dado).
 */

export type GoalProjection =
  | { kind: "no_contribution" }
  | { kind: "already_reached" }
  | { kind: "projected"; monthsRemaining: number; projectedDate: string };

export function projectGoalCompletion(goal: {
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number | null;
}): GoalProjection {
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return { kind: "already_reached" };
  if (!goal.monthlyContribution || goal.monthlyContribution <= 0) return { kind: "no_contribution" };

  const monthsRemaining = Math.ceil(remaining / goal.monthlyContribution);
  const now = new Date();
  const projected = new Date(now.getFullYear(), now.getMonth() + monthsRemaining, now.getDate());
  const pad = (n: number) => String(n).padStart(2, "0");
  const projectedDate = `${projected.getFullYear()}-${pad(projected.getMonth() + 1)}-${pad(projected.getDate())}`;

  return { kind: "projected", monthsRemaining, projectedDate };
}

export type RecurringForProjection = {
  type: "income" | "expense";
  amount: number;
  nextOccurrence: string;
  frequency: "weekly" | "monthly" | "quarterly" | "semiannual" | "annual" | "custom";
  interval: number;
  endDate: string | null;
};

/**
 * Saldo projetado em `windowDays` a partir de hoje (PRD §49): saldo atual das contas +
 * ocorrências de receitas/despesas recorrentes previstas dentro da janela — expande
 * cada recorrência ativa a partir de `next_occurrence` (uma recorrência semanal pode
 * cair mais de uma vez em 30 dias). Não soma parcelas de cartão futuras de novo: elas
 * já nascem como transações reais no momento da criação do parcelamento (Etapa 6) e já
 * estão refletidas na fatura/saldo atuais — somar aqui duplicaria o valor.
 */
export function projectBalance(currentTotal: number, recurring: RecurringForProjection[], windowDays = 30): number {
  const today = new Date();
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + windowDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  const windowEndIso = `${windowEnd.getFullYear()}-${pad(windowEnd.getMonth() + 1)}-${pad(windowEnd.getDate())}`;

  let total = currentTotal;

  for (const r of recurring) {
    let occurrence = r.nextOccurrence;
    let guard = 0;
    while (occurrence <= windowEndIso && (!r.endDate || occurrence <= r.endDate) && guard < 500) {
      total += r.type === "income" ? r.amount : -r.amount;
      occurrence = advanceOccurrence(occurrence, r.frequency, r.interval);
      guard++;
    }
  }

  return total;
}
