import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, CartItem, Order, OrderStatus, Toast, OrderItem, RestaurantConfig, PaymentLog, UserRole, UserSession, RolePermissionConfig } from '../types';
import { MENU_PRODUCTS, INITIAL_ORDERS, RESTAURANT_PROFILE } from '../data';
import { STAFF_USERS, ROLE_PERMISSIONS } from '../utils/rbac';

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
    return STAFF_USERS[0];
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
    return saved ? JSON.parse(saved) : RESTAURANT_PROFILE;
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
    return MENU_PRODUCTS.map(p => ({ ...p, available: true }));
  });

  useEffect(() => {
    localStorage.setItem('flux_products', JSON.stringify(products));
  }, [products]);

  // Restaurant Active Tables List
  const [tables, setTables] = useState<string[]>(() => {
    const saved = localStorage.getItem('flux_tables');
    return saved ? JSON.parse(saved) : ['Mesa 01', 'Mesa 02', 'Mesa 03', 'Mesa 04', 'Mesa 05', 'Mesa 08', 'Mesa 12', 'Mesa 15', 'Mesa VIP'];
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
    return INITIAL_ORDERS;
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
    setCart(prev => prev.filter((_, i) => i !== index));
    addToast(`${item.product.name} removido do carrinho`, 'warning');
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const item = prev[index];
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
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  // Confirm and submit order to kitchen
  const confirmOrder = async (onSuccess?: () => void) => {
    if (cart.length === 0) return;

    const orderItems: OrderItem[] = cart.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      quantity: item.quantity,
      observation: item.observation,
      price: item.product.price
    }));

    // Find custom urgency keywords
    let finalPriority: 'baixa' | 'media' | 'alta' | 'urgente' = 'media';
    const hasSevereNeeds = cart.some(item => 
      item.observation.toLowerCase().includes('alergia') || 
      item.observation.toLowerCase().includes('alergi') ||
      item.observation.toLowerCase().includes('restrição') ||
      item.observation.toLowerCase().includes('infantil') ||
      item.observation.toLowerCase().includes('criança')
    );

    if (hasSevereNeeds) {
      finalPriority = 'urgente';
    } else if (orderItems.some(i => i.quantity >= 3)) {
      finalPriority = 'alta';
    }

    const newOrder: Order = {
      id: `#${Math.floor(1000 + Math.random() * 9000).toString()}`,
      table: tableNumber,
      items: orderItems,
      status: 'novo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      total: getCartTotal(),
      priority: finalPriority,
      notes: hasSevereNeeds ? "⚠️ Alertas críticos informados nas observações." : "",
      paymentStatus: 'pendente'
    };

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

    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        let desc = '';
        if (nextStatus === 'preparo') desc = 'em preparo';
        if (nextStatus === 'pronto') desc = 'marcado como pronto!';
        if (nextStatus === 'entregue') desc = 'entregue com sucesso!';
        
        addToast(`Pedido ${orderId} (${order.table}) agora está ${desc}`, 'info');

        return {
          ...order,
          status: nextStatus,
          updatedAt: new Date().toISOString()
        };
      }
      return order;
    }));
  };

  const archiveOrder = (orderId: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canUpdateKDS) {
      addToast("Operação de produção (KDS) não autorizada para seu nível de acesso!", "warning");
      return;
    }
    setOrders(prev => prev.filter(o => o.id !== orderId));
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
    setOrders(INITIAL_ORDERS);
    addToast('Pedidos redefinidos para os originais de fábrica', 'success');
  };

  // Create a manual incoming order
  const createManualOrder = () => {
    if (!ROLE_PERMISSIONS[currentUser.role].canCreateManualOrders) {
      addToast("Apenas administradores e gerentes podem registrar novas entradas manuais!", "warning");
      return;
    }
    const randomTable = tables[Math.floor(Math.random() * tables.length)];
    // pick 1-2 random products from active ones
    const activeProducts = products.filter(p => p.available);
    if (activeProducts.length === 0) return;

    const chosenProduct = activeProducts[Math.floor(Math.random() * activeProducts.length)];
    const randomItems: OrderItem[] = [
      {
        productId: chosenProduct.id,
        name: chosenProduct.name,
        quantity: Math.floor(Math.random() * 2) + 1,
        observation: Math.random() > 0.6 ? "Sem cebola / Ponto médio" : "",
        price: chosenProduct.price
      }
    ];

    const randomOrder: Order = {
      id: `#${Math.floor(1000 + Math.random() * 9000).toString()}`,
      table: randomTable,
      items: randomItems,
      status: 'novo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      total: randomItems.reduce((acc, i) => acc + (i.price * i.quantity), 0),
      priority: Math.random() > 0.75 ? 'alta' : 'media',
      notes: ""
    };

    setOrders(prev => [randomOrder, ...prev]);
    addToast(`🔔 Novo pedido ${randomOrder.id} recebido na ${randomTable}`, 'info');
  };

  // Admin Catalog Management
  const updateProduct = (updated: Product) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast("Apenas gestores com permissão de edição de catálogo podem alterar produtos!", "warning");
      return;
    }
    setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
    addToast(`Produto "${updated.name}" atualizado com sucesso!`, 'success');
  };

  const addProduct = (newProd: Omit<Product, 'id'>) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast("Apenas gestores com permissão de edição de catálogo podem adicionar produtos!", "warning");
      return;
    }
    const id = 'p_' + Date.now().toString();
    setProducts(prev => [...prev, { ...newProd, id, available: true }]);
    addToast(`Novo produto "${newProd.name}" adicionado ao cardápio!`, 'success');
  };

  const deleteProduct = (id: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast("Apenas gestores com permissão de edição de catálogo podem remover produtos!", "warning");
      return;
    }
    setProducts(prev => prev.filter(p => p.id !== id));
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
    setTables(prev => [...prev, num].sort());
    addToast(`${num} cadastrada com sucesso`, 'success');
  };

  const deleteTable = (num: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canManageTables) {
      addToast("Operação de mesas não autorizada para seu nível de acesso!", "warning");
      return;
    }
    setTables(prev => prev.filter(t => t !== num));
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

    // Find all active/pending unpaid orders of this table
    const unpaidOrders = orders.filter(o => o.table === table && o.paymentStatus !== 'pago');
    if (unpaidOrders.length === 0) {
      addToast(`A ${table} não possui faturas pendentes de pagamento!`, 'warning');
      return;
    }

    const totalAmount = unpaidOrders.reduce((sum, order) => sum + order.total, 0);
    const totalItemsCount = unpaidOrders.reduce((sum, order) => 
      sum + order.items.reduce((ordersSum, item) => ordersSum + item.quantity, 0), 0
    );

    const newLog: PaymentLog = {
      id: `PAY_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      table,
      amount: totalAmount,
      paymentMethod,
      timestamp: new Date().toISOString(),
      itemsCount: totalItemsCount,
      orders: unpaidOrders.map(o => o.id)
    };

    setOrders(prev => prev.map(order => {
      if (order.table === table && order.paymentStatus !== 'pago') {
        return {
          ...order,
          paymentStatus: 'pago',
          paymentMethod,
          status: 'entregue', // Checkout closes table loop
          updatedAt: new Date().toISOString()
        };
      }
      return order;
    }));

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
