-- 016: convites de household (signup controlado — Prompt Mestre §31)
-- Sem isso, o único jeito de um segundo usuário entrar num household existente seria
-- um admin inserir manualmente em household_members — a policy household_members_insert
-- só permite isso a admins/owners (ou o primeiro membro, no bootstrap). Convite por
-- e-mail com token é o mecanismo real de "signup controlado" citado no Prompt Mestre,
-- sem abrir signup público.

create table household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  email text not null,
  role household_role not null default 'member',
  token uuid not null default gen_random_uuid(),
  invited_by uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  unique (token)
);

create index idx_household_invites_household on household_invites(household_id);
create index idx_household_invites_email on household_invites(lower(email));

alter table household_invites enable row level security;

-- Apenas admins/owners do household gerenciam convites (criar, ver, revogar).
create policy household_invites_admin_all on household_invites for all
  using (has_household_role(household_id, 'admin'))
  with check (has_household_role(household_id, 'admin'));

-- Preview público (sem sessão) de um convite a partir do token: nome do household e
-- e-mail convidado — nada financeiro, apenas o necessário pra tela de signup mostrar
-- "Você foi convidado para X" antes da pessoa criar a senha.
create or replace function get_invite_preview(p_token uuid)
returns table (household_name text, email text, role household_role)
language sql
security definer
set search_path = public
stable
as $$
  select h.name, hi.email, hi.role
  from household_invites hi
  join households h on h.id = hi.household_id
  where hi.token = p_token
    and hi.status = 'pending'
    and hi.expires_at > now();
$$;

grant execute on function get_invite_preview(uuid) to anon, authenticated;

-- Aceitar convite: SECURITY DEFINER porque household_members_insert não permite que
-- um usuário comum se auto-insira num household que já tem membros (só admin insere,
-- ou bootstrap de household vazio). A função valida o token, confere que o e-mail do
-- convite bate com o e-mail autenticado (auth.uid()), e só então insere a membership.
create or replace function accept_household_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite household_invites%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite
  from household_invites
  where token = p_token and status = 'pending' and expires_at > now()
  for update;

  if not found then
    raise exception 'convite inválido, expirado ou já utilizado';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  if v_email is null or lower(v_email) <> lower(v_invite.email) then
    raise exception 'este convite foi enviado para outro e-mail';
  end if;

  insert into household_members (household_id, user_id, role, status)
  values (v_invite.household_id, auth.uid(), v_invite.role, 'active')
  on conflict (household_id, user_id) do nothing;

  update household_invites set status = 'accepted', accepted_at = now() where id = v_invite.id;

  return v_invite.household_id;
end;
$$;

grant execute on function accept_household_invite(uuid) to authenticated;
revoke execute on function accept_household_invite(uuid) from anon, public;
