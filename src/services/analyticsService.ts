import * as AnalyticsSupabaseRepository from '../repositories/supabase/analyticsSupabaseRepository';
import { logDataSource } from '../lib/supabase/client';
import { RestaurantId } from '../types';

export type AnalyticsPeriod = 'today' | '7d' | '30d';

export type TopProductMetric = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
};

export type DashboardMetrics = {
  revenue: number;
  totalOrders: number;
  averageTicket: number;
  openTables: number;
  preparingOrders: number;
  paidOrders: number;
  pendingOrders: number;
  activeTables: number;
  activeProducts: number;
  topProducts: TopProductMetric[];
};

function getPeriodRange(period: AnalyticsPeriod): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now);

  if (period === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (period === '7d') {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
  }

  return { from: from.toISOString(), to: now.toISOString() };
}

export async function loadDashboardMetrics(restaurantId: RestaurantId, period: AnalyticsPeriod): Promise<DashboardMetrics> {
  const range = getPeriodRange(period);
  const [orders, orderItems, paymentLogs, products, tables] = await Promise.all([
    AnalyticsSupabaseRepository.findOrders(restaurantId, range),
    AnalyticsSupabaseRepository.findOrderItems(restaurantId, range),
    AnalyticsSupabaseRepository.findPaymentLogs(restaurantId, range),
    AnalyticsSupabaseRepository.findProducts(restaurantId),
    AnalyticsSupabaseRepository.findTables(restaurantId)
  ]);

  const revenue = paymentLogs.reduce((sum, log) => sum + Number(log.amount), 0);
  const paidOrders = orders.filter(order => order.payment_status === 'pago').length;
  const pendingOrders = orders.filter(order => order.payment_status !== 'pago' && order.status !== 'cancelado').length;
  const preparingOrders = orders.filter(order => order.status === 'preparo').length;
  const totalOrders = orders.length;
  const averageTicket = paymentLogs.length > 0 ? revenue / paymentLogs.length : 0;
  const openTables = new Set(
    orders
      .filter(order => order.payment_status !== 'pago' && order.status !== 'cancelado')
      .map(order => order.table_label_snapshot)
  ).size;

  const productMetrics = orderItems.reduce<Map<string, TopProductMetric>>((acc, item) => {
    const key = item.product_id ?? item.product_name_snapshot;
    const current = acc.get(key) ?? {
      productId: key,
      name: item.product_name_snapshot,
      quantity: 0,
      revenue: 0
    };
    current.quantity += item.quantity;
    current.revenue += Number(item.total);
    acc.set(key, current);
    return acc;
  }, new Map());

  const topProducts = Array.from(productMetrics.values())
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, 5);

  const metrics = {
    revenue,
    totalOrders,
    averageTicket,
    openTables,
    preparingOrders,
    paidOrders,
    pendingOrders,
    activeTables: tables.length,
    activeProducts: products.filter(product => product.active !== false).length,
    topProducts
  };

  logDataSource('dashboard analytics', 'supabase', { restaurantId, period, orders: orders.length, payments: paymentLogs.length });
  return metrics;
}
