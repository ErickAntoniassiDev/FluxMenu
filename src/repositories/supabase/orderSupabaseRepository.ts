import { callSupabaseRpc, getSupabaseRealtimeClient, selectFromSupabase } from '../../lib/supabase/client';
import { CartItem, Order, OrderItem, OrderStatus, RestaurantId } from '../../types';

export type CreateOrderInput = {
  restaurantId: RestaurantId;
  tableSlug: string | null;
  cart: CartItem[];
};

type SupabaseOrderRow = {
  id: string;
  public_code: string;
  restaurant_id: string;
  table_id?: string | null;
  table_label_snapshot: string;
  status: OrderStatus | 'cancelado';
  priority: Order['priority'];
  notes?: string | null;
  subtotal: number | string;
  total: number | string;
  payment_status?: 'pendente' | 'pago' | 'parcial' | 'cancelado' | null;
  payment_method?: 'pix' | 'credito' | 'debito' | 'dinheiro' | null;
  created_at: string;
  updated_at: string;
};

type SupabaseOrderItemRow = {
  id: string;
  restaurant_id: string;
  order_id: string;
  product_id?: string | null;
  product_name_snapshot: string;
  unit_price_snapshot: number | string;
  quantity: number;
  observation?: string | null;
  total: number | string;
};

type RpcOrderItem = {
  product_id?: string | null;
  product_name_snapshot: string;
  unit_price_snapshot: number | string;
  quantity: number;
  observation?: string | null;
};

type RpcOrderPayload = {
  id: string;
  public_code: string;
  restaurant_id: string;
  table_label_snapshot: string;
  status: OrderStatus;
  priority: Order['priority'];
  notes?: string | null;
  total: number | string;
  payment_status?: 'pendente' | 'pago' | 'parcial' | 'cancelado' | null;
  payment_method?: 'pix' | 'credito' | 'debito' | 'dinheiro' | null;
  created_at: string;
  updated_at: string;
  items: RpcOrderItem[];
};

function mapItems(rows: SupabaseOrderItemRow[] | RpcOrderItem[]): OrderItem[] {
  return rows.map(row => ({
    productId: row.product_id ?? '',
    name: row.product_name_snapshot,
    quantity: row.quantity,
    observation: row.observation ?? '',
    price: Number(row.unit_price_snapshot)
  }));
}

function mapOrder(row: SupabaseOrderRow, items: SupabaseOrderItemRow[]): Order {
  return {
    id: row.public_code,
    restaurantId: row.restaurant_id,
    table: row.table_label_snapshot,
    items: mapItems(items),
    status: row.status === 'cancelado' ? 'entregue' : row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    total: Number(row.total),
    priority: row.priority,
    notes: row.notes ?? '',
    paymentStatus: row.payment_status === 'pago' ? 'pago' : 'pendente',
    paymentMethod: row.payment_method ?? undefined
  };
}

function mapRpcOrder(row: RpcOrderPayload): Order {
  return {
    id: row.public_code,
    restaurantId: row.restaurant_id,
    table: row.table_label_snapshot,
    items: mapItems(row.items ?? []),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    total: Number(row.total),
    priority: row.priority,
    notes: row.notes ?? '',
    paymentStatus: row.payment_status === 'pago' ? 'pago' : 'pendente',
    paymentMethod: row.payment_method ?? undefined
  };
}

export async function findOrdersForRestaurant(restaurantId: RestaurantId): Promise<Order[]> {
  const queryRestaurant = encodeURIComponent(restaurantId);
  const [orderRows, itemRows] = await Promise.all([
    selectFromSupabase<SupabaseOrderRow>(
      'orders',
      'select=*&restaurant_id=eq.' + queryRestaurant + '&status=in.(novo,preparo,pronto,entregue)&order=created_at.desc'
    ),
    selectFromSupabase<SupabaseOrderItemRow>(
      'order_items',
      'select=*&restaurant_id=eq.' + queryRestaurant + '&order=created_at.asc'
    )
  ]);

  const itemsByOrderId = itemRows.reduce<Map<string, SupabaseOrderItemRow[]>>((acc, item) => {
    const current = acc.get(item.order_id) ?? [];
    current.push(item);
    acc.set(item.order_id, current);
    return acc;
  }, new Map());

  return orderRows.map(order => mapOrder(order, itemsByOrderId.get(order.id) ?? []));
}

export async function createOrderFromQr(input: CreateOrderInput): Promise<Order> {
  const created = await callSupabaseRpc<RpcOrderPayload>('create_order_from_qr', {
    p_restaurant_id: input.restaurantId,
    p_table_slug: input.tableSlug,
    p_items: input.cart.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
      observation: item.observation.trim() || null
    }))
  });

  return mapRpcOrder(created);
}

export async function updateOrderStatus(restaurantId: RestaurantId, publicCode: string, nextStatus: OrderStatus): Promise<Order> {
  const updated = await callSupabaseRpc<RpcOrderPayload>('update_order_status', {
    p_restaurant_id: restaurantId,
    p_public_code: publicCode,
    p_status: nextStatus
  });
  return mapRpcOrder(updated);
}

export function subscribeToRestaurantOrders(restaurantId: RestaurantId, onChange: () => void): () => void {
  const client = getSupabaseRealtimeClient();
  const channel = client
    .channel('orders:' + restaurantId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: 'restaurant_id=eq.' + restaurantId }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: 'restaurant_id=eq.' + restaurantId }, onChange)
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
