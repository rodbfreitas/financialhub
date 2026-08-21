-- 006: budgets, budget_items, subscriptions, financial_goals
-- Fonte: ERD §30-33 / PRD §18-19, §21

create table budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade, -- null = orçamento familiar
  name text not null,
  period_type budget_period_type not null default 'monthly',
  start_date date not null,
  end_date date not null,
  total_limit numeric(15,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table budget_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references budgets(id) on delete cascade,
  category_id uuid not null references categories(id),
  subcategory_id uuid references subcategories(id),
  planned_amount numeric(15,2) not null check (planned_amount >= 0),
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  amount numeric(15,2) not null check (amount > 0),
  frequency recurrence_frequency not null default 'monthly',
  category_id uuid references categories(id),
  subcategory_id uuid references subcategories(id),
  account_id uuid references accounts(id) on delete set null,
  credit_card_id uuid references credit_cards(id) on delete set null,
  next_charge_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table financial_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  name text not null,
  description text,
  target_amount numeric(15,2) not null check (target_amount > 0),
  current_amount numeric(15,2) not null default 0,
  target_date date,
  monthly_contribution numeric(15,2),
  status goal_status not null default 'in_progress',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_budgets_household on budgets(household_id);
create index idx_budget_items_budget on budget_items(budget_id);
create index idx_subscriptions_household on subscriptions(household_id);
create index idx_financial_goals_household on financial_goals(household_id);
