-- 010: notifications, audit_logs
-- Fonte: ERD §43-44 / PRD §36

create table notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id);
create index idx_audit_logs_household on audit_logs(household_id);
create index idx_audit_logs_created_at on audit_logs(created_at);
