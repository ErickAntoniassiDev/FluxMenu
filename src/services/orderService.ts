import * as OrderRepository from '../repositories/orderRepository';
import { CartItem, Order, OrderItem, OrderStatus, RestaurantId } from '../types';

export function getOrders(restaurantId: RestaurantId): Order[] {
  return OrderRepository.findInitialOrders()
    .filter(order => order.restaurantId === restaurantId);
}

export function getOrdersForRestaurant(orders: Order[], restaurantId: RestaurantId): Order[] {
  return orders.filter(order => order.restaurantId === restaurantId);
}

export function createOrder(cart: CartItem[], tableNumber: string, restaurantId: RestaurantId): Order {
  const orderItems: OrderItem[] = cart.map(item => ({
    productId: item.product.id,
    name: item.product.name,
    quantity: item.quantity,
    observation: item.observation,
    price: item.product.price
  }));

  let finalPriority: Order['priority'] = 'media';
  const hasSevereNeeds = cart.some(item =>
    item.observation.toLowerCase().includes('alergia') ||
    item.observation.toLowerCase().includes('alergi') ||
    item.observation.toLowerCase().includes('restrição') ||
    item.observation.toLowerCase().includes('infantil') ||
    item.observation.toLowerCase().includes('criança')
  );

  if (hasSevereNeeds) {
    finalPriority = 'urgente';
  } else if (orderItems.some(item => item.quantity >= 3)) {
    finalPriority = 'alta';
  }

  return {
    id: generateOrderId(),
    restaurantId,
    table: tableNumber,
    items: orderItems,
    status: 'novo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    total: getCartTotal(cart),
    priority: finalPriority,
    notes: hasSevereNeeds ? '⚠️ Alertas críticos informados nas observações.' : '',
    paymentStatus: 'pendente'
  };
}

export function updateOrderStatus(orders: Order[], orderId: string, restaurantId: RestaurantId, nextStatus: OrderStatus): Order[] {
  return orders.map(order => order.id === orderId && order.restaurantId === restaurantId ? {
    ...order,
    status: nextStatus,
    updatedAt: new Date().toISOString()
  } : order);
}

export function archiveOrder(orders: Order[], orderId: string, restaurantId: RestaurantId): Order[] {
  return orders.filter(order => !(order.id === orderId && order.restaurantId === restaurantId));
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
}

export function ensureOrderRestaurantIds(orders: Order[], restaurantId: RestaurantId): Order[] {
  return orders.map(order => ({ ...order, restaurantId: order.restaurantId ?? restaurantId }));
}

function generateOrderId(): string {
  return `#${Math.floor(1000 + Math.random() * 9000).toString()}`;
}
