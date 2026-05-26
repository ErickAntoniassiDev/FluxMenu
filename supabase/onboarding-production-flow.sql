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


alter table public.restaurants
  add column if not exists slug_locked boolean not null default true,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_step integer not null default 0;

alter table public.restaurant_settings
  add column if not exists banner_url text,
  add column if not exists secondary_color text,
  add column if not exists opening_hours jsonb not null default '{}'::jsonb,
  add column if not exists operation_type text;

create or replace function public.create_restaurant_onboarding(
  p_restaurant_name text,
  p_plan_id text default 'starter',
  p_setup jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', 'owner-' || auth.uid()::text || '@fluxmenu.local');
  v_existing_owned integer;
  v_max_restaurants integer := 1;
  v_base_slug text;
  v_restaurant_id uuid;
  v_tables jsonb := coalesce(p_setup -> 'tables', '[]'::jsonb);
  v_categories jsonb := coalesce(p_setup -> 'categories', '[]'::jsonb);
  v_products jsonb := coalesce(p_setup -> 'products', '[]'::jsonb);
  v_opening_hours jsonb := coalesce(p_setup -> 'openingHours', '{}'::jsonb);
  v_item jsonb;
  v_label text;
  v_name text;
  v_category_name text;
  v_category_slug text;
  v_table_slug text;
  v_category_id uuid;
  v_sort integer := 1;
begin
  if v_profile_id is null then
    raise exception 'Usuário autenticado obrigatório.';
  end if;

  if p_restaurant_name is null or length(trim(p_restaurant_name)) < 2 then
    raise exception 'Nome do restaurante obrigatório.';
  end if;

  v_base_slug := public.slugify(p_restaurant_name);
  if v_base_slug = '' then
    raise exception 'Nome gera um link público inválido.';
  end if;

  if exists (select 1 from public.restaurants where slug = v_base_slug) then
    raise exception 'Já existe restaurante com este nome/link público. Escolha outro nome oficial.';
  end if;

  select count(*) into v_existing_owned
  from public.restaurant_members rm
  join public.restaurants r on r.id = rm.restaurant_id
  where rm.profile_id = v_profile_id
    and rm.role = 'owner'
    and rm.active = true
    and r.status = 'active';

  select coalesce(max(coalesce((p.limits ->> 'maxRestaurants')::integer, 1)), 1)
  into v_max_restaurants
  from public.restaurant_members rm
  join public.restaurants r on r.id = rm.restaurant_id
  join public.subscriptions s on s.restaurant_id = r.id and s.status in ('trialing', 'active')
  join public.plans p on p.id = s.plan_id and p.active = true
  where rm.profile_id = v_profile_id
    and rm.role = 'owner'
    and rm.active = true
    and r.status = 'active';

  if v_max_restaurants >= 0 and v_existing_owned >= v_max_restaurants then
    raise exception 'Limite de restaurantes atingido para o plano atual.';
  end if;

  if jsonb_array_length(v_tables) = 0 then
    v_tables := '[{"label":"Mesa 1","slug":"mesa-1","active":true},{"label":"Mesa 2","slug":"mesa-2","active":true},{"label":"Mesa 3","slug":"mesa-3","active":true}]'::jsonb;
  end if;

  if jsonb_array_length(v_categories) = 0 then
    v_categories := '[{"name":"Principais"},{"name":"Bebidas"}]'::jsonb;
  end if;

  insert into public.profiles (id, name, email)
  values (v_profile_id, split_part(v_email, '@', 1), v_email)
  on conflict (id) do update set
    name = coalesce(public.profiles.name, excluded.name),
    email = excluded.email,
    updated_at = now();

  insert into public.restaurants (name, slug, status, owner_profile_id, slug_locked, onboarding_completed, onboarding_step)
  values (trim(p_restaurant_name), v_base_slug, 'active', v_profile_id, true, true, 6)
  returning id into v_restaurant_id;

  insert into public.restaurant_settings (
    restaurant_id, display_name, rating_label, delivery_estimate, address, instagram, phone,
    logo_url, banner_url, primary_color, secondary_color, opening_hours, operation_type
  ) values (
    v_restaurant_id,
    coalesce(nullif(trim(p_setup ->> 'publicName'), ''), trim(p_restaurant_name)),
    '5.0',
    coalesce(nullif(trim(p_setup ->> 'deliveryEstimate'), ''), '15-25 min'),
    coalesce(p_setup ->> 'address', ''),
    coalesce(nullif(trim(p_setup ->> 'instagram'), ''), ''),
    nullif(trim(coalesce(p_setup ->> 'phone', '')), ''),
    null,
    null,
    coalesce(nullif(trim(p_setup ->> 'primaryColor'), ''), '#dc2626'),
    coalesce(nullif(trim(p_setup ->> 'secondaryColor'), ''), '#0f172a'),
    v_opening_hours,
    nullif(trim(coalesce(p_setup ->> 'operationType', '')), '')
  );

  insert into public.restaurant_members (restaurant_id, profile_id, role, active)
  values (v_restaurant_id, v_profile_id, 'owner', true);

  v_sort := 1;
  for v_item in select * from jsonb_array_elements(v_categories) loop
    v_name := nullif(trim(coalesce(v_item ->> 'name', '')), '');
    if v_name is not null then
      v_category_slug := public.slugify(v_name);
      if v_category_slug <> '' then
        insert into public.categories (restaurant_id, slug, name, sort_order, active)
        values (v_restaurant_id, v_category_slug, v_name, v_sort, true)
        on conflict (restaurant_id, slug) do nothing;
        v_sort := v_sort + 1;
      end if;
    end if;
  end loop;

  v_sort := 1;
  for v_item in select * from jsonb_array_elements(v_tables) loop
    v_label := nullif(trim(coalesce(v_item ->> 'label', '')), '');
    v_table_slug := public.slugify(coalesce(nullif(trim(v_item ->> 'slug'), ''), v_label));
    if v_label is not null and v_table_slug <> '' then
      insert into public.restaurant_tables (restaurant_id, label, slug, active, sort_order)
      values (v_restaurant_id, v_label, v_table_slug, coalesce((v_item ->> 'active')::boolean, true), v_sort)
      on conflict (restaurant_id, slug) do nothing;
      v_sort := v_sort + 1;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(v_products) loop
    v_name := nullif(trim(coalesce(v_item ->> 'name', '')), '');
    v_category_name := nullif(trim(coalesce(v_item ->> 'categoryName', '')), '');
    v_category_slug := public.slugify(coalesce(v_category_name, 'Principais'));
    select id into v_category_id from public.categories where restaurant_id = v_restaurant_id and slug = v_category_slug limit 1;
    if v_category_id is null then
      select id into v_category_id from public.categories where restaurant_id = v_restaurant_id order by sort_order asc, created_at asc limit 1;
    end if;
    if v_name is not null and v_category_id is not null then
      insert into public.products (restaurant_id, category_id, name, description, price, image_url, prep_time_minutes, available, active)
      values (v_restaurant_id, v_category_id, v_name, coalesce(nullif(trim(v_item ->> 'description'), ''), 'Descrição inicial.'), greatest(coalesce((v_item ->> 'price')::numeric, 0), 0), '', greatest(coalesce((v_item ->> 'prepTimeMinutes')::integer, 15), 0), true, true);
    end if;
  end loop;

  return jsonb_build_object(
    'restaurant_id', v_restaurant_id,
    'restaurant_name', trim(p_restaurant_name),
    'restaurant_slug', v_base_slug,
    'plan_id', coalesce(nullif(p_plan_id, ''), 'starter'),
    'member_role', 'owner'
  );
end;
$$;

grant execute on function public.create_restaurant_onboarding(text, text, jsonb) to authenticated;
notify pgrst, 'reload schema';
