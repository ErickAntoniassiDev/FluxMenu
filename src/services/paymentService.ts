import { Order, PaymentLog, RestaurantId } from '../types';

export type PaymentMethod = 'pix' | 'credito' | 'debito' | 'dinheiro';

export function getPaymentLogsForRestaurant(paymentLogs: PaymentLog[], restaurantId: RestaurantId): PaymentLog[] {
  return paymentLogs.filter(log => log.restaurantId === restaurantId);
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
