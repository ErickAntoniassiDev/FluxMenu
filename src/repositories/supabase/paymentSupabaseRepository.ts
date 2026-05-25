import { callSupabaseRpc, getSupabaseRealtimeClient, selectFromSupabase } from '../../lib/supabase/client';
import { PaymentLog, RestaurantId } from '../../types';
import type { PaymentMethod } from '../../services/paymentService';

export type CloseTablePaymentInput = {
  restaurantId: RestaurantId;
  table: string;
  paymentMethod: PaymentMethod;
  serviceTax: number;
  discount: number;
};

type SupabasePaymentLogRow = {
  id: string;
  restaurant_id: string;
  table_label_snapshot: string;
  amount: number | string;
  payment_method: PaymentMethod;
  items_count: number;
  order_public_codes?: string[] | null;
  order_ids?: string[] | null;
  operator_profile_id?: string | null;
  created_at: string;
};

function toPaymentLog(row: SupabasePaymentLogRow): PaymentLog {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    table: row.table_label_snapshot,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    timestamp: row.created_at,
    itemsCount: row.items_count,
    orders: row.order_public_codes ?? row.order_ids ?? [],
    operatorId: row.operator_profile_id ?? undefined
  };
}

export async function findPaymentLogsForRestaurant(restaurantId: RestaurantId): Promise<PaymentLog[]> {
  const rows = await selectFromSupabase<SupabasePaymentLogRow>(
    'payment_logs',
    'select=*&restaurant_id=eq.' + encodeURIComponent(restaurantId) + '&order=created_at.desc'
  );
  return rows.map(toPaymentLog);
}

export async function closeTablePayment(input: CloseTablePaymentInput): Promise<PaymentLog> {
  const log = await callSupabaseRpc<SupabasePaymentLogRow>('close_table_payment', {
    p_restaurant_id: input.restaurantId,
    p_table_label: input.table,
    p_payment_method: input.paymentMethod,
    p_service_tax: input.serviceTax,
    p_discount_amount: input.discount
  });

  return toPaymentLog(log);
}

export function subscribeToRestaurantPayments(restaurantId: RestaurantId, onChange: () => void): () => void {
  const client = getSupabaseRealtimeClient();
  const channel = client
    .channel('payment_logs:' + restaurantId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_logs', filter: 'restaurant_id=eq.' + restaurantId }, onChange)
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
