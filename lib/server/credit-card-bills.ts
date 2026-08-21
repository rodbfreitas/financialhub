import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveBillingCycle } from "@/lib/credit-card-billing";
import type { Database } from "@/types/database";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

/**
 * Compras (expense) somam na fatura do cartão e saem do saldo da conta; receitas/
 * ajustes lançados no cartão (ex.: um reembolso) entram como crédito, reduzindo a
 * fatura; na conta, entram como valor positivo. Compartilhado por
 * actions/transactions.ts e actions/installments.ts (parcelamentos geram várias
 * transações do tipo expense, uma por mês).
 */
export function contributionFor(type: TransactionType, amount: number): number {
  return type === "expense" ? amount : -amount;
}

/**
 * Aplica um delta (positivo ou negativo) na fatura do ciclo correspondente à data da
 * transação, criando a fatura se ainda não existir (migration 017). Retorna o id da
 * fatura afetada — usado para preencher `transactions.credit_card_bill_id`.
 */
export async function applyBillDelta(
  supabase: SupabaseClient<Database>,
  householdId: string,
  creditCardId: string,
  transactionDate: string,
  delta: number,
): Promise<string | null> {
  const { data: card } = await supabase
    .from("credit_cards")
    .select("closing_day, due_day")
    .eq("id", creditCardId)
    .single();

  if (!card) return null;

  const { referenceMonth, closingDate, dueDate } = resolveBillingCycle(
    transactionDate,
    card.closing_day,
    card.due_day,
  );

  const { data: bill } = await supabase.rpc("upsert_credit_card_bill_delta", {
    p_household_id: householdId,
    p_credit_card_id: creditCardId,
    p_reference_month: referenceMonth,
    p_closing_date: closingDate,
    p_due_date: dueDate,
    p_delta: delta,
  });

  return bill?.id ?? null;
}
