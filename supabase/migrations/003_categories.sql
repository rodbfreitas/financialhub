-- 003: categories, subcategories, tags
-- Fonte: ERD §21-23 / PRD §11

create table categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  type transaction_type,
  icon text,
  display_order int not null default 0,
  is_system boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tags (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (household_id, name)
);

create index idx_categories_household on categories(household_id);
create index idx_subcategories_category on subcategories(category_id);
create index idx_tags_household on tags(household_id);
