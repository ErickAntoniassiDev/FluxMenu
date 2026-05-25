-- FluxMenu RLS policies
-- Run after supabase/schema.sql and supabase/seed.sql.
-- No anonymous write policies are created.

-- -----------------------------------------------------------------------------
-- Helper functions
-- -----------------------------------------------------------------------------

create or replace function public.is_active_member(target_restaurant_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_members rm
    where rm.restaurant_id = target_restaurant_id
      and rm.profile_id = auth.uid()
      and rm.active = true
  );
$$;

create or replace function public.member_role(target_restaurant_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select rm.role
  from public.restaurant_members rm
  where rm.restaurant_id = target_restaurant_id
    and rm.profile_id = auth.uid()
    and rm.active = true
  limit 1;
$$;

create or replace function public.has_restaurant_role(target_restaurant_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.member_role(target_restaurant_id) = any(allowed_roles), false);
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- -----------------------------------------------------------------------------
-- Base grants
-- RLS filters rows, but roles still need schema/table privileges first.
-- -----------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.restaurants to anon;
grant select on public.restaurant_settings to anon;
grant select on public.categories to anon;
grant select on public.products to anon;
grant select on public.restaurant_tables to anon;

grant select on public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;

grant select on public.restaurants to authenticated;
grant select on public.restaurant_settings to authenticated;
grant update on public.restaurant_settings to authenticated;

grant select on public.restaurant_members to authenticated;

grant select on public.plans to authenticated;
grant select on public.subscriptions to authenticated;

grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.products to authenticated;
grant select, insert, update on public.restaurant_tables to authenticated;

grant select, insert, update on public.orders to authenticated;
grant select, insert, update on public.order_items to authenticated;

grant execute on function public.is_active_member(uuid) to authenticated;
grant execute on function public.member_role(uuid) to authenticated;
grant execute on function public.has_restaurant_role(uuid, text[]) to authenticated;

-- -----------------------------------------------------------------------------
-- Reset existing policies for repeatable dev execution
-- -----------------------------------------------------------------------------

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;

drop policy if exists restaurant_members_select_own on public.restaurant_members;
drop policy if exists restaurant_members_select_managers on public.restaurant_members;

drop policy if exists restaurants_select_member on public.restaurants;
drop policy if exists restaurants_select_public_active on public.restaurants;

drop policy if exists restaurant_settings_select_member on public.restaurant_settings;
drop policy if exists restaurant_settings_select_public_active on public.restaurant_settings;
drop policy if exists restaurant_settings_update_manager on public.restaurant_settings;

drop policy if exists plans_select_authenticated_member on public.plans;
drop policy if exists subscriptions_select_member on public.subscriptions;

drop policy if exists categories_select_member on public.categories;
drop policy if exists categories_select_public_active on public.categories;
drop policy if exists categories_insert_manager on public.categories;
drop policy if exists categories_update_manager on public.categories;

drop policy if exists products_select_member on public.products;
drop policy if exists products_select_public_active on public.products;
drop policy if exists products_insert_manager on public.products;
drop policy if exists products_update_manager on public.products;

drop policy if exists restaurant_tables_select_member on public.restaurant_tables;
drop policy if exists restaurant_tables_select_public_active on public.restaurant_tables;
drop policy if exists restaurant_tables_insert_manager on public.restaurant_tables;
drop policy if exists restaurant_tables_update_manager on public.restaurant_tables;

drop policy if exists orders_select_member on public.orders;
drop policy if exists orders_insert_staff on public.orders;
drop policy if exists orders_update_staff on public.orders;

drop policy if exists order_items_select_member on public.order_items;
drop policy if exists order_items_insert_staff on public.order_items;
drop policy if exists order_items_update_staff on public.order_items;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------

create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- restaurant_members
-- -----------------------------------------------------------------------------

create policy restaurant_members_select_own
on public.restaurant_members
for select
to authenticated
using (profile_id = auth.uid() and active = true);

create policy restaurant_members_select_managers
on public.restaurant_members
for select
to authenticated
using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

-- -----------------------------------------------------------------------------
-- restaurants and settings
-- -----------------------------------------------------------------------------

create policy restaurants_select_member
on public.restaurants
for select
to authenticated
using (public.is_active_member(id));

create policy restaurants_select_public_active
on public.restaurants
for select
to anon
using (status = 'active');

create policy restaurant_settings_select_member
on public.restaurant_settings
for select
to authenticated
using (public.is_active_member(restaurant_id));

create policy restaurant_settings_select_public_active
on public.restaurant_settings
for select
to anon
using (exists (
  select 1 from public.restaurants r
  where r.id = restaurant_settings.restaurant_id
    and r.status = 'active'
));

create policy restaurant_settings_update_manager
on public.restaurant_settings
for update
to authenticated
using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']))
with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

-- -----------------------------------------------------------------------------
-- plans/subscriptions
-- -----------------------------------------------------------------------------

create policy plans_select_authenticated_member
on public.plans
for select
to authenticated
using (exists (select 1 from public.restaurant_members rm where rm.profile_id = auth.uid() and rm.active = true));

create policy subscriptions_select_member
on public.subscriptions
for select
to authenticated
using (public.is_active_member(restaurant_id));

-- -----------------------------------------------------------------------------
-- categories/products
-- -----------------------------------------------------------------------------

create policy categories_select_member
on public.categories
for select
to authenticated
using (public.is_active_member(restaurant_id));

create policy categories_select_public_active
on public.categories
for select
to anon
using (active = true and exists (
  select 1 from public.restaurants r
  where r.id = categories.restaurant_id
    and r.status = 'active'
));

create policy categories_insert_manager
on public.categories
for insert
to authenticated
with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

create policy categories_update_manager
on public.categories
for update
to authenticated
using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']))
with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

create policy products_select_member
on public.products
for select
to authenticated
using (public.is_active_member(restaurant_id));

create policy products_select_public_active
on public.products
for select
to anon
using (active = true and available = true and exists (
  select 1 from public.restaurants r
  where r.id = products.restaurant_id
    and r.status = 'active'
));

create policy products_insert_manager
on public.products
for insert
to authenticated
with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

create policy products_update_manager
on public.products
for update
to authenticated
using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']))
with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

-- -----------------------------------------------------------------------------
-- restaurant_tables
-- -----------------------------------------------------------------------------

create policy restaurant_tables_select_member
on public.restaurant_tables
for select
to authenticated
using (public.is_active_member(restaurant_id));

create policy restaurant_tables_select_public_active
on public.restaurant_tables
for select
to anon
using (active = true and exists (
  select 1 from public.restaurants r
  where r.id = restaurant_tables.restaurant_id
    and r.status = 'active'
));

create policy restaurant_tables_insert_manager
on public.restaurant_tables
for insert
to authenticated
with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

create policy restaurant_tables_update_manager
on public.restaurant_tables
for update
to authenticated
using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']))
with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

-- -----------------------------------------------------------------------------
-- orders/order_items
-- -----------------------------------------------------------------------------

create policy orders_select_member
on public.orders
for select
to authenticated
using (public.is_active_member(restaurant_id));

create policy orders_insert_staff
on public.orders
for insert
to authenticated
with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager', 'waiter']));

create policy orders_update_staff
on public.orders
for update
to authenticated
using (public.has_restaurant_role(restaurant_id, array['owner', 'manager', 'kitchen', 'cashier', 'waiter']))
with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager', 'kitchen', 'cashier', 'waiter']));

create policy order_items_select_member
on public.order_items
for select
to authenticated
using (public.is_active_member(restaurant_id));

create policy order_items_insert_staff
on public.order_items
for insert
to authenticated
with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager', 'waiter']));

create policy order_items_update_staff
on public.order_items
for update
to authenticated
using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']))
with check (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));
