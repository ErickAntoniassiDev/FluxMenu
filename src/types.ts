export type ProductCategory = 'entradas' | 'hamburgueres' | 'pizzas' | 'bebidas' | 'sobremesas';
export type MenuCategoryFilter = ProductCategory | 'todos';

export type RestaurantId = string;

export type SaaSPlanId = 'starter' | 'pro' | 'premium';

export type SaaSFeature =
  | 'digital_menu'
  | 'kds'
  | 'cashier'
  | 'admin_catalog'
  | 'qr_tables'
  | 'payment_history'
  | 'manual_orders'
  | 'advanced_reports'
  | 'multi_user_rbac'
  | 'priority_support';

export type SaaSLimit =
  | 'maxProducts'
  | 'maxTables'
  | 'maxStaffUsers'
  | 'maxOrdersPerMonth'
  | 'paymentHistoryDays'
  | 'maxRestaurants';

export interface SaaSPlan {
  id: SaaSPlanId;
  name: string;
  price: number;
  currency: 'BRL';
  billingPeriod: 'monthly';
  features: Record<SaaSFeature, boolean>;
  limits: Record<SaaSLimit, number>;
}


export interface CategoryOption {
  id: MenuCategoryFilter;
  label: string;
  restaurantId: RestaurantId;
}

export interface Restaurant {
  id: RestaurantId;
  name: string;
}

export interface Product {
  id: string;
  restaurantId: RestaurantId;
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
  restaurantId: RestaurantId;
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
  restaurantId: RestaurantId;
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
  restaurantId: RestaurantId;
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
  restaurantId: RestaurantId;
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
