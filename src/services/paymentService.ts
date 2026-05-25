import { logDataSource, logSupabaseFallback } from '../lib/supabase/client';
import * as PaymentSupabaseRepository from '../repositories/supabase/paymentSupabaseRepository';
import { Order, PaymentLog, RestaurantId } from '../types';

export type PaymentMethod = 'pix' | 'credito' | 'debito' | 'dinheiro';
export type DataSource = 'supabase' | 'fallback';

export interface PaymentLogsLoadResult {
  paymentLogs: PaymentLog[];
  source: DataSource;
}

export interface CloseTablePaymentInput {
  restaurantId: RestaurantId;
  table: string;
  paymentMethod: PaymentMethod;
  serviceTax: number;
  discount: number;
}

export function getPaymentLogsForRestaurant(paymentLogs: PaymentLog[], restaurantId: RestaurantId): PaymentLog[] {
  return paymentLogs.filter(log => log.restaurantId === restaurantId);
}

export async function loadPaymentLogsWithFallback(restaurantId: RestaurantId, fallbackLogs: PaymentLog[] = []): Promise<PaymentLogsLoadResult> {
  try {
    const paymentLogs = await PaymentSupabaseRepository.findPaymentLogsForRestaurant(restaurantId);
    logDataSource('payment_logs', 'supabase', { restaurantId, paymentLogs: paymentLogs.length });
    return { paymentLogs, source: 'supabase' };
  } catch (error) {
    logSupabaseFallback('payment_logs', error);
  }

  const paymentLogs = getPaymentLogsForRestaurant(fallbackLogs, restaurantId);
  logDataSource('payment_logs', 'fallback', { restaurantId, paymentLogs: paymentLogs.length });
  return { paymentLogs, source: 'fallback' };
}

export async function closeTablePaymentInSupabase(input: CloseTablePaymentInput): Promise<PaymentLog> {
  if (!input.table.trim()) throw new Error('Mesa obrigatória.');
  if (!['pix', 'credito', 'debito', 'dinheiro'].includes(input.paymentMethod)) throw new Error('Forma de pagamento inválida.');
  if (input.serviceTax < 0 || input.discount < 0) throw new Error('Ajustes financeiros inválidos.');

  const log = await PaymentSupabaseRepository.closeTablePayment(input);
  logDataSource('table checkout', 'supabase', { restaurantId: input.restaurantId, table: input.table, paymentId: log.id });
  return log;
}

export function subscribeToRestaurantPayments(restaurantId: RestaurantId, onChange: () => void): () => void {
  return PaymentSupabaseRepository.subscribeToRestaurantPayments(restaurantId, onChange);
}

export function getUnpaidOrdersByTable(orders: Order[], table: string, restaurantId: RestaurantId): Order[] {
  return orders.filter(order => order.restaurantId === restaurantId && order.table === table && order.paymentStatus !== 'pago');
}

export function createPaymentLog(restaurantId: RestaurantId, table: string, unpaidOrders: Order[], paymentMethod: PaymentMethod): PaymentLog {
  return {
    id: `PAY_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
    restaurantId,
    table,
    amount: unpaidOrders.reduce((sum, order) => sum + order.total, 0),
    paymentMethod,
    timestamp: new Date().toISOString(),
    itemsCount: unpaidOrders.reduce((sum, order) =>
      sum + order.items.reduce((ordersSum, item) => ordersSum + item.quantity, 0), 0
    ),
    orders: unpaidOrders.map(order => order.id)
  };
}

export function checkoutOrders(orders: Order[], table: string, restaurantId: RestaurantId, paymentMethod: PaymentMethod): Order[] {
  return orders.map(order => {
    if (order.restaurantId === restaurantId && order.table === table && order.paymentStatus !== 'pago') {
      return {
        ...order,
        paymentStatus: 'pago',
        paymentMethod,
        status: 'entregue',
        updatedAt: new Date().toISOString()
      };
    }
    return order;
  });
}

export function ensurePaymentLogRestaurantIds(paymentLogs: PaymentLog[], restaurantId: RestaurantId): PaymentLog[] {
  return paymentLogs.map(log => ({ ...log, restaurantId: log.restaurantId ?? restaurantId }));
}
