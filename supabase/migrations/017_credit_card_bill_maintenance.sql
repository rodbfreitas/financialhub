-- 017: manutenção de credit_card_bills a partir de transações
-- O schema original (004/005) não tem trigger de geração de fatura — a soma é mantida
-- pela aplicação (actions/transactions.ts), que chama esta função a cada
-- create/update/delete de transação com credit_card_id preenchido: delta positivo ao
-- adicionar valor à fatura do ciclo, negativo ao remover (edição/exclusão/mudança de
-- cartão ou data). SECURITY INVOKER (padrão, sem "security definer"): respeita a RLS
-- já existente em credit_card_bills, que permite CRUD para qualquer membro ativo do
-- household (012_rls_policies.sql) — a função não precisa de privilégios elevados.

create or replace function upsert_credit_card_bill_delta(
  p_household_id uuid,
  p_credit_card_id uuid,
  p_reference_month date,
  p_closing_date date,
  p_due_date date,
  p_delta numeric(15,2)
)
returns credit_card_bills
language plpgsql
as $$
declare
  v_bill credit_card_bills;
begin
  insert into credit_card_bills (
    household_id, credit_card_id, reference_month, closing_date, due_date, total_amount, status
  )
  values (
    p_household_id, p_credit_card_id, p_reference_month, p_closing_date, p_due_date, p_delta, 'open'
  )
  on conflict (credit_card_id, reference_month)
  do update set
    total_amount = credit_card_bills.total_amount + excluded.total_amount,
    updated_at = now()
  returning * into v_bill;

  return v_bill;
end;
$$;

grant execute on function upsert_credit_card_bill_delta(uuid, uuid, date, date, date, numeric) to authenticated;
