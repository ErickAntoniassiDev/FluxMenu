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



create table if not exists public.billing_customer_data (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  provider text not null default 'asaas',
  provider_customer_id text,
  name text,
  email text,
  phone text,
  cpf_cnpj text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_billing_customer_data_provider_customer on public.billing_customer_data(provider, provider_customer_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'billing_customer_data_provider_check'
      and conrelid = 'public.billing_customer_data'::regclass
  ) then
    alter table public.billing_customer_data
      add constraint billing_customer_data_provider_check check (provider in ('asaas'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'billing_customer_data_cpf_cnpj_digits_check'
      and conrelid = 'public.billing_customer_data'::regclass
  ) then
    alter table public.billing_customer_data
      add constraint billing_customer_data_cpf_cnpj_digits_check check (cpf_cnpj is null or cpf_cnpj ~ '^[0-9]{11}$|^[0-9]{14}$');
  end if;
end;
$$;

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

-- Keep canceled subscriptions as history, but never allow more than one current
-- trialing/active/past_due subscription per restaurant.
drop index if exists public.idx_subscriptions_restaurant_unique;
drop index if exists public.idx_subscriptions_one_active_per_restaurant;

with ranked as (
  select
    id,
    row_number() over (
      partition by restaurant_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.subscriptions
  where status in ('trialing', 'active', 'past_due')
)
update public.subscriptions s
set
  status = 'canceled',
  billing_status = 'canceled',
  canceled_at = coalesce(s.canceled_at, now()),
  updated_at = now()
from ranked r
where s.id = r.id
  and r.rn > 1;

create unique index if not exists idx_subscriptions_one_current_per_restaurant
  on public.subscriptions(restaurant_id)
  where status in ('trialing', 'active', 'past_due');

create index if not exists idx_subscriptions_provider_subscription on public.subscriptions(provider, provider_subscription_id);

create unique index if not exists idx_subscriptions_asaas_provider_subscription_unique
  on public.subscriptions(provider, provider_subscription_id)
  where provider = 'asaas' and provider_subscription_id is not null;


alter table public.billing_customer_data enable row level security;

grant select on public.billing_customer_data to authenticated;

drop policy if exists billing_customer_data_select_manager on public.billing_customer_data;

create policy billing_customer_data_select_manager
on public.billing_customer_data
for select
to authenticated
using (public.has_restaurant_role(restaurant_id, array['owner', 'manager']));

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
