-- 012: Row Level Security — obrigatória em todas as tabelas privadas (ADR-007)
-- Regra: "Nenhuma consulta financeira deverá confiar apenas no frontend" (ERD §46/49)

-- households: usuário só vê households dos quais é membro
alter table households enable row level security;

create policy household_select on households for select
  using (is_household_member(id));

create policy household_insert on households for insert
  with check (auth.uid() is not null);

create policy household_update on households for update
  using (is_household_member(id) and has_household_role(id, 'admin'))
  with check (is_household_member(id) and has_household_role(id, 'admin'));

create policy household_delete on households for delete
  using (has_household_role(id, 'owner'));

-- household_members: leitura para membros; escrita restrita a admin/owner, exceto o
-- primeiro membro (bootstrap: ninguém é admin ainda quando o household é criado).
alter table household_members enable row level security;

create policy household_members_select on household_members for select
  using (is_household_member(household_id));

create policy household_members_insert on household_members for insert
  with check (
    has_household_role(household_id, 'admin')
    or not exists (
      select 1 from household_members hm where hm.household_id = household_members.household_id
    )
  );

create policy household_members_update on household_members for update
  using (has_household_role(household_id, 'admin'))
  with check (has_household_role(household_id, 'admin'));

create policy household_members_delete on household_members for delete
  using (has_household_role(household_id, 'admin'));

-- Tabelas com household_id direto: isolamento simples por household.
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'accounts', 'credit_cards', 'credit_card_bills', 'categories', 'tags',
    'transactions', 'installment_plans', 'recurring_transactions', 'budgets', 'subscriptions',
    'financial_goals', 'assets', 'liabilities', 'imports', 'categorization_rules',
    'bank_connections', 'external_transactions', 'notifications', 'audit_logs'
  ]
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for all using (is_household_member(household_id)) with check (is_household_member(household_id))',
      t || '_household_isolation', t
    );
  end loop;
end $$;

-- Tabelas sem household_id direto: isolamento via subquery na tabela pai.
alter table profile_access enable row level security;
create policy profile_access_isolation on profile_access for all
  using (exists (select 1 from profiles p where p.id = profile_access.profile_id and is_household_member(p.household_id)))
  with check (exists (select 1 from profiles p where p.id = profile_access.profile_id and is_household_member(p.household_id)));

alter table subcategories enable row level security;
create policy subcategories_isolation on subcategories for all
  using (exists (select 1 from categories c where c.id = subcategories.category_id and is_household_member(c.household_id)))
  with check (exists (select 1 from categories c where c.id = subcategories.category_id and is_household_member(c.household_id)));

alter table transaction_splits enable row level security;
create policy transaction_splits_isolation on transaction_splits for all
  using (exists (select 1 from transactions t where t.id = transaction_splits.transaction_id and is_household_member(t.household_id)))
  with check (exists (select 1 from transactions t where t.id = transaction_splits.transaction_id and is_household_member(t.household_id)));

alter table transaction_tags enable row level security;
create policy transaction_tags_isolation on transaction_tags for all
  using (exists (select 1 from transactions t where t.id = transaction_tags.transaction_id and is_household_member(t.household_id)))
  with check (exists (select 1 from transactions t where t.id = transaction_tags.transaction_id and is_household_member(t.household_id)));

alter table budget_items enable row level security;
create policy budget_items_isolation on budget_items for all
  using (exists (select 1 from budgets b where b.id = budget_items.budget_id and is_household_member(b.household_id)))
  with check (exists (select 1 from budgets b where b.id = budget_items.budget_id and is_household_member(b.household_id)));

alter table import_rows enable row level security;
create policy import_rows_isolation on import_rows for all
  using (exists (select 1 from imports i where i.id = import_rows.import_id and is_household_member(i.household_id)))
  with check (exists (select 1 from imports i where i.id = import_rows.import_id and is_household_member(i.household_id)));

alter table external_accounts enable row level security;
create policy external_accounts_isolation on external_accounts for all
  using (exists (select 1 from bank_connections bc where bc.id = external_accounts.bank_connection_id and is_household_member(bc.household_id)))
  with check (exists (select 1 from bank_connections bc where bc.id = external_accounts.bank_connection_id and is_household_member(bc.household_id)));
