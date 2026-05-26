-- FluxMenu public order status tracker
-- Run after schema.sql, rls-policies.sql and order-rpc.sql.

create or replace function public.get_public_order_statuses(
  p_restaurant_id uuid,
  p_public_codes text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_restaurant_id is null then
    raise exception 'Restaurante obrigatório.';
  end if;

  if p_public_codes is null or array_length(p_public_codes, 1) is null then
    return '[]'::jsonb;
  end if;

  if array_length(p_public_codes, 1) > 10 then
    raise exception 'Limite de pedidos para acompanhamento excedido.';
  end if;

  if not exists (
    select 1 from public.restaurants r
    where r.id = p_restaurant_id
      and r.status = 'active'
  ) then
    raise exception 'Restaurante indisponível.';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'public_code', o.public_code,
      'restaurant_id', o.restaurant_id,
      'table_label_snapshot', o.table_label_snapshot,
      'status', o.status,
      'created_at', o.created_at,
      'updated_at', o.updated_at
    ) order by o.created_at desc)
    from public.orders o
    where o.restaurant_id = p_restaurant_id
      and o.public_code = any(p_public_codes)
      and o.status in ('novo', 'preparo', 'pronto', 'entregue')
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_public_order_statuses(uuid, text[]) to anon, authenticated;
notify pgrst, 'reload schema';
