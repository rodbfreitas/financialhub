-- 008: imports, import_rows, categorization_rules
-- Fonte: ERD §36-39 / §21 (ADR-004: dados externos passam por staging antes de transactions)

create table imports (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  created_by uuid references auth.users(id),
  source_type transaction_source not null,
  status import_status not null default 'uploaded',
  filename text not null,
  storage_path text,
  total_rows int not null default 0,
  valid_rows int not null default 0,
  duplicate_rows int not null default 0,
  error_rows int not null default 0,
  imported_rows int not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table transactions
  add constraint fk_transactions_import foreign key (import_id) references imports(id) on delete set null;

create table import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references imports(id) on delete cascade,
  raw_data jsonb not null,
  parsed_date date,
  parsed_description text,
  parsed_amount numeric(15,2),
  suggested_category_id uuid references categories(id) on delete set null,
  suggested_profile_id uuid references profiles(id) on delete set null,
  duplicate_candidate_id uuid references transactions(id) on delete set null,
  status import_row_status not null default 'pending',
  confidence_score numeric(4,3),
  validation_errors jsonb,
  created_at timestamptz not null default now()
);

create table categorization_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  match_type match_type not null default 'contains',
  match_value text not null,
  category_id uuid not null references categories(id) on delete cascade,
  subcategory_id uuid references subcategories(id) on delete set null,
  priority int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_imports_household on imports(household_id);
create index idx_import_rows_import on import_rows(import_id);
create index idx_categorization_rules_household on categorization_rules(household_id);
