-- FluxMenu secure KDS order cancellation/archive
-- Run after schema.sql, rls-policies.sql, order-rpc.sql and multi-tenant-security.sql.

create or replace function public.cancel_order_from_kds(
  p_restaurant_id uuid,
  p_public_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuário autenticado obrigatório.';
  end if;

  if p_restaurant_id is null then
    raise exception 'Restaurante obrigatório.';
  end if;

  if not public.has_restaurant_role(p_restaurant_id, array['owner', 'manager', 'kitchen']) then
    raise exception 'Usuário sem permissão para remover pedido da produção.';
  end if;

  update public.orders
  set status = 'cancelado',
      updated_at = now()
  where restaurant_id = p_restaurant_id
    and public_code = p_public_code
    and status <> 'cancelado'
  returning * into v_order;

  if not found then
    raise exception 'Pedido não encontrado ou já removido.';
  end if;

  return jsonb_build_object(
    'public_code', v_order.public_code,
    'restaurant_id', v_order.restaurant_id,
    'status', v_order.status,
    'updated_at', v_order.updated_at
  );
end;
$$;

grant execute on function public.cancel_order_from_kds(uuid, text) to authenticated;
notify pgrst, 'reload schema';
