-- FluxMenu multi-tenant security hardening
-- Run after schema.sql, rls-policies.sql, order-rpc.sql and admin-management.sql.

begin;

-- Public menu data is intentionally public. Authenticated users must also be
-- able to open public QR links for restaurants where they are not staff.
drop policy if exists restaurants_select_public_active on public.restaurants;
create policy restaurants_select_public_active
on public.restaurants
for select
to anon, authenticated
using (status = 'active');

drop policy if exists restaurant_settings_select_public_active on public.restaurant_settings;
create policy restaurant_settings_select_public_active
on public.restaurant_settings
for select
to anon, authenticated
using (exists (
  select 1 from public.restaurants r
  where r.id = restaurant_settings.restaurant_id
    and r.status = 'active'
));

drop policy if exists categories_select_public_active on public.categories;
create policy categories_select_public_active
on public.categories
for select
to anon, authenticated
using (active = true and exists (
  select 1 from public.restaurants r
  where r.id = categories.restaurant_id
    and r.status = 'active'
));

drop policy if exists products_select_public_active on public.products;
create policy products_select_public_active
on public.products
for select
to anon, authenticated
using (active = true and available = true and exists (
  select 1 from public.restaurants r
  where r.id = products.restaurant_id
    and r.status = 'active'
));

drop policy if exists restaurant_tables_select_public_active on public.restaurant_tables;
create policy restaurant_tables_select_public_active
on public.restaurant_tables
for select
to anon, authenticated
using (active = true and exists (
  select 1 from public.restaurants r
  where r.id = restaurant_tables.restaurant_id
    and r.status = 'active'
));

-- Do not expose generic order mutation through PostgREST. Kitchen status
-- changes must use public.update_order_status; checkout uses close_table_payment.
revoke update on public.orders from authenticated;
revoke update on public.order_items from authenticated;

drop policy if exists orders_update_staff on public.orders;
drop policy if exists order_items_update_staff on public.order_items;

create or replace function public.update_order_status(
  p_restaurant_id uuid,
  p_public_code text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_items jsonb;
begin
  if auth.uid() is null then
    raise exception 'Usuário autenticado obrigatório.';
  end if;

  if p_restaurant_id is null then
    raise exception 'Restaurante obrigatório.';
  end if;

  if not public.has_restaurant_role(p_restaurant_id, array['owner', 'manager', 'kitchen']) then
    raise exception 'Usuário sem permissão para atualizar produção.';
  end if;

  if p_status not in ('novo', 'preparo', 'pronto', 'entregue') then
    raise exception 'Status de pedido inválido.';
  end if;

  update public.orders
  set status = p_status,
      updated_at = now()
  where restaurant_id = p_restaurant_id
    and public_code = p_public_code
    and status <> 'cancelado'
  returning * into v_order;

  if not found then
    raise exception 'Pedido não encontrado ou sem permissão.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', oi.product_id,
    'product_name_snapshot', oi.product_name_snapshot,
    'unit_price_snapshot', oi.unit_price_snapshot,
    'quantity', oi.quantity,
    'observation', oi.observation,
    'total', oi.total
  ) order by oi.created_at), '[]'::jsonb)
  into v_items
  from public.order_items oi
  where oi.restaurant_id = p_restaurant_id
    and oi.order_id = v_order.id;

  return jsonb_build_object(
    'id', v_order.id,
    'public_code', v_order.public_code,
    'restaurant_id', v_order.restaurant_id,
    'table_label_snapshot', v_order.table_label_snapshot,
    'status', v_order.status,
    'priority', v_order.priority,
    'notes', v_order.notes,
    'total', v_order.total,
    'payment_status', v_order.payment_status,
    'payment_method', v_order.payment_method,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'items', v_items
  );
end;
$$;

grant execute on function public.update_order_status(uuid, text, text) to authenticated;

-- Asset uploads are restaurant admin operations, not general staff operations.
drop policy if exists restaurant_assets_insert_member on storage.objects;
create policy restaurant_assets_insert_member
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'restaurant-assets'
  and public.has_restaurant_role((storage.foldername(name))[1]::uuid, array['owner', 'manager'])
);

commit;
notify pgrst, 'reload schema';
