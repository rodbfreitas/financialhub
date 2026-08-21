-- 011: funções centrais de autorização
-- Fonte: ERD §46-49. SECURITY DEFINER é necessário para evitar recursão de RLS ao consultar
-- household_members a partir de policies de outras tabelas.

create or replace function is_household_member(p_household_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from household_members
    where household_id = p_household_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function has_household_role(p_household_id uuid, p_required_role household_role)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from household_members
    where household_id = p_household_id
      and user_id = auth.uid()
      and status = 'active'
      and (
        p_required_role = 'viewer'
        or (p_required_role = 'member' and role in ('member', 'admin', 'owner'))
        or (p_required_role = 'admin' and role in ('admin', 'owner'))
        or (p_required_role = 'owner' and role = 'owner')
      )
  );
$$;

-- can_access_profile(): por padrão ambos os membros do household enxergam todos os
-- perfis (PRD/ERD §12: "apesar de inicialmente ambos enxergarem tudo, criaremos a
-- estrutura correta"). profile_access fica disponível para restringir no futuro sem
-- reconstrução do modelo.
create or replace function can_access_profile(p_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from profiles p
    where p.id = p_profile_id
      and is_household_member(p.household_id)
  );
$$;

grant execute on function is_household_member(uuid) to authenticated;
grant execute on function has_household_role(uuid, household_role) to authenticated;
grant execute on function can_access_profile(uuid) to authenticated;
