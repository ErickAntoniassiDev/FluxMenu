import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, Order, OrderStatus, Toast, RestaurantConfig, PaymentLog, UserSession, RolePermissionConfig } from '../types';
import { ROLE_PERMISSIONS } from '../utils/rbac';
import * as CatalogService from '../services/catalogService';
import * as OrderService from '../services/orderService';
import * as PaymentService from '../services/paymentService';
import * as RestaurantService from '../services/restaurantService';
import * as TableService from '../services/tableService';
import { getDefaultUser } from '../services/userService';

interface AppContextType {
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
  
  // Auth / RBAC Session State
  currentUser: UserSession;
  setCurrentUser: (user: UserSession) => void;
  hasPermission: (action: keyof Omit<RolePermissionConfig, 'allowedModes'>) => boolean;
  isModeAllowed: (mode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split') => boolean;
  
  // Cart Actions
  addToCart: (product: Product, quantity: number, observation: string) => void;
  removeFromCart: (index: number) => void;
  updateCartQuantity: (index: number, delta: number) => void;
  getCartTotal: () => number;
  confirmOrder: (onSuccess?: () => void) => Promise<void>;
  
  // Kitchen Actions
  updateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
  archiveOrder: (orderId: string) => void;
  clearAllOrders: () => void;
  resetInitialOrders: () => void;
  createManualOrder: () => void;
  
  // Cashier Actions
  paymentLogs: PaymentLog[];
  checkoutTable: (table: string, paymentMethod: 'pix' | 'credito' | 'debito' | 'dinheiro') => void;
  clearPaymentHistory: () => void;
  
  // Admin Actions
  updateProduct: (updated: Product) => void;
  addProduct: (newProd: Omit<Product, 'id'>) => void;
  deleteProduct: (id: string) => void;
  restaurantConfig: RestaurantConfig;
  setRestaurantConfig: (config: RestaurantConfig) => void;
  tables: string[];
  addTable: (num: string) => void;
  deleteTable: (num: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User session state
  const [currentUser, setCurrentUserInternal] = useState<UserSession>(() => {
    const saved = localStorage.getItem('flux_current_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return getDefaultUser();
  });

  useEffect(() => {
    localStorage.setItem('flux_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Navigation with permission enforcement
  const [activeMode, setActiveModeState] = useState<'client' | 'kitchen' | 'cashier' | 'admin' | 'split'>(() => {
    const savedMode = localStorage.getItem('flux_active_mode') as any;
    const allowed = ROLE_PERMISSIONS[currentUser.role].allowedModes;
    if (savedMode && allowed.includes(savedMode)) {
      return savedMode;
    }
    return allowed.includes('split') ? 'split' : allowed[0];
  });

  // Real-Time Ticking Engine
  const [tick, setTick] = useState<number>(0);
  useEffect(() => {
    const isr = setInterval(() => setTick(prev => prev + 1), 1000);
    return () => clearInterval(isr);
  }, []);

  // Toasts Announcements System
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const setActiveMode = (mode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split') => {
    if (ROLE_PERMISSIONS[currentUser.role].allowedModes.includes(mode)) {
      setActiveModeState(mode);
      localStorage.setItem('flux_active_mode', mode);
    } else {
      addToast(`Seu perfil de ${currentUser.role.toUpperCase()} não tem permissão para acessar a área "${mode.toUpperCase()}"!`, 'warning');
    }
  };

  const setCurrentUser = (user: UserSession) => {
    setCurrentUserInternal(user);
    // Redirect if current mode is restricted under the new role
    const allowed = ROLE_PERMISSIONS[user.role].allowedModes;
    if (!allowed.includes(activeMode)) {
      const target = allowed.includes('split') ? 'split' : allowed[0];
      setActiveModeState(target);
      localStorage.setItem('flux_active_mode', target);
    }
    addToast(`Perfil ativo: ${user.name} (${user.role.toUpperCase()})`, 'success');
  };

  const hasPermission = (action: keyof Omit<RolePermissionConfig, 'allowedModes'>) => {
    return !!ROLE_PERMISSIONS[currentUser.role][action];
  };

  const isModeAllowed = (mode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split') => {
    return ROLE_PERMISSIONS[currentUser.role].allowedModes.includes(mode);
  };

  // Restaurant details
  const [restaurantConfig, setRestaurantConfigState] = useState<RestaurantConfig>(() => {
    const saved = localStorage.getItem('flux_restaurant_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return RestaurantService.getRestaurantProfile();
  });

  const setRestaurantConfig = (config: RestaurantConfig) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canConfigureRestaurant) {
      addToast("Operação não autorizada para seu nível de acesso!", "warning");
      return;
    }
    setRestaurantConfigState(config);
  };

  // Product Catalog (with persistent LocalState edits)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('flux_products');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure default available property exists
        return parsed.map((p: any) => ({ ...p, available: p.available ?? true }));
      } catch (e) {
        console.error("Error parsing saved products", e);
      }
    }
    return CatalogService.getProducts();
  });

  useEffect(() => {
    localStorage.setItem('flux_products', JSON.stringify(products));
  }, [products]);

  // Restaurant Active Tables List
  const [tables, setTables] = useState<string[]>(() => {
    const saved = localStorage.getItem('flux_tables');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return TableService.getTables();
  });

  useEffect(() => {
    localStorage.setItem('flux_tables', JSON.stringify(tables));
  }, [tables]);

  // Table currently scanned/selected by client
  const [tableNumber, setTableNumberState] = useState<string>(() => {
    return localStorage.getItem('flux_current_table') || 'Mesa 08';
  });

  const setTableNumber = (num: string) => {
    setTableNumberState(num);
    localStorage.setItem('flux_current_table', num);
  };

  // Orders array state
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('flux_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return OrderService.getOrders();
  });

