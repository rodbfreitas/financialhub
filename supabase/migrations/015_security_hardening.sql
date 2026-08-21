-- 015: hardening a partir do Security Advisor do Supabase
-- - validate_transaction_splits estava com search_path mutável (WARN)
-- - is_household_member / has_household_role / can_access_profile / dashboard_monthly_summary
--   são SECURITY DEFINER e ficavam expostas via PostgREST RPC para o papel anon (WARN).
--   Precisam continuar executáveis por "authenticated" (usadas dentro das policies de RLS
--   e chamadas pelo client autenticado), mas não por "anon".
-- - Índices adicionais para foreign keys criadas via ALTER TABLE (§72 ERD).

create or replace function validate_transaction_splits()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_total numeric(15,2);
  v_splits_sum numeric(15,2);
begin
  v_transaction_id := coalesce(new.transaction_id, old.transaction_id);
  select amount into v_total from transactions where id = v_transaction_id;

  if v_total is null then
    return null;
  end if;

  select coalesce(sum(amount), 0) into v_splits_sum
  from transaction_splits
  where transaction_id = v_transaction_id;

  if v_splits_sum <> 0 and v_splits_sum <> v_total then
    raise exception 'A soma dos splits (%) deve ser igual ao valor da transação (%)', v_splits_sum, v_total;
  end if;

  return null;
end;
$$;

revoke execute on function is_household_member(uuid) from anon, public;
revoke execute on function has_household_role(uuid, household_role) from anon, public;
revoke execute on function can_access_profile(uuid) from anon, public;
revoke execute on function dashboard_monthly_summary(uuid, date, uuid) from anon, public;

grant execute on function is_household_member(uuid) to authenticated;
grant execute on function has_household_role(uuid, household_role) to authenticated;
grant execute on function can_access_profile(uuid) to authenticated;
grant execute on function dashboard_monthly_summary(uuid, date, uuid) to authenticated;

create index if not exists idx_accounts_bank_connection on accounts(bank_connection_id);
create index if not exists idx_accounts_external_account on accounts(external_account_id);
create index if not exists idx_credit_cards_bank_connection on credit_cards(bank_connection_id);
create index if not exists idx_credit_cards_external_account on credit_cards(external_card_id);
create index if not exists idx_assets_profile on assets(profile_id);
create index if not exists idx_liabilities_profile on liabilities(profile_id);
create index if not exists idx_budgets_profile on budgets(profile_id);
create index if not exists idx_subscriptions_profile on subscriptions(profile_id);
create index if not exists idx_financial_goals_profile on financial_goals(profile_id);
create index if not exists idx_installment_plans_profile on installment_plans(profile_id);
create index if not exists idx_recurring_transactions_profile on recurring_transactions(profile_id);
create index if not exists idx_transaction_splits_category on transaction_splits(category_id);
create index if not exists idx_budget_items_category on budget_items(category_id);
create index if not exists idx_categorization_rules_category on categorization_rules(category_id);
create index if not exists idx_imports_created_by on imports(created_by);
create index if not exists idx_notifications_household on notifications(household_id);
