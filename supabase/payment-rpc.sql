-- FluxMenu cashier payment RPC and payment logs
-- Run after supabase/schema.sql and supabase/rls-policies.sql.
-- This implements real table closing without a payment gateway.

create table if not exists public.payment_logs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_label_snapshot text not null,
  amount numeric(10, 2) not null,
  subtotal numeric(10, 2) not null default 0,
  service_tax numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  payment_method text not null,
  items_count integer not null default 0,
  order_ids uuid[] not null default '{}',
  order_public_codes text[] not null default '{}',
  operator_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint payment_logs_amount_check check (amount >= 0),
  constraint payment_logs_subtotal_check check (subtotal >= 0),
  constraint payment_logs_service_tax_check check (service_tax >= 0),
  constraint payment_logs_discount_check check (discount >= 0),
  constraint payment_logs_items_count_check check (items_count >= 0),
  constraint payment_logs_payment_method_check check (payment_method in ('pix', 'credito', 'debito', 'dinheiro'))
);

create index if not exists idx_payment_logs_restaurant_created on public.payment_logs(restaurant_id, created_at desc);
create index if not exists idx_payment_logs_restaurant_method on public.payment_logs(restaurant_id, payment_method);

alter table public.payment_logs enable row level security;

grant select on public.payment_logs to authenticated;
grant execute on function public.set_updated_at() to authenticated;

drop policy if exists payment_logs_select_member on public.payment_logs;

create policy payment_logs_select_member
on public.payment_logs
for select
to authenticated
using (public.is_active_member(restaurant_id));

create or replace function public.close_table_payment(
  p_restaurant_id uuid,
  p_table_label text,
  p_payment_method text,
  p_service_tax numeric default 0,
  p_discount_amount numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log public.payment_logs%rowtype;
  v_order_ids uuid[];
  v_public_codes text[];
  v_subtotal numeric(10, 2);
  v_items_count integer;
  v_service_tax numeric(10, 2) := coalesce(p_service_tax, 0);
  v_discount numeric(10, 2) := coalesce(p_discount_amount, 0);
  v_total numeric(10, 2);
begin
  if auth.uid() is null then
    raise exception 'Usuário autenticado obrigatório.';
  end if;

  if not public.has_restaurant_role(p_restaurant_id, array['owner', 'manager', 'cashier']) then
    raise exception 'Usuário sem permissão para fechar mesa.';
  end if;

  if p_payment_method not in ('pix', 'credito', 'debito', 'dinheiro') then
    raise exception 'Forma de pagamento inválida.';
  end if;

  if p_table_label is null or length(trim(p_table_label)) = 0 then
    raise exception 'Mesa obrigatória.';
  end if;

  if v_service_tax < 0 or v_discount < 0 then
    raise exception 'Ajustes financeiros inválidos.';
  end if;

  select
    array_agg(o.id order by o.created_at),
    array_agg(o.public_code order by o.created_at),
    coalesce(sum(o.total), 0),
    coalesce(sum((select coalesce(sum(oi.quantity), 0) from public.order_items oi where oi.order_id = o.id)), 0)
  into v_order_ids, v_public_codes, v_subtotal, v_items_count
  from public.orders o
  where o.restaurant_id = p_restaurant_id
    and o.table_label_snapshot = trim(p_table_label)
    and o.payment_status <> 'pago'
    and o.status <> 'cancelado';

  if v_order_ids is null or array_length(v_order_ids, 1) = 0 then
    raise exception 'Não há pedidos abertos para esta mesa.';
  end if;

  if v_discount > (v_subtotal + v_service_tax) then
    raise exception 'Desconto maior que o total.';
  end if;

  v_total := v_subtotal + v_service_tax - v_discount;

  insert into public.payment_logs (
    restaurant_id,
    table_label_snapshot,
    amount,
    subtotal,
    service_tax,
    discount,
    payment_method,
    items_count,
    order_ids,
    order_public_codes,
    operator_profile_id
  ) values (
    p_restaurant_id,
    trim(p_table_label),
    v_total,
    v_subtotal,
    v_service_tax,
    v_discount,
    p_payment_method,
    v_items_count,
    v_order_ids,
    v_public_codes,
    auth.uid()
  ) returning * into v_log;

  update public.orders
  set
    payment_status = 'pago',
    payment_method = p_payment_method,
    status = 'entregue',
    paid_at = now(),
    updated_at = now()
  where id = any(v_order_ids)
    and restaurant_id = p_restaurant_id
    and payment_status <> 'pago';

  return jsonb_build_object(
    'id', v_log.id,
    'restaurant_id', v_log.restaurant_id,
    'table_label_snapshot', v_log.table_label_snapshot,
    'amount', v_log.amount,
    'subtotal', v_log.subtotal,
    'service_tax', v_log.service_tax,
    'discount', v_log.discount,
    'payment_method', v_log.payment_method,
    'items_count', v_log.items_count,
    'order_public_codes', v_log.order_public_codes,
    'operator_profile_id', v_log.operator_profile_id,
    'created_at', v_log.created_at
  );
end;
$$;

grant execute on function public.close_table_payment(uuid, text, text, numeric, numeric) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'payment_logs'
  ) then
    alter publication supabase_realtime add table public.payment_logs;
  end if;
end;
$$;

notify pgrst, 'reload schema';
