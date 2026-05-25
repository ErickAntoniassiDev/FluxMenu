import * as OrderRepository from '../repositories/orderRepository';
import { CartItem, Order, OrderItem, OrderStatus, Product, RestaurantId } from '../types';

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

export function createManualOrder(tables: string[], products: Product[], restaurantId: RestaurantId): Order | null {
  const randomTable = tables[Math.floor(Math.random() * tables.length)];
  const activeProducts = products.filter(product => product.restaurantId === restaurantId && product.available);
  if (!randomTable || activeProducts.length === 0) return null;

  const chosenProduct = activeProducts[Math.floor(Math.random() * activeProducts.length)];
  const randomItems: OrderItem[] = [
    {
      productId: chosenProduct.id,
      name: chosenProduct.name,
      quantity: Math.floor(Math.random() * 2) + 1,
      observation: Math.random() > 0.6 ? 'Sem cebola / Ponto médio' : '',
      price: chosenProduct.price
    }
  ];

  return {
    id: generateOrderId(),
    restaurantId,
    table: randomTable,
    items: randomItems,
    status: 'novo',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    total: randomItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    priority: Math.random() > 0.75 ? 'alta' : 'media',
    notes: ''
  };
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
