-- 005: installment_plans, recurring_transactions, transactions, transaction_splits, transaction_tags
-- Fonte: ERD §15-27. Núcleo do sistema (ADR-003: titularidade e natureza são independentes).

create table installment_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  credit_card_id uuid references credit_cards(id) on delete set null,
  description text not null,
  total_amount numeric(15,2) not null check (total_amount <> 0),
  installment_count int not null check (installment_count > 0),
  start_date date not null,
  category_id uuid references categories(id) on delete set null,
  subcategory_id uuid references subcategories(id) on delete set null,
  created_at timestamptz not null default now()
);

create table recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  type transaction_type not null,
  description text not null,
  amount numeric(15,2) not null check (amount <> 0),
  account_id uuid references accounts(id) on delete set null,
  credit_card_id uuid references credit_cards(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  subcategory_id uuid references subcategories(id) on delete set null,
  frequency recurrence_frequency not null,
  interval int not null default 1,
  start_date date not null,
  end_date date,
  next_occurrence date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  credit_card_id uuid references credit_cards(id) on delete set null,
  type transaction_type not null,
  description text not null,
  merchant text,
  amount numeric(15,2) not null check (amount <> 0),
  currency char(3) not null default 'BRL',
  transaction_date date not null,
  status transaction_status not null default 'posted',
  category_id uuid references categories(id) on delete set null,
  subcategory_id uuid references subcategories(id) on delete set null,
  nature transaction_nature not null default 'individual',
  source transaction_source not null default 'manual',
  external_id text,
  external_source text,
  recurring_transaction_id uuid references recurring_transactions(id) on delete set null,
  installment_plan_id uuid references installment_plans(id) on delete set null,
  installment_number int,
  credit_card_bill_id uuid references credit_card_bills(id) on delete set null,
  transfer_id uuid,
  import_id uuid,
  deduplication_hash text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint chk_installment_number check (
    installment_plan_id is null or (installment_number is not null and installment_number > 0)
  )
);

create table transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  category_id uuid not null references categories(id),
  subcategory_id uuid references subcategories(id),
  amount numeric(15,2) not null check (amount <> 0),
  created_at timestamptz not null default now()
);

create table transaction_tags (
  transaction_id uuid not null references transactions(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

-- Índices (ERD §72)
create index idx_transactions_household on transactions(household_id);
create index idx_transactions_profile on transactions(profile_id);
create index idx_transactions_date on transactions(transaction_date);
create index idx_transactions_category on transactions(category_id);
create index idx_transactions_account on transactions(account_id);
create index idx_transactions_credit_card on transactions(credit_card_id);
create index idx_transactions_external_id on transactions(external_id);
create index idx_transactions_dedup_hash on transactions(deduplication_hash);
create index idx_transactions_import on transactions(import_id);
create index idx_transaction_splits_transaction on transaction_splits(transaction_id);
create index idx_installment_plans_household on installment_plans(household_id);
create index idx_recurring_household on recurring_transactions(household_id);

-- ERD §25 / master prompt §9: "a soma dos splits deve corresponder ao total da transação".
-- Constraint trigger deferrable: permite inserir múltiplos splits na mesma transação SQL
-- e só valida no commit.
create or replace function validate_transaction_splits()
returns trigger
language plpgsql
as $$
declare
  v_transaction_id uuid;
  v_total numeric(15,2);
  v_splits_sum numeric(15,2);
begin
  v_transaction_id := coalesce(new.transaction_id, old.transaction_id);
  select amount into v_total from transactions where id = v_transaction_id;

  if v_total is null then
    return null; -- transação removida em cascata
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

create constraint trigger trg_validate_transaction_splits
  after insert or update or delete on transaction_splits
  deferrable initially deferred
  for each row execute function validate_transaction_splits();
