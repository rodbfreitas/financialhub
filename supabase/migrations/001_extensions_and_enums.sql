-- Financial Hub Familiar — 001: extensions e enums
-- Fonte: Arquitetura Técnica & ERD v1.0

create extension if not exists "pgcrypto";

create type household_role as enum ('owner', 'admin', 'member', 'viewer');
create type household_member_status as enum ('invited', 'active', 'suspended');
create type profile_type as enum ('individual', 'shared');
create type account_type as enum ('checking', 'savings', 'wallet', 'digital', 'investment', 'other');
create type transaction_type as enum ('income', 'expense', 'transfer', 'adjustment');
create type transaction_status as enum ('posted', 'pending', 'planned', 'cancelled');
create type transaction_nature as enum ('individual', 'shared');
create type transaction_source as enum ('manual', 'csv', 'xlsx', 'ofx', 'pdf', 'open_finance', 'api', 'ai');
create type credit_card_bill_status as enum ('open', 'closed', 'paid', 'overdue');
create type recurrence_frequency as enum ('weekly', 'monthly', 'quarterly', 'semiannual', 'annual', 'custom');
create type import_status as enum ('uploaded', 'processing', 'review', 'confirmed', 'completed', 'failed', 'cancelled');
create type import_row_status as enum ('pending', 'suggested', 'confirmed', 'ignored', 'duplicate');
create type goal_status as enum ('in_progress', 'completed', 'paused', 'cancelled');
create type bank_connection_status as enum ('connected', 'syncing', 'error', 'consent_expiring', 'disconnected');
create type budget_period_type as enum ('monthly', 'custom');
create type match_type as enum ('contains', 'equals', 'starts_with', 'regex');

-- Nota: alguns enums (status de household_members, import_rows, goals, bank_connections,
-- period_type de budgets) não têm valores explicitamente listados no PRD/ERD — os valores
-- acima são uma decisão de implementação razoável e documentada, não um requisito alterado.
