-- FluxMenu SaaS feature gating
-- Run after schema.sql, rls-policies.sql, asaas-billing.sql, admin-management.sql and order-rpc.sql.

begin;

create or replace function public.effective_plan_id(target_restaurant_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_plan_id text;
begin
  if target_restaurant_id is null then
    raise exception 'Restaurante obrigatório.';
  end if;

  select s.plan_id into v_plan_id
  from public.subscriptions s
  where s.restaurant_id = target_restaurant_id
    and s.status in ('trialing', 'active')
  order by s.updated_at desc nulls last, s.created_at desc nulls last
  limit 1;

  return coalesce(v_plan_id, 'starter');
end;
$$;

create or replace function public.can_use_feature(
  target_restaurant_id uuid,
  feature_key text
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_enabled boolean;
begin
  select coalesce((p.features ->> feature_key)::boolean, false) into v_enabled
  from public.plans p
  where p.id = public.effective_plan_id(target_restaurant_id)
    and p.active = true;

  return coalesce(v_enabled, false);
end;
$$;

create or replace function public.plan_limit(
  target_restaurant_id uuid,
  limit_key text
)
returns integer
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_limit integer;
begin
  select coalesce((p.limits ->> limit_key)::integer, -1) into v_limit
  from public.plans p
  where p.id = public.effective_plan_id(target_restaurant_id)
    and p.active = true;

  return coalesce(v_limit, -1);
end;
$$;

create or replace function public.assert_plan_limit(
  target_restaurant_id uuid,
  limit_key text,
  current_usage integer,
  increment_by integer default 1
)
returns void
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_limit integer;
begin
  v_limit := public.plan_limit(target_restaurant_id, limit_key);
  if v_limit >= 0 and current_usage + coalesce(increment_by, 1) > v_limit then
    raise exception 'Limite do plano atingido: % (%/%).', limit_key, current_usage, v_limit;
  end if;
end;
$$;

create or replace function public.enforce_product_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage integer;
begin
  if new.active is true and (tg_op = 'INSERT' or old.active is not true) then
    select count(*) into v_usage
    from public.products p
    where p.restaurant_id = new.restaurant_id
      and p.active = true
      and (tg_op = 'INSERT' or p.id <> new.id);

    perform public.assert_plan_limit(new.restaurant_id, 'maxProducts', v_usage, 1);
  end if;
  return new;
end;
$$;

drop trigger if exists products_plan_limit_trigger on public.products;
create trigger products_plan_limit_trigger
before insert or update of active on public.products
for each row execute function public.enforce_product_plan_limit();

create or replace function public.enforce_table_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage integer;
begin
  if new.active is true and (tg_op = 'INSERT' or old.active is not true) then
    select count(*) into v_usage
    from public.restaurant_tables t
    where t.restaurant_id = new.restaurant_id
      and t.active = true
      and (tg_op = 'INSERT' or t.id <> new.id);

    perform public.assert_plan_limit(new.restaurant_id, 'maxTables', v_usage, 1);
  end if;
  return new;
end;
$$;

drop trigger if exists restaurant_tables_plan_limit_trigger on public.restaurant_tables;
create trigger restaurant_tables_plan_limit_trigger
before insert or update of active on public.restaurant_tables
for each row execute function public.enforce_table_plan_limit();

create or replace function public.enforce_staff_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage integer;
begin
  if new.active is true
    and new.role <> 'customer'
    and (tg_op = 'INSERT' or old.active is not true or old.role = 'customer')
  then
    select count(*) into v_usage
    from public.restaurant_members rm
    where rm.restaurant_id = new.restaurant_id
      and rm.active = true
      and rm.role <> 'customer'
      and (tg_op = 'INSERT' or rm.id <> new.id);

    perform public.assert_plan_limit(new.restaurant_id, 'maxStaffUsers', v_usage, 1);
  end if;
  return new;
end;
$$;

drop trigger if exists restaurant_members_plan_limit_trigger on public.restaurant_members;
create trigger restaurant_members_plan_limit_trigger
before insert or update of active, role on public.restaurant_members
for each row execute function public.enforce_staff_plan_limit();

create or replace function public.enforce_staff_invitation_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage integer;
begin
  if new.status = 'pending' then
    if not public.can_use_feature(new.restaurant_id, 'multi_user_rbac') then
      raise exception 'Gestão de equipe está disponível a partir do plano Pro.';
    end if;

    select
      (select count(*) from public.restaurant_members rm where rm.restaurant_id = new.restaurant_id and rm.active = true and rm.role <> 'customer')
      +
      (select count(*) from public.staff_invitations si where si.restaurant_id = new.restaurant_id and si.status = 'pending' and (tg_op = 'INSERT' or si.id <> new.id))
    into v_usage;

    perform public.assert_plan_limit(new.restaurant_id, 'maxStaffUsers', v_usage, 1);
  end if;
  return new;
end;
$$;

drop trigger if exists staff_invitations_plan_limit_trigger on public.staff_invitations;
create trigger staff_invitations_plan_limit_trigger
before insert or update of status on public.staff_invitations
for each row execute function public.enforce_staff_invitation_plan_limit();

create or replace function public.enforce_order_monthly_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage integer;
begin
  select count(*) into v_usage
  from public.orders o
  where o.restaurant_id = new.restaurant_id
    and o.created_at >= date_trunc('month', now())
    and o.created_at < date_trunc('month', now()) + interval '1 month';

  perform public.assert_plan_limit(new.restaurant_id, 'maxOrdersPerMonth', v_usage, 1);
  return new;
end;
$$;

drop trigger if exists orders_monthly_plan_limit_trigger on public.orders;
create trigger orders_monthly_plan_limit_trigger
before insert on public.orders
for each row execute function public.enforce_order_monthly_plan_limit();

create or replace function public.enforce_restaurant_settings_feature_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and (
      new.banner_url is distinct from old.banner_url
      or new.secondary_color is distinct from old.secondary_color
      or new.opening_hours is distinct from old.opening_hours
    )
    and not public.can_use_feature(new.restaurant_id, 'advanced_customization')
  then
    raise exception 'Personalização avançada está disponível no plano Premium.';
  end if;

  return new;
end;
$$;

drop trigger if exists restaurant_settings_feature_gate_trigger on public.restaurant_settings;
create trigger restaurant_settings_feature_gate_trigger
before update on public.restaurant_settings
for each row execute function public.enforce_restaurant_settings_feature_gate();

-- Banner uploads are also gated at Storage level. Logo remains available to owner/manager.
drop policy if exists restaurant_assets_insert_member on storage.objects;
create policy restaurant_assets_insert_member
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'restaurant-assets'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['owner', 'manager'])
  and (
    storage.filename(name) not like 'banner-%'
    or public.can_use_feature((storage.foldername(name))[1]::uuid, 'advanced_customization')
  )
);

grant execute on function public.effective_plan_id(uuid) to authenticated;
grant execute on function public.can_use_feature(uuid, text) to authenticated;
grant execute on function public.plan_limit(uuid, text) to authenticated;

commit;
notify pgrst, 'reload schema';