  useEffect(() => {
    localStorage.setItem('flux_orders', JSON.stringify(orders));
  }, [orders]);

  // Client local cart
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('flux_cart');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('flux_cart', JSON.stringify(cart));
  }, [cart]);

  // Cart operations
  const addToCart = (product: Product, quantity: number, observation: string) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(item => 
        item.product.id === product.id && 
        item.observation.trim() === observation.trim()
      );
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx].quantity += quantity;
        return next;
      } else {
        return [...prev, { product, quantity, observation }];
      }
    });
    addToast(`Adicionado ao carrinho: ${quantity}x ${product.name}`, 'success');
  };

  const removeFromCart = (index: number) => {
    const item = cart[index];
    if (!item) return;
    setCart(prev => prev.filter((_, i) => i !== index));
    addToast(`${item.product.name} removido do carrinho`, 'warning');
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const item = prev[index];
      if (!item) return prev;
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      const next = [...prev];
      next[index] = { ...item, quantity: newQty };
      return next;
    });
  };

  const getCartTotal = () => {
    return OrderService.getCartTotal(cart);
  };

  // Confirm and submit order to kitchen
  const confirmOrder = async (onSuccess?: () => void) => {
    if (cart.length === 0) return;

    const newOrder = OrderService.createOrder(cart, tableNumber);

    setOrders(prev => [newOrder, ...prev]);
    setCart([]);
    addToast(`Pedido ${newOrder.id} enviado para a produção!`, 'success');
    if (onSuccess) onSuccess();
  };

  // Kitchen dashboard operations
  const updateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canUpdateKDS) {
      addToast("Operação de produção (KDS) não autorizada para seu nível de acesso!", "warning");
      return;
    }

    const currentOrder = orders.find(order => order.id === orderId);
    let desc = '';
    if (nextStatus === 'preparo') desc = 'em preparo';
    if (nextStatus === 'pronto') desc = 'marcado como pronto!';
    if (nextStatus === 'entregue') desc = 'entregue com sucesso!';

    if (currentOrder) {
      addToast(`Pedido ${orderId} (${currentOrder.table}) agora está ${desc}`, 'info');
    }

    setOrders(prev => OrderService.updateOrderStatus(prev, orderId, nextStatus));
  };

  const archiveOrder = (orderId: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canUpdateKDS) {
      addToast("Operação de produção (KDS) não autorizada para seu nível de acesso!", "warning");
      return;
    }
    setOrders(prev => OrderService.archiveOrder(prev, orderId));
    addToast(`Pedido ${orderId} arquivado do painel`, 'warning');
  };

  const clearAllOrders = () => {
    if (!ROLE_PERMISSIONS[currentUser.role].canUpdateKDS) {
      addToast("Operação não autorizada para seu nível de acesso!", "warning");
      return;
    }
    setOrders([]);
    addToast('Todos os pedidos foram limpos de forma permanente', 'warning');
  };

  const resetInitialOrders = () => {
    if (!ROLE_PERMISSIONS[currentUser.role].canUpdateKDS) {
      addToast("Operação não autorizada para seu nível de acesso!", "warning");
      return;
    }
    setOrders(OrderService.getOrders());
    addToast('Pedidos redefinidos para os originais de fábrica', 'success');
  };

  // Create a manual incoming order
  const createManualOrder = () => {
    if (!ROLE_PERMISSIONS[currentUser.role].canCreateManualOrders) {
      addToast("Apenas administradores e gerentes podem registrar novas entradas manuais!", "warning");
      return;
    }
    const randomOrder = OrderService.createManualOrder(tables, products);
    if (!randomOrder) return;

    setOrders(prev => [randomOrder, ...prev]);
    addToast(`🔔 Novo pedido ${randomOrder.id} recebido na ${randomOrder.table}`, 'info');
  };

  // Admin Catalog Management
  const updateProduct = (updated: Product) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast("Apenas gestores com permissão de edição de catálogo podem alterar produtos!", "warning");
      return;
    }
    setProducts(prev => CatalogService.updateProduct(prev, updated));
    addToast(`Produto "${updated.name}" atualizado com sucesso!`, 'success');
  };

  const addProduct = (newProd: Omit<Product, 'id'>) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast("Apenas gestores com permissão de edição de catálogo podem adicionar produtos!", "warning");
      return;
    }
    setProducts(prev => CatalogService.addProduct(prev, newProd));
    addToast(`Novo produto "${newProd.name}" adicionado ao cardápio!`, 'success');
  };

  const deleteProduct = (id: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast("Apenas gestores com permissão de edição de catálogo podem remover produtos!", "warning");
      return;
    }
    setProducts(prev => CatalogService.deleteProduct(prev, id));
    addToast("Produto removido do cardápio", "warning");
  };

  const addTable = (num: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canManageTables) {
      addToast("Operação de mesas não autorizada para seu nível de acesso!", "warning");
      return;
    }
    if (tables.includes(num)) {
      addToast("Esta mesa já existe!", "warning");
      return;
    }
    setTables(prev => TableService.addTable(prev, num));
    addToast(`${num} cadastrada com sucesso`, 'success');
  };

  const deleteTable = (num: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canManageTables) {
      addToast("Operação de mesas não autorizada para seu nível de acesso!", "warning");
      return;
    }
    setTables(prev => TableService.deleteTable(prev, num));
    addToast(`${num} removida do sistema`, 'warning');
  };

  // Cashier State & Actions
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>(() => {
    const saved = localStorage.getItem('flux_payment_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('flux_payment_logs', JSON.stringify(paymentLogs));
  }, [paymentLogs]);

  const checkoutTable = (table: string, paymentMethod: 'pix' | 'credito' | 'debito' | 'dinheiro') => {
    if (!ROLE_PERMISSIONS[currentUser.role].canProcessCheckout) {
      addToast("Seu perfil não possui autorização para receber pagamentos e faturar mesas!", "warning");
      return;
    }

    const unpaidOrders = PaymentService.getUnpaidOrdersByTable(orders, table);
    if (unpaidOrders.length === 0) {
      addToast(`A ${table} não possui faturas pendentes de pagamento!`, 'warning');
      return;
    }

    const newLog = PaymentService.createPaymentLog(table, unpaidOrders, paymentMethod);
    const totalAmount = newLog.amount;

    setOrders(prev => PaymentService.checkoutOrders(prev, table, paymentMethod));

    setPaymentLogs(prev => [newLog, ...prev]);

    const methodNames = {
      pix: 'PIX',
      credito: 'Cartão de Crédito',
      debito: 'Cartão de Débito',
      dinheiro: 'Dinheiro'
    };

    addToast(`Mesa ${table} finalizada via ${methodNames[paymentMethod]}! Total: R$ ${totalAmount.toFixed(2)}`, 'success');
  };

  const clearPaymentHistory = () => {
    if (!ROLE_PERMISSIONS[currentUser.role].canProcessCheckout) {
      addToast("Seu perfil de acesso não permite limpar logs fiscais!", "warning");
      return;
    }
    setPaymentLogs([]);
    addToast('Histórico de caixa foi limpo com sucesso', 'info');
  };

  return (
    <AppContext.Provider value={{
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
  if (!context) {
    throw new Error('useApp must be used inside an AppProvider wrapper');
  }
  return context;
};
