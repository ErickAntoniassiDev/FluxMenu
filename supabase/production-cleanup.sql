-- FluxMenu production cleanup/audit migration
-- Safe to run after schema.sql, rls-policies.sql, admin-management.sql and asaas-billing.sql.
-- It removes old billing test artifacts without deleting real restaurants/catalog data.

begin;

-- Older builds created a global unique index on subscriptions(restaurant_id), which
-- blocks canceled history rows. Keep only the partial uniqueness for current states.
drop index if exists public.idx_subscriptions_restaurant_unique;
drop index if exists public.idx_subscriptions_one_active_per_restaurant;

-- If old dev/onboarding placeholder subscriptions were accidentally applied to
-- a real project, remove only synthetic rows. Real Asaas rows are untouched.
delete from public.subscriptions
where provider in ('seed', 'onboarding')
   or provider_subscription_id like 'seed_%'
   or provider_subscription_id like 'onboarding_%';

-- Enforce a single current subscription per restaurant and preserve older current
-- duplicates as canceled history instead of deleting data.
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

create unique index if not exists idx_subscriptions_asaas_provider_subscription_unique
  on public.subscriptions(provider, provider_subscription_id)
  where provider = 'asaas' and provider_subscription_id is not null;

-- Ensure billing customer records remain one-per-restaurant and tenant scoped.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'billing_customer_data_provider_check'
      and conrelid = 'public.billing_customer_data'::regclass
  ) then
    alter table public.billing_customer_data
      add constraint billing_customer_data_provider_check check (provider in ('asaas')) not valid;
  end if;
end;
$$;

commit;

notify pgrst, 'reload schema';
