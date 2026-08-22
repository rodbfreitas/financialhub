-- 021: histórico real de patrimônio líquido (Etapa 10 — Reports, PRD §22/32
-- "Evolução patrimonial").
--
-- `assets`/`liabilities` (ERD, já existiam desde a Etapa 2) guardam só o valor ATUAL
-- de cada item — não é uma tabela append-only, então não existe histórico de verdade
-- ali. A view `net_worth_history` (013_views_and_rpc.sql) agrupa por valuation_date,
-- mas isso só forma uma série temporal de verdade se o usuário reavaliar tudo no
-- mesmo dia, o que não é realista.
--
-- Em vez de inventar/reconstruir histórico que não existe, criamos uma tabela de
-- snapshots reais: `snapshot_net_worth()` calcula o patrimônio líquido atual
-- (contas + assets - faturas em aberto - liabilities) e grava (ou atualiza, via
-- upsert por dia) uma linha do dia. Ela é chamada sempre que a página de Patrimônio
-- é carregada e sempre que assets/liabilities mudam — o histórico cresce com o uso
-- real do sistema, sem simular dados que nunca existiram.

create table net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  snapshot_date date not null default current_date,
  total_accounts numeric(15, 2) not null default 0,
  total_assets numeric(15, 2) not null default 0,
  total_credit_card_debt numeric(15, 2) not null default 0,
  total_liabilities numeric(15, 2) not null default 0,
  net_worth numeric(15, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, snapshot_date)
);

alter table net_worth_snapshots enable row level security;

create policy net_worth_snapshots_select on net_worth_snapshots
  for select using (is_household_member(household_id));

-- Sem policies de insert/update/delete pra usuários: a tabela só é escrita pela
-- função abaixo (security definer), nunca diretamente pelo client — evita snapshot
-- forjado/adulterado pelo usuário.

create index net_worth_snapshots_household_date_idx
  on net_worth_snapshots (household_id, snapshot_date);

create or replace function snapshot_net_worth(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accounts numeric(15, 2);
  v_assets numeric(15, 2);
  v_cc_debt numeric(15, 2);
  v_liabilities numeric(15, 2);
begin
  if not is_household_member(p_household_id) then
    raise exception 'not authorized';
  end if;

  select coalesce(sum(current_balance), 0) into v_accounts
  from accounts
  where household_id = p_household_id and active and currency = 'BRL';

  select coalesce(sum(current_value), 0) into v_assets
  from assets
  where household_id = p_household_id;

  select coalesce(sum(total_amount), 0) into v_cc_debt
  from credit_card_bills
  where household_id = p_household_id and status in ('open', 'closed', 'overdue');

  select coalesce(sum(current_balance), 0) into v_liabilities
  from liabilities
  where household_id = p_household_id;

  insert into net_worth_snapshots (
    household_id, snapshot_date, total_accounts, total_assets,
    total_credit_card_debt, total_liabilities, net_worth, updated_at
  )
  values (
    p_household_id, current_date, v_accounts, v_assets,
    v_cc_debt, v_liabilities, v_accounts + v_assets - v_cc_debt - v_liabilities, now()
  )
  on conflict (household_id, snapshot_date) do update set
    total_accounts = excluded.total_accounts,
    total_assets = excluded.total_assets,
    total_credit_card_debt = excluded.total_credit_card_debt,
    total_liabilities = excluded.total_liabilities,
    net_worth = excluded.net_worth,
    updated_at = now();
end;
$$;

grant execute on function snapshot_net_worth(uuid) to authenticated;
