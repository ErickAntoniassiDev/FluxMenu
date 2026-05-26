-- FluxMenu initial Supabase schema
-- This file creates the first database structure only.
-- It intentionally does not enable auth flows, realtime, or complete RLS policies yet.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- updated_at trigger helper
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Core tenant and user tables
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_unique unique (email)
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status text not null default 'active',
  owner_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_slug_unique unique (slug),
  constraint restaurants_status_check check (status in ('active', 'inactive', 'suspended'))
);

create table if not exists public.restaurant_settings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  display_name text not null,
  rating_label text,
  delivery_estimate text,
  address text,
  instagram text,
  phone text,
  logo_url text,
  primary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_settings_restaurant_unique unique (restaurant_id)
);

create table if not exists public.restaurant_members (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_members_unique unique (restaurant_id, profile_id),
  constraint restaurant_members_role_check check (role in ('owner', 'manager', 'kitchen', 'cashier', 'waiter', 'customer'))
);

-- -----------------------------------------------------------------------------
-- SaaS plans and subscriptions
-- -----------------------------------------------------------------------------

create table if not exists public.plans (
  id text primary key,
  name text not null,
  price_cents integer not null,
  currency text not null default 'BRL',
  billing_period text not null default 'monthly',
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_id_check check (id in ('starter', 'pro', 'premium')),
  constraint plans_price_check check (price_cents >= 0),
  constraint plans_currency_check check (currency = 'BRL'),
  constraint plans_billing_period_check check (billing_period in ('monthly'))
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  plan_id text not null references public.plans(id) on update cascade,
  status text not null default 'trialing',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  provider text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_status_check check (status in ('trialing', 'active', 'past_due', 'canceled'))
);

-- -----------------------------------------------------------------------------
-- Catalog and tables
-- -----------------------------------------------------------------------------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  slug text not null,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_restaurant_slug_unique unique (restaurant_id, slug),
  constraint categories_id_restaurant_unique unique (id, restaurant_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null,
  name text not null,
  description text,
  price numeric(10, 2) not null,
  image_url text,
  prep_time_minutes integer not null default 15,
  available boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_id_restaurant_unique unique (id, restaurant_id),
  constraint products_category_restaurant_fk foreign key (category_id, restaurant_id) references public.categories(id, restaurant_id) on delete restrict,
  constraint products_price_check check (price >= 0),
  constraint products_prep_time_check check (prep_time_minutes >= 0)
);

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  label text not null,
  slug text not null,
  active boolean not null default true,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_tables_restaurant_slug_unique unique (restaurant_id, slug),
  constraint restaurant_tables_id_restaurant_unique unique (id, restaurant_id)
);

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_code text not null,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid,
  table_label_snapshot text not null,
  status text not null default 'novo',
  priority text not null default 'media',
  notes text,
  subtotal numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  payment_status text not null default 'pendente',
  payment_method text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check check (status in ('novo', 'preparo', 'pronto', 'entregue', 'cancelado')),
  constraint orders_priority_check check (priority in ('baixa', 'media', 'alta', 'urgente')),
  constraint orders_payment_status_check check (payment_status in ('pendente', 'pago', 'parcial', 'cancelado')),
  constraint orders_id_restaurant_unique unique (id, restaurant_id),
  constraint orders_table_restaurant_fk foreign key (table_id, restaurant_id) references public.restaurant_tables(id, restaurant_id) on delete restrict,
  constraint orders_payment_method_check check (payment_method is null or payment_method in ('pix', 'credito', 'debito', 'dinheiro')),
  constraint orders_subtotal_check check (subtotal >= 0),
  constraint orders_total_check check (total >= 0)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id uuid not null,
  product_id uuid,
  product_name_snapshot text not null,
  unit_price_snapshot numeric(10, 2) not null,
  quantity integer not null,
  observation text,
  total numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_order_restaurant_fk foreign key (order_id, restaurant_id) references public.orders(id, restaurant_id) on delete cascade,
  constraint order_items_product_restaurant_fk foreign key (product_id, restaurant_id) references public.products(id, restaurant_id) on delete restrict,
  constraint order_items_unit_price_check check (unit_price_snapshot >= 0),
  constraint order_items_quantity_check check (quantity > 0),
  constraint order_items_total_check check (total >= 0)
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index if not exists idx_restaurants_status on public.restaurants(status);

