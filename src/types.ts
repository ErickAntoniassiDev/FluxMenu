export type ProductCategory = 'entradas' | 'hamburgueres' | 'pizzas' | 'bebidas' | 'sobremesas';
export type MenuCategoryFilter = ProductCategory | 'todos';

export interface CategoryOption {
  id: MenuCategoryFilter;
  label: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  image: string;
  prepTimeMinutes: number; // estimated preparation time
  available?: boolean;
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
  paymentStatus?: 'pendente' | 'pago';
  paymentMethod?: 'pix' | 'credito' | 'debito' | 'dinheiro';
}

export interface PaymentLog {
  id: string;
  table: string;
  amount: number;
  paymentMethod: 'pix' | 'credito' | 'debito' | 'dinheiro';
  timestamp: string;
  itemsCount: number;
  orders: string[]; // itemized order IDs
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
  phone?: string;
}

export type UserRole = 'owner' | 'manager' | 'kitchen' | 'cashier' | 'waiter' | 'customer';

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar?: string;
}

export interface RolePermissionConfig {
  allowedModes: ('client' | 'kitchen' | 'cashier' | 'admin' | 'split')[];
  canEditProducts: boolean;
  canConfigureRestaurant: boolean;
  canManageTables: boolean;
  canProcessCheckout: boolean;
  canUpdateKDS: boolean;
  canCreateManualOrders: boolean;
  canOrderForAnyTable: boolean;
}
