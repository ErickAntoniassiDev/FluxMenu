import * as OrderRepository from '../repositories/orderRepository';
import * as OrderSupabaseRepository from '../repositories/supabase/orderSupabaseRepository';
import { logDataSource, logSupabaseFallback } from '../lib/supabase/client';
import { CartItem, Order, OrderItem, OrderStatus, RestaurantId } from '../types';

export type DataSource = 'supabase' | 'fallback';

export interface OrdersLoadResult {
  orders: Order[];
  source: DataSource;
}

export function getOrders(restaurantId: RestaurantId): Order[] {
  return OrderRepository.findInitialOrders()
    .filter(order => order.restaurantId === restaurantId);
}

export function getOrdersForRestaurant(orders: Order[], restaurantId: RestaurantId): Order[] {
  return orders.filter(order => order.restaurantId === restaurantId);
}

export async function loadOrdersWithFallback(restaurantId: RestaurantId): Promise<OrdersLoadResult> {
  try {
    const orders = await OrderSupabaseRepository.findOrdersForRestaurant(restaurantId);
    logDataSource('orders', 'supabase', { restaurantId, orders: orders.length });
    return { orders, source: 'supabase' };
  } catch (error) {
    logSupabaseFallback('orders', error);
    if (import.meta.env.PROD) throw error;
  }

  const orders = getOrders(restaurantId);
  logDataSource('orders', 'fallback', { restaurantId, orders: orders.length });
  return { orders, source: 'fallback' };
}

export async function createOrderInSupabase(cart: CartItem[], tableNumber: string, restaurantId: RestaurantId): Promise<Order> {
  if (cart.length === 0) throw new Error('Carrinho vazio.');
  const invalidItem = cart.find(item => item.product.restaurantId !== restaurantId || item.quantity <= 0);
  if (invalidItem) throw new Error('O carrinho contém itens inválidos para este restaurante.');

  const order = await OrderSupabaseRepository.createOrderFromQr({
    restaurantId,
    tableSlug: tableNumber ? toSlug(tableNumber) : null,
    cart
  });
  logDataSource('order create', 'supabase', { restaurantId, orderId: order.id });
  return order;
}


export async function getPublicOrderStatuses(restaurantId: RestaurantId, publicCodes: string[]): Promise<OrderSupabaseRepository.PublicOrderStatus[]> {
  return OrderSupabaseRepository.getPublicOrderStatuses(restaurantId, publicCodes);
}


export async function cancelOrderFromKds(orderId: string, restaurantId: RestaurantId): Promise<void> {
  await OrderSupabaseRepository.cancelOrderFromKds(restaurantId, orderId);
  logDataSource('order cancel from KDS', 'supabase', { restaurantId, orderId });
}

export async function updateOrderStatusInSupabase(orderId: string, restaurantId: RestaurantId, nextStatus: OrderStatus): Promise<Order> {
  const order = await OrderSupabaseRepository.updateOrderStatus(restaurantId, orderId, nextStatus);
  logDataSource('order status update', 'supabase', { restaurantId, orderId, nextStatus });
  return order;
}

export function subscribeToRestaurantOrders(restaurantId: RestaurantId, onChange: () => void): () => void {
  return OrderSupabaseRepository.subscribeToRestaurantOrders(restaurantId, onChange);
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
    notes: hasSevereNeeds ? 'Alertas críticos informados nas observações.' : '',
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

export function upsertOrder(orders: Order[], updated: Order): Order[] {
  const exists = orders.some(order => order.id === updated.id && order.restaurantId === updated.restaurantId);
  if (!exists) return [updated, ...orders];
  return orders.map(order => order.id === updated.id && order.restaurantId === updated.restaurantId ? updated : order);
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

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateOrderId(): string {
  return `#${Math.floor(1000 + Math.random() * 9000).toString()}`;
}