create index if not exists idx_plans_active on public.plans(active);

create index if not exists idx_subscriptions_restaurant on public.subscriptions(restaurant_id);
create index if not exists idx_subscriptions_plan on public.subscriptions(plan_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);
create unique index if not exists idx_subscriptions_one_current_per_restaurant
  on public.subscriptions(restaurant_id)
  where status in ('trialing', 'active', 'past_due');

create index if not exists idx_profiles_email on public.profiles(email);

create index if not exists idx_restaurant_members_profile on public.restaurant_members(profile_id);
create index if not exists idx_restaurant_members_restaurant on public.restaurant_members(restaurant_id);
create index if not exists idx_restaurant_members_role on public.restaurant_members(role);

create index if not exists idx_categories_restaurant_active_sort on public.categories(restaurant_id, active, sort_order);

create index if not exists idx_products_restaurant_active_available on public.products(restaurant_id, active, available);
create index if not exists idx_products_restaurant_category on public.products(restaurant_id, category_id);

create index if not exists idx_restaurant_tables_restaurant_active on public.restaurant_tables(restaurant_id, active);

create index if not exists idx_orders_restaurant_status_created on public.orders(restaurant_id, status, created_at desc);
create index if not exists idx_orders_restaurant_payment on public.orders(restaurant_id, payment_status);
create index if not exists idx_orders_restaurant_table_payment on public.orders(restaurant_id, table_id, payment_status);
create index if not exists idx_orders_restaurant_public_code on public.orders(restaurant_id, public_code);

create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_restaurant_created on public.order_items(restaurant_id, created_at desc);
create index if not exists idx_order_items_product on public.order_items(product_id);

-- -----------------------------------------------------------------------------
-- Initial SaaS plans
-- Prices are stored in cents: 99 BRL = 9900.
-- -----------------------------------------------------------------------------

insert into public.plans (id, name, price_cents, currency, billing_period, features, limits, active)
values
  (
    'starter',
    'Starter',
    9900,
    'BRL',
    'monthly',
    '{"analytics": false, "ai": false, "multiple_units": false, "multi_user_rbac": false, "remove_fluxmenu_branding": false, "advanced_customization": false, "advanced_permissions": false}'::jsonb,
    '{"maxProducts": -1, "maxTables": -1, "maxStaffUsers": 1, "maxOrdersPerMonth": -1, "maxRestaurants": 1}'::jsonb,
    true
  ),
  (
    'pro',
    'Pro',
    19900,
    'BRL',
    'monthly',
    '{"analytics": true, "ai": false, "multiple_units": false, "multi_user_rbac": true, "remove_fluxmenu_branding": true, "advanced_customization": false, "advanced_permissions": false}'::jsonb,
    '{"maxProducts": -1, "maxTables": -1, "maxStaffUsers": 15, "maxOrdersPerMonth": -1, "maxRestaurants": 1}'::jsonb,
    true
  ),
  (
    'premium',
    'Premium',
    39900,
    'BRL',
    'monthly',
    '{"analytics": true, "ai": true, "multiple_units": true, "multi_user_rbac": true, "remove_fluxmenu_branding": true, "advanced_customization": true, "advanced_permissions": true}'::jsonb,
    '{"maxProducts": -1, "maxTables": -1, "maxStaffUsers": -1, "maxOrdersPerMonth": -1, "maxRestaurants": 10}'::jsonb,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  billing_period = excluded.billing_period,
  features = excluded.features,
  limits = excluded.limits,
  active = excluded.active,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_restaurants_updated_at on public.restaurants;
create trigger trg_restaurants_updated_at
before update on public.restaurants
for each row execute function public.set_updated_at();

drop trigger if exists trg_restaurant_settings_updated_at on public.restaurant_settings;
create trigger trg_restaurant_settings_updated_at
before update on public.restaurant_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_restaurant_members_updated_at on public.restaurant_members;
create trigger trg_restaurant_members_updated_at
before update on public.restaurant_members
for each row execute function public.set_updated_at();

drop trigger if exists trg_plans_updated_at on public.plans;
create trigger trg_plans_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_restaurant_tables_updated_at on public.restaurant_tables;
create trigger trg_restaurant_tables_updated_at
before update on public.restaurant_tables
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_order_items_updated_at on public.order_items;
create trigger trg_order_items_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();
