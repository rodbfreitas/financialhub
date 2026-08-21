-- 002: households, household_members, profiles, profile_access
-- Fonte: ERD §9-12. household_id é a principal fronteira de segurança (ADR-001).

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_currency char(3) not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role household_role not null default 'member',
  status household_member_status not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

-- User ≠ Profile (ADR-002): User acessa o sistema, Profile é a identidade financeira.
create table profiles (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  linked_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  type profile_type not null,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table profile_access (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  can_view boolean not null default true,
  can_create boolean not null default true,
  can_edit boolean not null default true,
  can_delete boolean not null default true,
  created_at timestamptz not null default now(),
  unique (profile_id, user_id)
);

create index idx_household_members_user on household_members(user_id);
create index idx_household_members_household on household_members(household_id);
create index idx_profiles_household on profiles(household_id);
create index idx_profile_access_profile on profile_access(profile_id);
create index idx_profile_access_user on profile_access(user_id);
