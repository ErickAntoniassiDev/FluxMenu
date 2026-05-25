import { selectFromSupabase } from '../../lib/supabase/client';
import { RestaurantId } from '../../types';

type AnalyticsRange = {
  from: string;
  to: string;
};

export type AnalyticsOrderRow = {
  id: string;
  public_code: string;
  restaurant_id: string;
  table_label_snapshot: string;
  status: 'novo' | 'preparo' | 'pronto' | 'entregue' | 'cancelado';
  payment_status: 'pendente' | 'pago' | 'parcial' | 'cancelado';
  total: number | string;
  created_at: string;
  updated_at: string;
};

export type AnalyticsOrderItemRow = {
  id: string;
  restaurant_id: string;
  order_id: string;
  product_id?: string | null;
  product_name_snapshot: string;
  unit_price_snapshot: number | string;
  quantity: number;
  total: number | string;
  created_at: string;
};

export type AnalyticsPaymentLogRow = {
  id: string;
  restaurant_id: string;
  table_label_snapshot: string;
  amount: number | string;
  payment_method: 'pix' | 'credito' | 'debito' | 'dinheiro';
  items_count: number;
  created_at: string;
};

export type AnalyticsProductRow = {
  id: string;
  restaurant_id: string;
  name: string;
  active?: boolean | null;
  available?: boolean | null;
};

export type AnalyticsTableRow = {
  id: string;
  restaurant_id: string;
  label: string;
  active?: boolean | null;
};

function rangeQuery(range: AnalyticsRange): string {
  return '&created_at=gte.' + encodeURIComponent(range.from) + '&created_at=lte.' + encodeURIComponent(range.to);
}

export async function findOrders(restaurantId: RestaurantId, range: AnalyticsRange): Promise<AnalyticsOrderRow[]> {
  return selectFromSupabase<AnalyticsOrderRow>(
    'orders',
    'select=id,public_code,restaurant_id,table_label_snapshot,status,payment_status,total,created_at,updated_at&restaurant_id=eq.' + encodeURIComponent(restaurantId) + rangeQuery(range) + '&order=created_at.desc'
  );
}

export async function findOrderItems(restaurantId: RestaurantId, range: AnalyticsRange): Promise<AnalyticsOrderItemRow[]> {
  return selectFromSupabase<AnalyticsOrderItemRow>(
    'order_items',
    'select=id,restaurant_id,order_id,product_id,product_name_snapshot,unit_price_snapshot,quantity,total,created_at&restaurant_id=eq.' + encodeURIComponent(restaurantId) + rangeQuery(range) + '&order=created_at.desc'
  );
}

export async function findPaymentLogs(restaurantId: RestaurantId, range: AnalyticsRange): Promise<AnalyticsPaymentLogRow[]> {
  return selectFromSupabase<AnalyticsPaymentLogRow>(
    'payment_logs',
    'select=id,restaurant_id,table_label_snapshot,amount,payment_method,items_count,created_at&restaurant_id=eq.' + encodeURIComponent(restaurantId) + rangeQuery(range) + '&order=created_at.desc'
  );
}

export async function findProducts(restaurantId: RestaurantId): Promise<AnalyticsProductRow[]> {
  return selectFromSupabase<AnalyticsProductRow>(
    'products',
    'select=id,restaurant_id,name,active,available&restaurant_id=eq.' + encodeURIComponent(restaurantId)
  );
}

export async function findTables(restaurantId: RestaurantId): Promise<AnalyticsTableRow[]> {
  return selectFromSupabase<AnalyticsTableRow>(
    'restaurant_tables',
    'select=id,restaurant_id,label,active&restaurant_id=eq.' + encodeURIComponent(restaurantId) + '&active=eq.true'
  );
}
