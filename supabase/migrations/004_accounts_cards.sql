-- 004: accounts, credit_cards, credit_card_bills
-- Fonte: ERD §13-14, §29. Nunca armazenar número completo, CVV, PIN ou senha bancária.

create table accounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  institution_name text,
  name text not null,
  type account_type not null default 'checking',
  currency char(3) not null default 'BRL',
  current_balance numeric(15,2) not null default 0,
  active boolean not null default true,
  external_account_id uuid,
  bank_connection_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table credit_cards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  institution_name text,
  name text not null,
  brand text,
  last_four_digits char(4),
  credit_limit numeric(15,2),
  closing_day int not null check (closing_day between 1 and 31),
  due_day int not null check (due_day between 1 and 31),
  active boolean not null default true,
  external_card_id uuid,
  bank_connection_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table credit_card_bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  credit_card_id uuid not null references credit_cards(id) on delete cascade,
  reference_month date not null,
  closing_date date not null,
  due_date date not null,
  total_amount numeric(15,2) not null default 0,
  status credit_card_bill_status not null default 'open',
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (credit_card_id, reference_month)
);

create index idx_accounts_household on accounts(household_id);
create index idx_accounts_profile on accounts(profile_id);
create index idx_credit_cards_household on credit_cards(household_id);
create index idx_credit_cards_profile on credit_cards(profile_id);
create index idx_credit_card_bills_card on credit_card_bills(credit_card_id);
