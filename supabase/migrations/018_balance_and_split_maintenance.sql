-- 018: manutenção de saldo de conta + substituição atômica de splits
--
-- accounts.current_balance (004_accounts_cards.sql) não tem trigger de manutenção no
-- schema original — assim como credit_card_bills (017), é mantido pela aplicação.
-- Convenção: current_balance é o "saldo inicial" no cadastro da conta; a partir daí só
-- é alterado por esta função, chamada pelas actions de transações/transferências a
-- cada lançamento com account_id preenchido (delta positivo = entrada, negativo =
-- saída). A UI de edição de conta (actions/accounts.ts) não permite mais editar o
-- saldo depois de criada, justamente para não haver duas fontes de verdade.
create or replace function adjust_account_balance(
  p_account_id uuid,
  p_delta numeric(15,2)
)
returns accounts
language plpgsql
as $$
declare
  v_account accounts;
begin
  update accounts
  set current_balance = current_balance + p_delta,
      updated_at = now()
  where id = p_account_id
  returning * into v_account;

  return v_account;
end;
$$;

grant execute on function adjust_account_balance(uuid, numeric) to authenticated;

-- transaction_splits (005_transactions.sql) tem um constraint trigger deferrable que só
-- valida "soma dos splits == valor da transação" no commit — isso permite apagar todos
-- os splits antigos e inserir os novos numa única chamada, sem violar a constraint no
-- meio do caminho. Feito como função porque o cliente supabase-js não expõe
-- transações multi-statement.
create or replace function replace_transaction_splits(
  p_transaction_id uuid,
  p_splits jsonb
)
returns setof transaction_splits
language plpgsql
as $$
begin
  delete from transaction_splits where transaction_id = p_transaction_id;

  return query
  insert into transaction_splits (transaction_id, profile_id, category_id, subcategory_id, amount)
  select
    p_transaction_id,
    nullif(x.profile_id, '')::uuid,
    x.category_id::uuid,
    nullif(x.subcategory_id, '')::uuid,
    x.amount::numeric(15,2)
  from jsonb_to_recordset(p_splits) as x(
    profile_id text,
    category_id text,
    subcategory_id text,
    amount numeric
  )
  returning *;
end;
$$;

grant execute on function replace_transaction_splits(uuid, jsonb) to authenticated;
