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
  v_plan public.plans%rowtype;
  v_existing_owned integer;
  v_max_restaurants integer;
  v_base_slug text;
  v_slug text;
  v_suffix integer := 1;
  v_restaurant_id uuid;
  v_tables jsonb := coalesce(p_setup -> 'tables', '[]'::jsonb);
  v_categories jsonb := coalesce(p_setup -> 'categories', '[]'::jsonb);
  v_products jsonb := coalesce(p_setup -> 'products', '[]'::jsonb);
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

  -- Never trust p_plan_id for entitlements. A new restaurant starts as Starter;
  -- multi-unit limits come only from active/trialing subscriptions already owned.
  select * into v_plan
  from public.plans
  where id = 'starter'
    and active = true;

  if not found then
    raise exception 'Plano inicial indisponível.';
  end if;

  select count(*) into v_existing_owned
  from public.restaurant_members rm
  join public.restaurants r on r.id = rm.restaurant_id
  where rm.profile_id = v_profile_id
    and rm.role = 'owner'
    and rm.active = true
    and r.status = 'active';

  select coalesce(max(coalesce((p.limits ->> 'maxRestaurants')::integer, 1)), coalesce((v_plan.limits ->> 'maxRestaurants')::integer, 1))
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
    v_tables := '[{"label":"Mesa 01"},{"label":"Mesa 02"},{"label":"Mesa 03"},{"label":"Mesa 04"},{"label":"Balcão 01"}]'::jsonb;
  end if;

  if jsonb_array_length(v_categories) = 0 then
    v_categories := '[{"name":"Entradas"},{"name":"Principais"},{"name":"Bebidas"},{"name":"Sobremesas"}]'::jsonb;
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

  if not exists (select 1 from public.categories where restaurant_id = v_restaurant_id) then
    insert into public.categories (restaurant_id, slug, name, sort_order, active)
    values (v_restaurant_id, 'principais', 'Principais', 1, true);
  end if;

  v_sort := 1;
  for v_item in select * from jsonb_array_elements(v_tables) loop
    v_label := nullif(trim(coalesce(v_item ->> 'label', '')), '');
    if v_label is not null then
      v_table_slug := public.slugify(v_label);
      if v_table_slug <> '' then
        insert into public.restaurant_tables (restaurant_id, label, slug, active, sort_order)
        values (v_restaurant_id, v_label, v_table_slug, true, v_sort)
        on conflict (restaurant_id, slug) do nothing;
        v_sort := v_sort + 1;
      end if;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(v_products) loop
    v_name := nullif(trim(coalesce(v_item ->> 'name', '')), '');
    v_category_name := nullif(trim(coalesce(v_item ->> 'categoryName', '')), '');
    v_category_slug := public.slugify(coalesce(v_category_name, 'Principais'));

    select id into v_category_id
    from public.categories
    where restaurant_id = v_restaurant_id
      and slug = v_category_slug
    limit 1;

    if v_category_id is null then
      select id into v_category_id
      from public.categories
      where restaurant_id = v_restaurant_id
      order by sort_order asc, created_at asc
      limit 1;
    end if;

    if v_name is not null and v_category_id is not null then
      insert into public.products (
        restaurant_id,
        category_id,
        name,
        description,
        price,
        image_url,
        prep_time_minutes,
        available,
        active
      ) values (
        v_restaurant_id,
        v_category_id,
        v_name,
        coalesce(nullif(trim(v_item ->> 'description'), ''), 'Descrição inicial.'),
        greatest(coalesce((v_item ->> 'price')::numeric, 0), 0),
        '',
        greatest(coalesce((v_item ->> 'prepTimeMinutes')::integer, 15), 0),
        true,
        true
      );
    end if;
  end loop;

  return jsonb_build_object(
    'restaurant_id', v_restaurant_id,
    'restaurant_name', trim(p_restaurant_name),
    'restaurant_slug', v_slug,
    'plan_id', v_plan.id,
    'member_role', 'owner'
  );
end;
$$;

grant execute on function public.create_restaurant_onboarding(text, text, jsonb) to authenticated;
notify pgrst, 'reload schema';
