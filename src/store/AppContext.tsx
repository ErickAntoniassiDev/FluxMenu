import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, CartItem, Order, OrderStatus, Toast, RestaurantConfig, PaymentLog, UserSession, RolePermissionConfig, RestaurantId, SaaSFeature, SaaSLimit, SaaSPlan, SaaSPlanId } from '../types';
import { ROLE_PERMISSIONS } from '../utils/rbac';
import * as CatalogService from '../services/catalogService';
import * as OrderService from '../services/orderService';
import * as PaymentService from '../services/paymentService';
import * as RestaurantService from '../services/restaurantService';
import * as TableService from '../services/tableService';
import { getDefaultUser } from '../services/userService';
import { getDefaultRestaurantId } from '../data';
import { DEFAULT_PLAN_ID } from '../data/plans';
import * as PlanService from '../services/planService';

interface AppContextType {
  currentPlan: SaaSPlan;
  currentPlanId: SaaSPlanId;
  setCurrentPlanId: (planId: SaaSPlanId) => void;
  canUseFeature: (feature: SaaSFeature) => boolean;
  getPlanLimit: (limit: SaaSLimit) => number;
  showUpgradeNotice: (featureName: string) => void;
  activeRestaurantId: RestaurantId;
  setActiveRestaurantId: (restaurantId: RestaurantId) => void;
  products: Product[];
  orders: Order[];
  cart: CartItem[];
  tableNumber: string;
  setTableNumber: (num: string) => void;
  activeMode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split';
  setActiveMode: (mode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split') => void;
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  tick: number;
  currentUser: UserSession;
  setCurrentUser: (user: UserSession) => void;
  hasPermission: (action: keyof Omit<RolePermissionConfig, 'allowedModes'>) => boolean;
  isModeAllowed: (mode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split') => boolean;
  addToCart: (product: Product, quantity: number, observation: string) => void;
  removeFromCart: (index: number) => void;
  updateCartQuantity: (index: number, delta: number) => void;
  getCartTotal: () => number;
  confirmOrder: (onSuccess?: () => void) => Promise<void>;
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  archiveOrder: (orderId: string) => void;
  clearAllOrders: () => void;
  resetInitialOrders: () => void;
  createManualOrder: () => void;
  paymentLogs: PaymentLog[];
  checkoutTable: (table: string, paymentMethod: 'pix' | 'credito' | 'debito' | 'dinheiro') => void;
  clearPaymentHistory: () => void;
  updateProduct: (updated: Product) => void;
  addProduct: (newProd: Omit<Product, 'id' | 'restaurantId'>) => void;
  deleteProduct: (id: string) => void;
  restaurantConfig: RestaurantConfig;
  setRestaurantConfig: (config: RestaurantConfig) => void;
  tables: string[];
  addTable: (num: string) => void;
  deleteTable: (num: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
type TablesByRestaurant = Record<RestaurantId, string[]>;

function readJson<T>(key: string): T | null {
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  try { return JSON.parse(saved) as T; } catch (e) { console.error(e); return null; }
}

function mergeByRestaurantIdAndId<T extends { id: string; restaurantId: RestaurantId }>(saved: T[] | null, seed: T[]): T[] {
  const result = [...(saved ?? [])];
  seed.forEach(seedItem => {
    const exists = result.some(item => item.id === seedItem.id && item.restaurantId === seedItem.restaurantId);
    if (!exists) result.push(seedItem);
  });
  return result;
}

function mergeConfigsByRestaurantId(saved: RestaurantConfig[] | null, seed: RestaurantConfig[]): RestaurantConfig[] {
  const result = [...(saved ?? [])];
  seed.forEach(seedItem => {
    const exists = result.some(item => item.restaurantId === seedItem.restaurantId);
    if (!exists) result.push(seedItem);
  });
  return result;
}

function getSavedTablesByRestaurant(defaultRestaurantId: RestaurantId): TablesByRestaurant | null {
  const grouped = readJson<TablesByRestaurant>('flux_tables_by_restaurant');
  if (grouped) return grouped;
  const legacyTables = readJson<string[]>('flux_tables');
  if (!legacyTables) return null;
  return { [defaultRestaurantId]: legacyTables };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaultRestaurantId = getDefaultRestaurantId();
  const [currentPlanId, setCurrentPlanIdState] = useState<SaaSPlanId>(() => {
    const saved = localStorage.getItem('flux_current_plan_id') as SaaSPlanId | null;
    return saved || DEFAULT_PLAN_ID;
  });
  const currentPlan = useMemo(() => PlanService.getPlan(currentPlanId), [currentPlanId]);

  const setCurrentPlanId = (planId: SaaSPlanId) => {
    setCurrentPlanIdState(planId);
    localStorage.setItem('flux_current_plan_id', planId);
  };

  const canUseFeature = (feature: SaaSFeature) => PlanService.canUseFeature(currentPlanId, feature);
  const getPlanLimit = (limit: SaaSLimit) => PlanService.getPlanLimit(currentPlanId, limit);

  const [activeRestaurantId, setActiveRestaurantIdState] = useState<RestaurantId>(() => {
    return localStorage.getItem('flux_active_restaurant_id') || defaultRestaurantId;
  });

  const [currentUser, setCurrentUserInternal] = useState<UserSession>(() => {
    const saved = readJson<UserSession>('flux_current_user');
    if (saved && saved.restaurantId === activeRestaurantId) return saved;
    return getDefaultUser(activeRestaurantId);
  });

  const [activeMode, setActiveModeState] = useState<'client' | 'kitchen' | 'cashier' | 'admin' | 'split'>(() => {
    const savedMode = localStorage.getItem('flux_active_mode') as any;
    const allowed = ROLE_PERMISSIONS[currentUser.role].allowedModes;
    if (savedMode && allowed.includes(savedMode)) return savedMode;
    return allowed.includes('split') ? 'split' : allowed[0];
  });

  const [tick, setTick] = useState<number>(0);
  useEffect(() => {
    const isr = setInterval(() => setTick(prev => prev + 1), 1000);
    return () => clearInterval(isr);
  }, []);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4500);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const [restaurantConfigs, setRestaurantConfigs] = useState<RestaurantConfig[]>(() => {
    const saved = readJson<RestaurantConfig[]>('flux_restaurant_configs');
    const legacyConfig = readJson<RestaurantConfig>('flux_restaurant_config');
    const seed = RestaurantService.getRestaurantProfiles();
    const normalizedSaved = saved ?? (legacyConfig ? [{ ...legacyConfig, restaurantId: legacyConfig.restaurantId ?? defaultRestaurantId }] : null);
    return mergeConfigsByRestaurantId(normalizedSaved, seed);
  });

  const [allProducts, setAllProducts] = useState<Product[]>(() => {
    const saved = readJson<Product[]>('flux_products');
    const normalizedSaved = saved ? CatalogService.ensureProductRestaurantIds(saved, defaultRestaurantId) : null;
    const seed = [...CatalogService.getProducts('rest_gusto'), ...CatalogService.getProducts('rest_bistro')];
    return mergeByRestaurantIdAndId(normalizedSaved, seed);
  });

  const [tablesByRestaurant, setTablesByRestaurant] = useState<TablesByRestaurant>(() => {
    const saved = getSavedTablesByRestaurant(defaultRestaurantId) ?? {};
    return {
      rest_gusto: saved.rest_gusto ?? TableService.getTables('rest_gusto'),
      rest_bistro: saved.rest_bistro ?? TableService.getTables('rest_bistro')
    };
  });

  const [tableNumber, setTableNumberState] = useState<string>(() => {
    return localStorage.getItem('flux_current_table_' + activeRestaurantId) || TableService.getTables(activeRestaurantId)[0] || 'Mesa 01';
  });

  const [allOrders, setAllOrders] = useState<Order[]>(() => {
    const saved = readJson<Order[]>('flux_orders');
    const normalizedSaved = saved ? OrderService.ensureOrderRestaurantIds(saved, defaultRestaurantId) : null;
    const seed = [...OrderService.getOrders('rest_gusto'), ...OrderService.getOrders('rest_bistro')];
    return mergeByRestaurantIdAndId(normalizedSaved, seed);
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = readJson<CartItem[]>('flux_cart_' + activeRestaurantId) ?? readJson<CartItem[]>('flux_cart');
    return saved?.filter(item => item.product.restaurantId === activeRestaurantId) ?? [];
  });

  const [allPaymentLogs, setAllPaymentLogs] = useState<PaymentLog[]>(() => {
    const saved = readJson<PaymentLog[]>('flux_payment_logs');
    return saved ? PaymentService.ensurePaymentLogRestaurantIds(saved, defaultRestaurantId) : [];
  });

  const restaurantConfig = useMemo(() => RestaurantService.getRestaurantConfigForActive(restaurantConfigs, activeRestaurantId), [restaurantConfigs, activeRestaurantId]);
  const products = useMemo(() => CatalogService.getProductsForRestaurant(allProducts, activeRestaurantId), [allProducts, activeRestaurantId]);
  const tables = useMemo(() => tablesByRestaurant[activeRestaurantId] ?? TableService.getTables(activeRestaurantId), [tablesByRestaurant, activeRestaurantId]);
  const orders = useMemo(() => OrderService.getOrdersForRestaurant(allOrders, activeRestaurantId), [allOrders, activeRestaurantId]);
  const paymentLogs = useMemo(() => PaymentService.getPaymentLogsForRestaurant(allPaymentLogs, activeRestaurantId), [allPaymentLogs, activeRestaurantId]);

  useEffect(() => localStorage.setItem('flux_current_plan_id', currentPlanId), [currentPlanId]);
  useEffect(() => localStorage.setItem('flux_active_restaurant_id', activeRestaurantId), [activeRestaurantId]);
  useEffect(() => localStorage.setItem('flux_current_user', JSON.stringify(currentUser)), [currentUser]);
  useEffect(() => localStorage.setItem('flux_restaurant_configs', JSON.stringify(restaurantConfigs)), [restaurantConfigs]);
  useEffect(() => localStorage.setItem('flux_products', JSON.stringify(allProducts)), [allProducts]);
  useEffect(() => localStorage.setItem('flux_tables_by_restaurant', JSON.stringify(tablesByRestaurant)), [tablesByRestaurant]);
  useEffect(() => localStorage.setItem('flux_orders', JSON.stringify(allOrders)), [allOrders]);
  useEffect(() => localStorage.setItem('flux_cart_' + activeRestaurantId, JSON.stringify(cart)), [cart, activeRestaurantId]);
  useEffect(() => localStorage.setItem('flux_payment_logs', JSON.stringify(allPaymentLogs)), [allPaymentLogs]);

  useEffect(() => {
    const savedTable = localStorage.getItem('flux_current_table_' + activeRestaurantId);
    setTableNumberState(savedTable || tables[0] || 'Mesa 01');
    setCart(prev => prev.filter(item => item.product.restaurantId === activeRestaurantId));
    if (currentUser.restaurantId !== activeRestaurantId) setCurrentUserInternal(getDefaultUser(activeRestaurantId));
  }, [activeRestaurantId]);

  const showUpgradeNotice = (featureName: string) => {
    addToast(featureName + ' está disponível em um plano superior.', 'info');
  };

  const setActiveRestaurantId = (restaurantId: RestaurantId) => {
    setActiveRestaurantIdState(restaurantId);
    localStorage.setItem('flux_active_restaurant_id', restaurantId);
  };

  const setActiveMode = (mode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split') => {
    if (ROLE_PERMISSIONS[currentUser.role].allowedModes.includes(mode)) {
      setActiveModeState(mode);
      localStorage.setItem('flux_active_mode', mode);
    } else {
      addToast('Seu perfil de ' + currentUser.role.toUpperCase() + ' não tem permissão para acessar a área "' + mode.toUpperCase() + '"!', 'warning');
    }
  };

  const setCurrentUser = (user: UserSession) => {
    const nextUser = user.restaurantId === activeRestaurantId ? user : getDefaultUser(activeRestaurantId);
    setCurrentUserInternal(nextUser);
    const allowed = ROLE_PERMISSIONS[nextUser.role].allowedModes;
    if (!allowed.includes(activeMode)) {
      const target = allowed.includes('split') ? 'split' : allowed[0];
      setActiveModeState(target);
      localStorage.setItem('flux_active_mode', target);
    }
    addToast('Perfil ativo: ' + nextUser.name + ' (' + nextUser.role.toUpperCase() + ')', 'success');
  };

  const hasPermission = (action: keyof Omit<RolePermissionConfig, 'allowedModes'>) => !!ROLE_PERMISSIONS[currentUser.role][action];
  const isModeAllowed = (mode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split') => ROLE_PERMISSIONS[currentUser.role].allowedModes.includes(mode);

  const setRestaurantConfig = (config: RestaurantConfig) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canConfigureRestaurant) {
      addToast('Operação não autorizada para seu nível de acesso!', 'warning');
      return;
    }
    setRestaurantConfigs(prev => RestaurantService.updateRestaurantConfig(prev, { ...config, restaurantId: activeRestaurantId }));
  };

  const setTableNumber = (num: string) => {
    setTableNumberState(num);
    localStorage.setItem('flux_current_table_' + activeRestaurantId, num);
  };

  const addToCart = (product: Product, quantity: number, observation: string) => {
    if (product.restaurantId !== activeRestaurantId) return;
    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.product.id === product.id && item.product.restaurantId === product.restaurantId && item.observation.trim() === observation.trim());
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx].quantity += quantity;
        return next;
      }
      return [...prev, { product, quantity, observation }];
    });
    addToast('Adicionado ao carrinho: ' + quantity + 'x ' + product.name, 'success');
  };

  const removeFromCart = (index: number) => {
    const item = cart[index];
    if (!item) return;
    setCart(prev => prev.filter((_, i) => i !== index));
    addToast(item.product.name + ' removido do carrinho', 'warning');
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const item = prev[index];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return prev.filter((_, i) => i !== index);
      const next = [...prev];
      next[index] = { ...item, quantity: newQty };
      return next;
    });
  };

  const getCartTotal = () => OrderService.getCartTotal(cart);

  const confirmOrder = async (onSuccess?: () => void) => {
    if (cart.length === 0) return;
    const newOrder = OrderService.createOrder(cart, tableNumber, activeRestaurantId);
    setAllOrders(prev => [newOrder, ...prev]);
    setCart([]);
    addToast('Pedido ' + newOrder.id + ' enviado para a produção!', 'success');
    if (onSuccess) onSuccess();
  };

  const updateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canUpdateKDS) {
      addToast('Operação de produção (KDS) não autorizada para seu nível de acesso!', 'warning');
      return;
    }
    const currentOrder = orders.find(order => order.id === orderId);
    let desc = '';
    if (nextStatus === 'preparo') desc = 'em preparo';
    if (nextStatus === 'pronto') desc = 'marcado como pronto!';
    if (nextStatus === 'entregue') desc = 'entregue com sucesso!';
    if (currentOrder) addToast('Pedido ' + orderId + ' (' + currentOrder.table + ') agora está ' + desc, 'info');
    setAllOrders(prev => OrderService.updateOrderStatus(prev, orderId, activeRestaurantId, nextStatus));
  };

  const archiveOrder = (orderId: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canUpdateKDS) {
      addToast('Operação de produção (KDS) não autorizada para seu nível de acesso!', 'warning');
      return;
    }
    setAllOrders(prev => OrderService.archiveOrder(prev, orderId, activeRestaurantId));
    addToast('Pedido ' + orderId + ' arquivado do painel', 'warning');
  };

  const clearAllOrders = () => {
    if (!ROLE_PERMISSIONS[currentUser.role].canUpdateKDS) {
      addToast('Operação não autorizada para seu nível de acesso!', 'warning');
      return;
    }
    setAllOrders(prev => prev.filter(order => order.restaurantId !== activeRestaurantId));
    addToast('Todos os pedidos foram limpos de forma permanente', 'warning');
  };

  const resetInitialOrders = () => {
    if (!ROLE_PERMISSIONS[currentUser.role].canUpdateKDS) {
      addToast('Operação não autorizada para seu nível de acesso!', 'warning');
      return;
    }
    setAllOrders(prev => [...prev.filter(order => order.restaurantId !== activeRestaurantId), ...OrderService.getOrders(activeRestaurantId)]);
    addToast('Pedidos redefinidos para os originais de fábrica', 'success');
  };

  const createManualOrder = () => {
    if (!ROLE_PERMISSIONS[currentUser.role].canCreateManualOrders) {
      addToast('Apenas administradores e gerentes podem registrar novas entradas manuais!', 'warning');
      return;
    }
    const randomOrder = OrderService.createManualOrder(tables, products, activeRestaurantId);
    if (!randomOrder) return;
    setAllOrders(prev => [randomOrder, ...prev]);
    addToast('🔔 Novo pedido ' + randomOrder.id + ' recebido na ' + randomOrder.table, 'info');
  };

  const updateProduct = (updated: Product) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast('Apenas gestores com permissão de edição de catálogo podem alterar produtos!', 'warning');
      return;
    }
    setAllProducts(prev => CatalogService.updateProduct(prev, { ...updated, restaurantId: activeRestaurantId }));
    addToast('Produto "' + updated.name + '" atualizado com sucesso!', 'success');
  };

  const addProduct = (newProd: Omit<Product, 'id' | 'restaurantId'>) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast('Apenas gestores com permissão de edição de catálogo podem adicionar produtos!', 'warning');
      return;
    }
    setAllProducts(prev => CatalogService.addProduct(prev, { ...newProd, restaurantId: activeRestaurantId }));
    addToast('Novo produto "' + newProd.name + '" adicionado ao cardápio!', 'success');
  };

  const deleteProduct = (id: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast('Apenas gestores com permissão de edição de catálogo podem remover produtos!', 'warning');
      return;
    }
    setAllProducts(prev => CatalogService.deleteProduct(prev, id, activeRestaurantId));
    addToast('Produto removido do cardápio', 'warning');
  };

  const addTable = (num: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canManageTables) {
      addToast('Operação de mesas não autorizada para seu nível de acesso!', 'warning');
      return;
    }
    if (tables.includes(num)) {
      addToast('Esta mesa já existe!', 'warning');
      return;
    }
    setTablesByRestaurant(prev => ({ ...prev, [activeRestaurantId]: TableService.addTable(prev[activeRestaurantId] ?? [], num) }));
    addToast(num + ' cadastrada com sucesso', 'success');
  };

  const deleteTable = (num: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canManageTables) {
      addToast('Operação de mesas não autorizada para seu nível de acesso!', 'warning');
      return;
    }
    setTablesByRestaurant(prev => ({ ...prev, [activeRestaurantId]: TableService.deleteTable(prev[activeRestaurantId] ?? [], num) }));
    addToast(num + ' removida do sistema', 'warning');
  };

  const checkoutTable = (table: string, paymentMethod: 'pix' | 'credito' | 'debito' | 'dinheiro') => {
    if (!ROLE_PERMISSIONS[currentUser.role].canProcessCheckout) {
      addToast('Seu perfil não possui autorização para receber pagamentos e faturar mesas!', 'warning');
      return;
    }
    const unpaidOrders = PaymentService.getUnpaidOrdersByTable(allOrders, table, activeRestaurantId);
    if (unpaidOrders.length === 0) {
      addToast('A ' + table + ' não possui faturas pendentes de pagamento!', 'warning');
      return;
    }
    const newLog = PaymentService.createPaymentLog(activeRestaurantId, table, unpaidOrders, paymentMethod);
    setAllOrders(prev => PaymentService.checkoutOrders(prev, table, activeRestaurantId, paymentMethod));
    setAllPaymentLogs(prev => [newLog, ...prev]);
    const methodNames = { pix: 'PIX', credito: 'Cartão de Crédito', debito: 'Cartão de Débito', dinheiro: 'Dinheiro' };
    addToast('Mesa ' + table + ' finalizada via ' + methodNames[paymentMethod] + '! Total: R$ ' + newLog.amount.toFixed(2), 'success');
  };

  const clearPaymentHistory = () => {
    if (!ROLE_PERMISSIONS[currentUser.role].canProcessCheckout) {
      addToast('Seu perfil de acesso não permite limpar logs fiscais!', 'warning');
      return;
    }
    setAllPaymentLogs(prev => prev.filter(log => log.restaurantId !== activeRestaurantId));
    addToast('Histórico de caixa foi limpo com sucesso', 'info');
  };

  return (
    <AppContext.Provider value={{
      currentPlan,
      currentPlanId,
      setCurrentPlanId,
      canUseFeature,
      getPlanLimit,
      showUpgradeNotice,
      activeRestaurantId,
      setActiveRestaurantId,
      products,
      orders,
      cart,
      tableNumber,
      setTableNumber,
      activeMode,
      setActiveMode,
      toasts,
      addToast,
      removeToast,
      tick,
      currentUser,
      setCurrentUser,
      hasPermission,
      isModeAllowed,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      getCartTotal,
      confirmOrder,
      updateOrderStatus,
      archiveOrder,
      clearAllOrders,
      resetInitialOrders,
      createManualOrder,
      paymentLogs,
      checkoutTable,
      clearPaymentHistory,
      updateProduct,
      addProduct,
      deleteProduct,
      restaurantConfig,
      setRestaurantConfig,
      tables,
      addTable,
      deleteTable
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside an AppProvider wrapper');
  return context;
};
