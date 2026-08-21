-- 009: bank_connections, external_accounts, external_transactions
-- Fonte: ERD §40-42 (ADR-005: Open Finance abstraído via provider; núcleo nunca depende
-- diretamente do formato da Pluggy — Pluggy → external_transactions → normalização → transactions)

create table bank_connections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  provider text not null default 'pluggy',
  provider_connection_id text not null,
  institution_name text not null,
  institution_id text,
  status bank_connection_status not null default 'connected',
  consent_expires_at timestamptz,
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table external_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_connection_id uuid not null references bank_connections(id) on delete cascade,
  provider_account_id text not null,
  type text not null,
  name text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table external_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  bank_connection_id uuid not null references bank_connections(id) on delete cascade,
  provider_transaction_id text not null,
  raw_payload jsonb not null,
  normalized_hash text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (bank_connection_id, provider_transaction_id)
);

alter table accounts
  add constraint fk_accounts_bank_connection foreign key (bank_connection_id) references bank_connections(id) on delete set null,
  add constraint fk_accounts_external_account foreign key (external_account_id) references external_accounts(id) on delete set null;

alter table credit_cards
  add constraint fk_credit_cards_bank_connection foreign key (bank_connection_id) references bank_connections(id) on delete set null,
  add constraint fk_credit_cards_external_account foreign key (external_card_id) references external_accounts(id) on delete set null;

create index idx_bank_connections_household on bank_connections(household_id);
create index idx_external_accounts_connection on external_accounts(bank_connection_id);
create index idx_external_transactions_household on external_transactions(household_id);
create index idx_external_transactions_connection on external_transactions(bank_connection_id);
