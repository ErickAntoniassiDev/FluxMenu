-- FluxMenu Asaas SaaS billing
-- Run after schema.sql and rls-policies.sql.

alter table public.subscriptions
  add column if not exists provider_customer_id text,
  add column if not exists billing_status text not null default 'trialing',
  add column if not exists last_payment_status text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists canceled_at timestamptz,
  add column if not exists external_reference text,
  add column if not exists checkout_url text;

alter table public.subscriptions
  drop constraint if exists subscriptions_billing_status_check;

alter table public.subscriptions
  add constraint subscriptions_billing_status_check check (billing_status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete'));

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null default 'asaas',
  provider_payment_id text not null,
  provider_subscription_id text,
  event_id text,
  status text not null,
  billing_type text,
  value numeric(10, 2) not null default 0,
  net_value numeric(10, 2),
  due_date date,
  paid_at timestamptz,
  invoice_url text,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_payments_provider_payment_unique unique (provider, provider_payment_id)
);

create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'asaas',
  provider_event_id text not null,
  event_type text not null,
  provider_subscription_id text,
  provider_payment_id text,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  processed_at timestamptz not null default now(),
  raw_event jsonb not null,
  constraint billing_events_provider_event_unique unique (provider, provider_event_id)
);

create index if not exists idx_billing_payments_restaurant_created on public.billing_payments(restaurant_id, created_at desc);
create index if not exists idx_billing_payments_subscription on public.billing_payments(subscription_id);
create index if not exists idx_billing_events_restaurant_processed on public.billing_events(restaurant_id, processed_at desc);
create unique index if not exists idx_subscriptions_restaurant_unique on public.subscriptions(restaurant_id);
create index if not exists idx_subscriptions_provider_subscription on public.subscriptions(provider, provider_subscription_id);

alter table public.billing_payments enable row level security;
alter table public.billing_events enable row level security;

grant select on public.billing_payments to authenticated;
grant select on public.billing_events to authenticated;

drop policy if exists billing_payments_select_member on public.billing_payments;
drop policy if exists billing_events_select_manager on public.billing_events;

create policy billing_payments_select_member
on public.billing_payments
for select
to authenticated
using (public.is_active_member(restaurant_id));

create policy billing_events_select_manager
on public.billing_events
for select
to authenticated
using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

-- Do not grant insert/update/delete to frontend roles. Edge Functions use service role.
notify pgrst, 'reload schema';
