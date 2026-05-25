-- FluxMenu restaurant onboarding RPC
-- Run after supabase/schema.sql, supabase/seed.sql and supabase/rls-policies.sql.
-- Creates the initial tenant data for a newly authenticated owner.

create extension if not exists unaccent;

create or replace function public.slugify(input text)
returns text
language sql
stable
as $$
  select trim(both '-' from regexp_replace(lower(unaccent(coalesce(input, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.create_restaurant_onboarding(
  p_restaurant_name text,
  p_plan_id text default 'starter'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', 'owner-' || auth.uid()::text || '@fluxmenu.local');
  v_plan public.plans%rowtype;
  v_existing_owned integer;
  v_max_restaurants integer;
  v_base_slug text;
  v_slug text;
  v_suffix integer := 1;
  v_restaurant_id uuid;
begin
  if v_profile_id is null then
    raise exception 'Usuário autenticado obrigatório.';
  end if;

  if p_restaurant_name is null or length(trim(p_restaurant_name)) < 2 then
    raise exception 'Nome do restaurante obrigatório.';
  end if;

  select * into v_plan
  from public.plans
  where id = coalesce(nullif(p_plan_id, ''), 'starter')
    and active = true;

  if not found then
    select * into v_plan from public.plans where id = 'starter' and active = true;
  end if;

  if not found then
    raise exception 'Plano inicial indisponível.';
  end if;

  v_max_restaurants := coalesce((v_plan.limits ->> 'maxRestaurants')::integer, 1);

  select count(*) into v_existing_owned
  from public.restaurant_members rm
  join public.restaurants r on r.id = rm.restaurant_id
  where rm.profile_id = v_profile_id
    and rm.role = 'owner'
    and rm.active = true
    and r.status = 'active';

  if v_max_restaurants >= 0 and v_existing_owned >= v_max_restaurants then
    raise exception 'Limite de restaurantes atingido para o plano inicial.';
  end if;

  insert into public.profiles (id, name, email)
  values (
    v_profile_id,
    split_part(v_email, '@', 1),
    v_email
  )
  on conflict (id) do update set
    name = coalesce(public.profiles.name, excluded.name),
    email = excluded.email,
    updated_at = now();

  v_base_slug := public.slugify(p_restaurant_name);
  if v_base_slug = '' then
    v_base_slug := 'restaurante';
  end if;
  v_slug := v_base_slug;

  while exists (select 1 from public.restaurants where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.restaurants (name, slug, status, owner_profile_id)
  values (trim(p_restaurant_name), v_slug, 'active', v_profile_id)
  returning id into v_restaurant_id;

  insert into public.restaurant_settings (
    restaurant_id,
    display_name,
    rating_label,
    delivery_estimate,
    address,
    instagram,
    phone,
    primary_color
  ) values (
    v_restaurant_id,
    trim(p_restaurant_name),
    '5.0',
    '15-25 min',
    '',
    '',
    null,
    '#dc2626'
  );

  insert into public.subscriptions (
    restaurant_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    provider,
    provider_subscription_id
  ) values (
    v_restaurant_id,
    v_plan.id,
    'active',
    now(),
    now() + interval '30 days',
    'onboarding',
    'onboarding_' || v_restaurant_id::text
  );

  insert into public.restaurant_members (restaurant_id, profile_id, role, active)
  values (v_restaurant_id, v_profile_id, 'owner', true);

  insert into public.categories (restaurant_id, slug, name, sort_order, active)
  values
    (v_restaurant_id, 'entradas', 'Entradas', 1, true),
    (v_restaurant_id, 'principais', 'Principais', 2, true),
    (v_restaurant_id, 'bebidas', 'Bebidas', 3, true),
    (v_restaurant_id, 'sobremesas', 'Sobremesas', 4, true);

  insert into public.restaurant_tables (restaurant_id, label, slug, active, sort_order)
  values
    (v_restaurant_id, 'Mesa 01', 'mesa-01', true, 1),
    (v_restaurant_id, 'Mesa 02', 'mesa-02', true, 2),
    (v_restaurant_id, 'Mesa 03', 'mesa-03', true, 3),
    (v_restaurant_id, 'Mesa 04', 'mesa-04', true, 4),
    (v_restaurant_id, 'Balcão 01', 'balcao-01', true, 5);

  return jsonb_build_object(
    'restaurant_id', v_restaurant_id,
    'restaurant_name', trim(p_restaurant_name),
    'restaurant_slug', v_slug,
    'plan_id', v_plan.id,
    'member_role', 'owner'
  );
end;
$$;

grant execute on function public.create_restaurant_onboarding(text, text) to authenticated;
notify pgrst, 'reload schema';
