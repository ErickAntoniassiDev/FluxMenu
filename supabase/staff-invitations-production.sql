-- FluxMenu production staff invitations
-- Run after schema.sql, admin-management.sql and rls-policies.sql.

begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.staff_invitations
  add column if not exists token_hash text,
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days'),
  add column if not exists accepted_at timestamptz,
  add column if not exists revoked_at timestamptz;

create unique index if not exists idx_staff_invitations_token_hash
  on public.staff_invitations(token_hash)
  where token_hash is not null;

-- The original table constraint used (restaurant_id, email, status), which also
-- blocks multiple revoked/accepted historical invitations. Production only needs
-- to prevent more than one pending invite for the same restaurant/email.
alter table public.staff_invitations
  drop constraint if exists staff_invitations_unique_pending;

create unique index if not exists staff_invitations_one_pending_per_email
  on public.staff_invitations (restaurant_id, lower(email))
  where status = 'pending';

create or replace function public.accept_staff_invitation(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_token_hash text := encode(extensions.digest(coalesce(p_token, '')::text, 'sha256'), 'hex');
  v_invitation public.staff_invitations%rowtype;
  v_restaurant_name text;
  v_existing_profile_id uuid;
begin
  if v_profile_id is null then
    raise exception 'Faça login para aceitar o convite.';
  end if;

  if v_email = '' then
    raise exception 'Email autenticado não encontrado.';
  end if;

  if p_token is null or length(trim(p_token)) < 20 then
    raise exception 'Convite inválido ou incompleto.';
  end if;

  select * into v_invitation
  from public.staff_invitations si
  where si.token_hash = v_token_hash
    and lower(si.email) = v_email
    and si.status = 'pending'
    and si.expires_at > now()
  limit 1;

  if not found then
    raise exception 'Convite não encontrado, expirado ou incompatível com este email.';
  end if;

  if v_invitation.role = 'owner' then
    raise exception 'Convite inválido.';
  end if;

  select p.id into v_existing_profile_id
  from public.profiles p
  where lower(p.email) = v_email
    and p.id <> v_profile_id
  limit 1;

  if v_existing_profile_id is not null then
    if exists (
      select 1 from public.restaurant_members rm
      where rm.profile_id = v_existing_profile_id
        and rm.role = 'owner'
        and rm.active = true
    ) then
      raise exception 'Este email já pertence a um dono de restaurante. Use outro email para funcionário.';
    end if;

    delete from public.restaurant_members old_rm
    where old_rm.profile_id = v_existing_profile_id
      and old_rm.role <> 'owner'
      and exists (
        select 1 from public.restaurant_members current_rm
        where current_rm.restaurant_id = old_rm.restaurant_id
          and current_rm.profile_id = v_profile_id
      );

    update public.restaurant_members
    set profile_id = v_profile_id,
        updated_at = now()
    where profile_id = v_existing_profile_id
      and role <> 'owner';

    delete from public.profiles
    where id = v_existing_profile_id;
  end if;

  insert into public.profiles (id, name, email)
  values (v_profile_id, split_part(v_email, '@', 1), v_email)
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();

  insert into public.restaurant_members (restaurant_id, profile_id, role, active)
  values (v_invitation.restaurant_id, v_profile_id, v_invitation.role, true)
  on conflict (restaurant_id, profile_id) do update set
    role = excluded.role,
    active = true,
    updated_at = now()
  where public.restaurant_members.role <> 'owner';

  update public.staff_invitations
  set status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  where id = v_invitation.id;

  select r.name into v_restaurant_name
  from public.restaurants r
  where r.id = v_invitation.restaurant_id;

  return jsonb_build_object(
    'restaurant_id', v_invitation.restaurant_id,
    'restaurant_name', coalesce(v_restaurant_name, 'Restaurante'),
    'role', v_invitation.role,
    'status', 'accepted'
  );
end;
$$;

grant execute on function public.accept_staff_invitation(text) to authenticated;


create or replace function public.remove_staff_member(
  p_restaurant_id uuid,
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile_id uuid := auth.uid();
  v_actor_role text;
  v_member public.restaurant_members%rowtype;
  v_member_email text;
begin
  if v_actor_profile_id is null then
    raise exception 'Login obrigatório.';
  end if;

  if p_restaurant_id is null or p_member_id is null then
    raise exception 'Restaurante e funcionário são obrigatórios.';
  end if;

  select rm.role into v_actor_role
  from public.restaurant_members rm
  where rm.restaurant_id = p_restaurant_id
    and rm.profile_id = v_actor_profile_id
    and rm.active = true
    and rm.role in ('owner', 'manager')
  limit 1;

  if v_actor_role is null then
    raise exception 'Seu perfil não pode remover funcionários.';
  end if;

  select rm.* into v_member
  from public.restaurant_members rm
  where rm.id = p_member_id
    and rm.restaurant_id = p_restaurant_id
  limit 1;

  if v_member.id is null then
    raise exception 'Funcionário não encontrado.';
  end if;

  if v_member.role = 'owner' then
    raise exception 'O dono da conta não pode ser removido.';
  end if;

  if v_actor_role = 'manager' and v_member.role = 'manager' then
    raise exception 'Gerente não pode remover outro gerente.';
  end if;

  select p.email into v_member_email
  from public.profiles p
  where p.id = v_member.profile_id;

  delete from public.restaurant_members
  where id = p_member_id
    and restaurant_id = p_restaurant_id;

  if v_member_email is not null then
    update public.staff_invitations
    set status = 'revoked',
        revoked_at = now(),
        updated_at = now()
    where restaurant_id = p_restaurant_id
      and lower(email) = lower(v_member_email)
      and status = 'pending';
  end if;

  return jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'member_id', p_member_id,
    'removed', true
  );
end;
$$;

grant execute on function public.remove_staff_member(uuid, uuid) to authenticated;


create or replace function public.clear_staff_invitation(
  p_restaurant_id uuid,
  p_invitation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_profile_id uuid := auth.uid();
  v_actor_role text;
  v_invitation public.staff_invitations%rowtype;
begin
  if v_actor_profile_id is null then
    raise exception 'Login obrigatório.';
  end if;

  if p_restaurant_id is null or p_invitation_id is null then
    raise exception 'Restaurante e convite são obrigatórios.';
  end if;

  select rm.role into v_actor_role
  from public.restaurant_members rm
  where rm.restaurant_id = p_restaurant_id
    and rm.profile_id = v_actor_profile_id
    and rm.active = true
    and rm.role in ('owner', 'manager')
  limit 1;

  if v_actor_role is null then
    raise exception 'Seu perfil não pode limpar convites.';
  end if;

  select * into v_invitation
  from public.staff_invitations si
  where si.id = p_invitation_id
    and si.restaurant_id = p_restaurant_id
  limit 1;

  if v_invitation.id is null then
    raise exception 'Convite não encontrado.';
  end if;

  if v_invitation.status = 'pending' then
    raise exception 'Revogue o convite pendente antes de limpar.';
  end if;

  delete from public.staff_invitations
  where id = p_invitation_id
    and restaurant_id = p_restaurant_id
    and status <> 'pending';

  return jsonb_build_object(
    'restaurant_id', p_restaurant_id,
    'invitation_id', p_invitation_id,
    'cleared', true
  );
end;
$$;

grant execute on function public.clear_staff_invitation(uuid, uuid) to authenticated;

commit;
notify pgrst, 'reload schema';
