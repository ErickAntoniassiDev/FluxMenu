import { INITIAL_ORDERS } from '../data/seed';
import { Order } from '../types';

export function findInitialOrders(): Order[] {
  return INITIAL_ORDERS.map(order => ({
    ...order,
    items: order.items.map(item => ({ ...item }))
  }));
}
