-- 013: views financeiras + RPC de dashboard
-- Fonte: ERD §60-61. Evita replicar regras financeiras em vários componentes;
-- agregações ocorrem no banco/server, não no browser.
-- security_invoker = true: a view executa com o privilégio de quem consulta, então a
-- RLS das tabelas subjacentes continua sendo respeitada (nenhuma view contorna RLS).

create view monthly_cash_flow
with (security_invoker = true) as
select
  household_id,
  date_trunc('month', transaction_date)::date as month,
  sum(case when type = 'income' then amount else 0 end) as income,
  sum(case when type = 'expense' then amount else 0 end) as expenses,
  sum(case when type = 'income' then amount when type = 'expense' then -amount else 0 end) as balance
from transactions
where deleted_at is null and status = 'posted' and type in ('income', 'expense')
group by household_id, date_trunc('month', transaction_date);

create view category_spending
with (security_invoker = true) as
select
  t.household_id,
  date_trunc('month', t.transaction_date)::date as month,
  t.category_id,
  c.name as category_name,
  t.profile_id,
  sum(t.amount) as total_amount
from transactions t
join categories c on c.id = t.category_id
where t.deleted_at is null and t.status = 'posted' and t.type = 'expense'
group by t.household_id, date_trunc('month', t.transaction_date), t.category_id, c.name, t.profile_id;

create view profile_spending
with (security_invoker = true) as
select
  t.household_id,
  date_trunc('month', t.transaction_date)::date as month,
  t.profile_id,
  p.name as profile_name,
  sum(case when t.type = 'income' then t.amount else 0 end) as income,
  sum(case when t.type = 'expense' then t.amount else 0 end) as expenses
from transactions t
join profiles p on p.id = t.profile_id
where t.deleted_at is null and t.status = 'posted' and t.type in ('income', 'expense')
group by t.household_id, date_trunc('month', t.transaction_date), t.profile_id, p.name;

create view budget_performance
with (security_invoker = true) as
select
  b.id as budget_id,
  b.household_id,
  b.profile_id,
  bi.category_id,
  bi.subcategory_id,
  bi.planned_amount,
  coalesce((
    select sum(t.amount)
    from transactions t
    where t.household_id = b.household_id
      and t.type = 'expense'
      and t.status = 'posted'
      and t.deleted_at is null
      and t.category_id = bi.category_id
      and (bi.subcategory_id is null or t.subcategory_id = bi.subcategory_id)
      and (b.profile_id is null or t.profile_id = b.profile_id)
      and t.transaction_date between b.start_date and b.end_date
  ), 0) as realized_amount
from budgets b
join budget_items bi on bi.budget_id = b.id;

create view subscription_summary
with (security_invoker = true) as
select
  household_id,
  count(*) filter (where active) as active_subscriptions,
  coalesce(sum(case frequency
        when 'weekly' then amount * 52 / 12
        when 'monthly' then amount
        when 'quarterly' then amount / 3
        when 'semiannual' then amount / 6
        when 'annual' then amount / 12
        else amount
      end) filter (where active), 0) as monthly_cost,
  coalesce(sum(case frequency
        when 'weekly' then amount * 52
        when 'monthly' then amount * 12
        when 'quarterly' then amount * 4
        when 'semiannual' then amount * 2
        when 'annual' then amount
        else amount * 12
      end) filter (where active), 0) as annual_cost
from subscriptions
group by household_id;

create view net_worth_history
with (security_invoker = true) as
with asset_totals as (
  select household_id, valuation_date as as_of_date, sum(current_value) as total_assets
  from assets
  group by household_id, valuation_date
),
liability_totals as (
  select household_id, coalesce(due_date, current_date) as as_of_date, sum(current_balance) as total_liabilities
  from liabilities
  group by household_id, coalesce(due_date, current_date)
)
select
  coalesce(a.household_id, l.household_id) as household_id,
  coalesce(a.as_of_date, l.as_of_date) as as_of_date,
  coalesce(a.total_assets, 0) as total_assets,
  coalesce(l.total_liabilities, 0) as total_liabilities,
  coalesce(a.total_assets, 0) - coalesce(l.total_liabilities, 0) as net_worth
from asset_totals a
full outer join liability_totals l
  on a.household_id = l.household_id and a.as_of_date = l.as_of_date;

-- RPC dashboard_monthly_summary: SECURITY DEFINER precisa de guarda explícita de
-- autorização (não pode confiar apenas em RLS, já que ela ignora RLS por natureza).
create or replace function dashboard_monthly_summary(
  p_household_id uuid,
  p_month date,
  p_profile_id uuid default null
)
returns table (
  income numeric,
  expenses numeric,
  balance numeric,
  savings_rate numeric,
  credit_card_total numeric,
  budget_limit numeric,
  budget_realized numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not is_household_member(p_household_id) then
    raise exception 'not authorized';
  end if;

  return query
  with period as (
    select date_trunc('month', p_month)::date as start_date,
           (date_trunc('month', p_month) + interval '1 month - 1 day')::date as end_date
  ),
  txn as (
    select
      coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0) as income,
      coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0) as expenses
    from transactions t, period
    where t.household_id = p_household_id
      and t.deleted_at is null
      and t.status = 'posted'
      and t.type in ('income', 'expense')
      and t.transaction_date between period.start_date and period.end_date
      and (p_profile_id is null or t.profile_id = p_profile_id)
  ),
  cards as (
    select coalesce(sum(b.total_amount), 0) as credit_card_total
    from credit_card_bills b
    join credit_cards cc on cc.id = b.credit_card_id
    where b.household_id = p_household_id
      and b.reference_month = date_trunc('month', p_month)::date
      and (p_profile_id is null or cc.profile_id = p_profile_id)
  ),
  budget as (
    select
      coalesce(sum(bi.planned_amount), 0) as budget_limit,
      coalesce(sum((
        select coalesce(sum(t.amount), 0) from transactions t, period
        where t.household_id = p_household_id
          and t.type = 'expense' and t.status = 'posted' and t.deleted_at is null
          and t.category_id = bi.category_id
          and t.transaction_date between period.start_date and period.end_date
          and (p_profile_id is null or t.profile_id = p_profile_id)
      )), 0) as budget_realized
    from budgets b
    join budget_items bi on bi.budget_id = b.id
    where b.household_id = p_household_id
      and (b.profile_id is null or b.profile_id = p_profile_id)
      and date_trunc('month', p_month)::date
        between date_trunc('month', b.start_date)::date and date_trunc('month', b.end_date)::date
  )
  select
    txn.income,
    txn.expenses,
    txn.income - txn.expenses as balance,
    case when txn.income > 0
      then round(((txn.income - txn.expenses) / txn.income) * 100, 2)
      else 0 end as savings_rate,
    cards.credit_card_total,
    budget.budget_limit,
    budget.budget_realized
  from txn, cards, budget;
end;
$$;

grant execute on function dashboard_monthly_summary(uuid, date, uuid) to authenticated;
