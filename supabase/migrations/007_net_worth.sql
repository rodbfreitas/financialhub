-- 007: assets, liabilities
-- Fonte: ERD §34-35 / PRD §22 (Patrimônio)

create table assets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  type text not null,
  name text not null,
  current_value numeric(15,2) not null default 0,
  valuation_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table liabilities (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  type text not null,
  name text not null,
  current_balance numeric(15,2) not null default 0,
  interest_rate numeric(6,3),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_assets_household on assets(household_id);
create index idx_liabilities_household on liabilities(household_id);
