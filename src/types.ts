export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'entradas' | 'hamburgueres' | 'pizzas' | 'bebidas' | 'sobremesas';
  image: string;
  prepTimeMinutes: number; // estimated preparation time
}

export interface CartItem {
  product: Product;
  quantity: number;
  observation: string;
}

export type OrderStatus = 'novo' | 'preparo' | 'pronto' | 'entregue';

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  observation: string;
  price: number;
}

export interface Order {
  id: string; // e.g. #1024
  table: string; // e.g. "Mesa 08"
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  total: number;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  notes?: string;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export interface RestaurantConfig {
  name: string;
  rating: string;
  deliveryEstimate: string;
  address: string;
  instagram: string;
}
