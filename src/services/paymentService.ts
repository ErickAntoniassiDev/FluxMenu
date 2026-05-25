import { Order, PaymentLog } from '../types';

export type PaymentMethod = 'pix' | 'credito' | 'debito' | 'dinheiro';

export function getUnpaidOrdersByTable(orders: Order[], table: string): Order[] {
  return orders.filter(order => order.table === table && order.paymentStatus !== 'pago');
}

export function createPaymentLog(table: string, unpaidOrders: Order[], paymentMethod: PaymentMethod): PaymentLog {
  return {
    id: `PAY_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
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

export function checkoutOrders(orders: Order[], table: string, paymentMethod: PaymentMethod): Order[] {
  return orders.map(order => {
    if (order.table === table && order.paymentStatus !== 'pago') {
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
