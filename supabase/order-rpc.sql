-- FluxMenu secure public order creation RPC
-- Run after supabase/schema.sql, supabase/seed.sql and supabase/rls-policies.sql.
-- This lets the public menu create orders without trusting frontend prices.

create or replace function public.create_order_from_qr(
  p_restaurant_id uuid,
  p_table_slug text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restaurant public.restaurants%rowtype;
  v_table public.restaurant_tables%rowtype;
  v_order public.orders%rowtype;
  v_product public.products%rowtype;
  v_item jsonb;
  v_items_snapshot jsonb := '[]'::jsonb;
  v_quantity integer;
  v_observation text;
  v_subtotal numeric(10, 2) := 0;
  v_priority text := 'media';
  v_notes text := '';
  v_table_id uuid := null;
  v_table_label text := 'Autoatendimento';
begin
  if p_restaurant_id is null then
    raise exception 'Restaurante obrigatório.';
  end if;

  select * into v_restaurant
  from public.restaurants
  where id = p_restaurant_id
    and status = 'active';

  if not found then
    raise exception 'Restaurante indisponível.';
  end if;

  if p_table_slug is not null and length(trim(p_table_slug)) > 0 then
    select * into v_table
    from public.restaurant_tables
    where restaurant_id = p_restaurant_id
      and slug = lower(trim(p_table_slug))
      and active = true;

    if not found then
      raise exception 'Mesa inválida ou inativa.';
    end if;

    v_table_id := v_table.id;
    v_table_label := v_table.label;
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Pedido sem itens.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);
    v_observation := nullif(trim(coalesce(v_item ->> 'observation', '')), '');

    if v_quantity <= 0 then
      raise exception 'Quantidade inválida.';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid
      and restaurant_id = p_restaurant_id
      and active = true
      and available = true;

    if not found then
      raise exception 'Produto inválido ou indisponível.';
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_quantity);

    if v_quantity >= 3 and v_priority <> 'urgente' then
      v_priority := 'alta';
    end if;

    if v_observation is not null and (
      lower(v_observation) like '%alerg%'
      or lower(v_observation) like '%restri%'
      or lower(v_observation) like '%infantil%'
      or lower(v_observation) like '%crian%'
    ) then
      v_priority := 'urgente';
      v_notes := 'Alertas críticos informados nas observações.';
    end if;

    v_items_snapshot := v_items_snapshot || jsonb_build_object(
      'product_id', v_product.id,
      'product_name_snapshot', v_product.name,
      'unit_price_snapshot', v_product.price,
      'quantity', v_quantity,
      'observation', v_observation,
      'total', v_product.price * v_quantity
    );
  end loop;

  insert into public.orders (
    public_code,
    restaurant_id,
    table_id,
    table_label_snapshot,
    status,
    priority,
    notes,
    subtotal,
    total,
    payment_status
  ) values (
    '#' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
    p_restaurant_id,
    v_table_id,
    v_table_label,
    'novo',
    v_priority,
    v_notes,
    v_subtotal,
    v_subtotal,
    'pendente'
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(v_items_snapshot)
  loop
    insert into public.order_items (
      restaurant_id,
      order_id,
      product_id,
      product_name_snapshot,
      unit_price_snapshot,
      quantity,
      observation,
      total
    ) values (
      p_restaurant_id,
      v_order.id,
      (v_item ->> 'product_id')::uuid,
      v_item ->> 'product_name_snapshot',
      (v_item ->> 'unit_price_snapshot')::numeric,
      (v_item ->> 'quantity')::integer,
      nullif(v_item ->> 'observation', ''),
      (v_item ->> 'total')::numeric
    );
  end loop;

  return jsonb_build_object(
    'id', v_order.id,
    'public_code', v_order.public_code,
    'restaurant_id', v_order.restaurant_id,
    'table_label_snapshot', v_order.table_label_snapshot,
    'status', v_order.status,
    'priority', v_order.priority,
    'notes', v_order.notes,
    'total', v_order.total,
    'created_at', v_order.created_at,
    'updated_at', v_order.updated_at,
    'items', v_items_snapshot
  );
end;
$$;

grant execute on function public.create_order_from_qr(uuid, text, jsonb) to anon, authenticated;

-- Enable Postgres Changes for kitchen realtime listeners.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;
end;
$$;

-- Force PostgREST to reload function/schema metadata after creating the RPC.
notify pgrst, 'reload schema';
