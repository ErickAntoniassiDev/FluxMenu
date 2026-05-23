import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShoppingCart, 
  Clock, 
  Search, 
  Plus, 
  Minus, 
  ChefHat, 
  Play, 
  CheckCircle2, 
  X, 
  Check, 
  Flame, 
  Sparkles, 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  DollarSign, 
  Layers, 
  Bell, 
  Smartphone, 
  Info,
  Sliders,
  Award,
  ChevronRight,
  TrendingUp,
  MapPin,
  Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CartItem, Order, OrderStatus, Toast, OrderItem } from './types';
import { MENU_PRODUCTS, MOCK_INITIAL_ORDERS, RESTAURANT_PROFILE } from './data';

export default function App() {
  // Navigation & View Modes
  const [activeMode, setActiveMode] = useState<'client' | 'kitchen' | 'split'>('split');
  
  // App States
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('gusto_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return MOCK_INITIAL_ORDERS;
  });
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('gusto_cart');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });
  
  const [tableNumber, setTableNumber] = useState<string>(() => {
    return localStorage.getItem('gusto_table') || 'Mesa 08';
  });

  // Client menu states
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSkeletonLoading, setIsSkeletonLoading] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Product customization modal state
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [modalObservation, setModalObservation] = useState<string>('');
  const [modalPriorityType, setModalPriorityType] = useState<'normal' | 'kids_allergy'>('normal');

  // Interactive cart slideover toggler
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  
  // Simulated submission loader
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [submittingStep, setSubmittingStep] = useState<number>(0);
  const [submittedOrderSuccess, setSubmittedOrderSuccess] = useState<boolean>(false);

  // Kitchen dashboard filters
  const [kitchenPriorityFilter, setKitchenPriorityFilter] = useState<string>('todos');
  const [kitchenSearchQuery, setKitchenSearchQuery] = useState<string>('');
  const [showKitchenStats, setShowKitchenStats] = useState<boolean>(true);

  // Toast System
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Real-time ticking trigger state
  const [tick, setTick] = useState<number>(0);

  // Persist states
  useEffect(() => {
    localStorage.setItem('gusto_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('gusto_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('gusto_table', tableNumber);
  }, [tableNumber]);

  // General Timer Ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync / Simulated incoming orders helper for demonstration
  const triggerSimulatedOrder = () => {
    const tables = ['Mesa 02', 'Mesa 15', 'Mesa 04', 'Balcão 01', 'Mesa 19'];
    const randomTable = tables[Math.floor(Math.random() * tables.length)];
    const randomItems: OrderItem[] = [
      {
        productId: 'h1',
        name: "Alquimia Charcoal Burger",
        quantity: 1,
        observation: "Ponto da carne ao ponto para mal passado.",
        price: 46.00
      }
    ];

    if (Math.random() > 0.5) {
      randomItems.push({
        productId: 'b1',
        name: "Soda Artesanal de Frutas Vermelhas & Limão Siciliano",
        quantity: 1,
        observation: "Com bastante hortelã.",
        price: 16.00
      });
    }

    const newOrder: Order = {
      id: `#${Math.floor(1000 + Math.random() * 9000).toString()}`,
      table: randomTable,
      items: randomItems,
      status: 'novo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      total: randomItems.reduce((acc, i) => acc + (i.price * i.quantity), 0),
      priority: Math.random() > 0.6 ? 'alta' : 'media',
      notes: Math.random() > 0.7 ? "Cliente na mesa pela primeira vez." : ""
    };

    setOrders(prev => [newOrder, ...prev]);
    showToast(`🔔 Novo pedido simulado recebido da ${randomTable}!`, 'info');
  };

  // Toast Dispatcher Helper
  const showToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Category change wrapper to simulate lightning-fast loading skeleton states
  const handleCategoryChange = (category: string) => {
    setIsSkeletonLoading(true);
    setSelectedCategory(category);
    setTimeout(() => {
      setIsSkeletonLoading(false);
    }, 350);
  };

  // Cart operations
  const addToCart = (product: Product, quantity: number, observation: string, isUrgent: boolean) => {
    const priority = isUrgent ? 'kids_allergy' : 'normal';
    setCart(prev => {
      const existingIndex = prev.findIndex(item => 
        item.product.id === product.id && 
        item.observation === observation
      );
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += quantity;
        return next;
      } else {
        return [...prev, { product, quantity, observation }];
      }
    });
    
    showToast(`Adicionado ao carrinho: ${quantity}x ${product.name}`, 'success');
    setSelectedProduct(null); // Close modal
    resetModalStates();
  };

  const resetModalStates = () => {
    setModalQuantity(1);
    setModalObservation('');
    setModalPriorityType('normal');
  };

  const removeFromCart = (index: number) => {
    const item = cart[index];
    setCart(prev => prev.filter((_, i) => i !== index));
    showToast(`${item.product.name} removido do carrinho`, 'warning');
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const target = prev[index];
      const newQty = target.quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      const next = [...prev];
      next[index] = { ...target, quantity: newQty };
      return next;
    });
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  // Order Submission Cycle
  const handleConfirmOrder = () => {
    if (cart.length === 0) return;
    
    setIsSubmittingOrder(true);
    setSubmittingStep(0);
    
    // Step 0 -> Step 1 after 1 second
    setTimeout(() => {
      setSubmittingStep(1);
    }, 900);

    // Step 1 -> Step 2 after 2 seconds
    setTimeout(() => {
      setSubmittingStep(2);
    }, 1800);

    // Final finish and add to kitchen status after 3 seconds
    setTimeout(() => {
      const orderItems: OrderItem[] = cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        observation: item.observation,
        price: item.product.price
      }));

      // Determine order priority based on child / allergy indicators
      let finalPriority: 'baixa' | 'media' | 'alta' | 'urgente' = 'media';
      const hasSevereNeeds = cart.some(item => 
        item.observation.toLowerCase().includes('alergia') || 
        item.observation.toLowerCase().includes('alergi') ||
        item.observation.toLowerCase().includes('infantil') ||
        item.observation.toLowerCase().includes('criança')
      );
      if (hasSevereNeeds) {
        finalPriority = 'urgente';
      } else if (orderItems.some(i => i.quantity >= 4)) {
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
        notes: hasSevereNeeds ? "⚠️ Alertas críticos informados nas observações." : ""
      };

      setOrders(prev => [newOrder, ...prev]);
      setCart([]);
      setIsSubmittingOrder(false);
      setSubmittedOrderSuccess(true);
      setIsCartOpen(false);
      showToast(`Pedido ${newOrder.id} enviado com sucesso para a cozinha!`, 'success');
    }, 2800);
  };

  // Kitchen operations
  const updateOrderStatus = (orderId: string, nextStatus: OrderStatus) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        // Log transition in toast
        let desc = '';
        if (nextStatus === 'preparo') desc = 'em preparo';
        if (nextStatus === 'pronto') desc = 'marcado como pronto!';
        if (nextStatus === 'entregue') desc = 'entregue com sucesso!';
        
        showToast(`Pedido ${orderId} na ${order.table} agora está ${desc}`, 'info');

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
    setOrders(prev => prev.filter(o => o.id !== orderId));
    showToast(`Pedido ${orderId} arquivado`, 'warning');
  };

  const clearAllOrders = () => {
    setOrders([]);
    showToast('Todos os pedidos foram limpos para demonstração', 'warning');
  };

  const resetMockOrders = () => {
    setOrders(MOCK_INITIAL_ORDERS);
    showToast('Pedidos redefinidos para os dados de demonstração originais', 'success');
  };

  // Calculate stats for Kitchen dashboard
  const kitchenStats = useMemo(() => {
    const active = orders.filter(o => o.status !== 'entregue').length;
    const completedToday = orders.filter(o => o.status === 'entregue').length;
    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    
    // Calculate average seconds for ready orders
    const completedOrders = orders.filter(o => o.status === 'entregue' || o.status === 'pronto');
    let avgMin = 14; // Default starting reference
    if (completedOrders.length > 0) {
      const totals = completedOrders.map(o => {
        const diffMs = new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime();
        return diffMs / 1000 / 60; // in minutes
      });
      const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
      avgMin = Math.round(avg) || 8;
    }

    return {
      active,
      completedToday,
      revenue,
      avgMin
    };
  }, [orders]);

  // Client menu search filter
  const filteredProducts = useMemo(() => {
    return MENU_PRODUCTS.filter(p => {
      const matchCat = selectedCategory === 'todos' || p.category === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Sort and filter orders inside Kitchen Mode
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchPriority = kitchenPriorityFilter === 'todos' || o.priority === kitchenPriorityFilter;
      const matchSearch = o.table.toLowerCase().includes(kitchenSearchQuery.toLowerCase()) || 
                          o.id.toLowerCase().includes(kitchenSearchQuery.toLowerCase()) ||
                          o.items.some(i => i.name.toLowerCase().includes(kitchenSearchQuery.toLowerCase()));
      return matchPriority && matchSearch;
    });
  }, [orders, kitchenPriorityFilter, kitchenSearchQuery]);

  // Sorted kitchen lists: priority is urgent > alta > media > baixa, wait times longer go first
  const orderSortFn = (a: Order, b: Order) => {
    const priorityWeights = { urgente: 4, alta: 3, media: 2, baixa: 1 };
    const weightDiff = priorityWeights[b.priority] - priorityWeights[a.priority];
    if (weightDiff !== 0) return weightDiff;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  };

  const ordersByStatus = useMemo(() => {
    const grouped = {
      novo: [] as Order[],
      preparo: [] as Order[],
      pronto: [] as Order[],
      entregue: [] as Order[]
    };
    
    filteredOrders.forEach(o => {
      if (grouped[o.status]) {
        grouped[o.status].push(o);
      }
    });

    // Sort appropriately
    grouped.novo.sort(orderSortFn);
    grouped.preparo.sort(orderSortFn);
    grouped.pronto.sort(orderSortFn);
    grouped.entregue.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); // newest delivered first

    return grouped;
  }, [filteredOrders]);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col relative antialiased">
      
      {/* 1. TOP PREMIUM REAL-TIME METRICS & MODE NAV */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs backdrop-blur-xl">
        <div className="mx-auto px-4 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/10 transition-transform hover:scale-105">
              <Utensils className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-lg tracking-tight select-none">{RESTAURANT_PROFILE.name}</h1>
                <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-[10px] uppercase font-semibold text-rose-500 tracking-wide border border-rose-100/60 animate-pulse">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block font-mono">Real-Time Core Engine v1.0</p>
            </div>
          </div>

          {/* SaaS View Switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center relative gap-1 border border-slate-200/50">
            {/* View trigger: CLIENT */}
            <button
              onClick={() => setActiveMode('client')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                activeMode === 'client' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden leading-none md:inline">Painel de Autoatendimento</span>
              <span className="md:hidden">Mesa QR</span>
            </button>

            {/* View trigger: KITCHEN */}
            <button
              onClick={() => setActiveMode('kitchen')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                activeMode === 'kitchen' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span className="hidden leading-none md:inline">Painel do Chef (Cozinha)</span>
              <span className="md:hidden">Cozinha</span>
            </button>

            {/* View identifier selector: COMBINED SPLIT */}
            <button
              onClick={() => setActiveMode('split')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-300 flex items-center gap-2 ${
                activeMode === 'split' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="hidden leading-none md:inline">Visualização Simultânea</span>
              <span className="md:hidden">Dual</span>
            </button>
          </div>

          {/* Real-time simulation controllers */}
          <div className="flex items-center gap-2">
            <button
              onClick={triggerSimulatedOrder}
              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-xs"
              title="Simular um pedido aleatório feito por outro cliente fictício"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Simular Pedido</span>
            </button>
            
            <div className="h-6 w-px bg-slate-100 hidden sm:block"></div>

            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-500 tracking-tight leading-none">Mesa Corrente:</p>
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="text-xs text-rose-500 font-bold bg-transparent border-0 p-0 text-right uppercase tracking-normal focus:ring-0 cursor-pointer hover:underline"
              >
                <option value="Mesa 08">Mesa 08</option>
                <option value="Mesa 03">Mesa 03</option>
                <option value="Mesa 05">Mesa 05</option>
                <option value="Mesa 12">Mesa 12</option>
                <option value="Balcão 02">Balcão 02</option>
                <option value="Mesa VIP">Mesa VIP</option>
              </select>
            </div>
          </div>

        </div>
      </header>

      {/* 2. LIVE DUAL SYNCHRONOUS DEMONSTRATION ACCENT PANEL */}
      {activeMode === 'split' && (
        <div className="bg-slate-900 text-slate-200 px-6 py-2.5 text-xs flex flex-col md:flex-row items-center justify-between gap-3 border-b border-rose-950/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <p className="font-medium">
              <span className="text-white font-bold">Modo de Avaliação Simultânea:</span> Excelente para demonstrar a velocidade e o envio em tempo real. Faça pedidos do lado esquerdo e veja-os aparecerem instantaneamente no painel da cozinha à direita!
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetMockOrders}
              className="text-[11px] text-slate-300 hover:text-white font-mono flex items-center gap-1 bg-slate-800 px-2 py-1 rounded border border-slate-700 transition"
            >
              <RefreshCw className="w-3 h-3" /> Restaurar Mock
            </button>
            <button
              onClick={clearAllOrders}
              className="text-[11px] text-slate-400 hover:text-rose-400 font-mono flex items-center gap-1 bg-slate-800 px-2 py-1 rounded border border-slate-700 transition"
            >
              <Trash2 className="w-3 h-3" /> Limpar Tudo
            </button>
          </div>
        </div>
      )}

      {/* 3. DYNAMIC PAGES ROUTE CONTAINER */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-50/50">
        
        {/* ========================================================
            CLIENT SCREEN PANEL
            ======================================================== */}
        {(activeMode === 'client' || activeMode === 'split') && (
          <section className={`flex-1 flex flex-col border-r border-slate-100 ${
            activeMode === 'split' ? 'lg:max-w-[48%] bg-white' : ''
          }`}>
            
            {/* Customer view banner header */}
            <div className="p-6 md:p-8 bg-gradient-to-b from-rose-50/20 to-white border-b border-slate-100 shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 font-bold uppercase tracking-wider mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Autoatendimento Digital por QR Code</span>
                  </div>
                  <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
                    Cardápio Premiado
                  </h2>
                  <p className="text-slate-500 text-xs mt-1 max-w-md">
                    Selecione suas preferências gourmet abaixo. Seus pedidos são enviados instantaneamente para o painel de produção da cozinha sem intermediários.
                  </p>
                </div>
                
                {/* Visual table tag badge */}
                <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-center shadow-xs">
                  <span className="text-[10px] uppercase block tracking-wider text-slate-400 leading-none">Mesa Ativa</span>
                  <span className="font-display font-extrabold text-base align-middle uppercase">{tableNumber}</span>
                </div>
              </div>

              {/* Informative alert resolving Brazilian common issues */}
              <div className="mt-4 flex gap-2 p-3 rounded-xl bg-orange-50/70 text-orange-800 text-xs border border-orange-100/50">
                <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p>
                  <strong>Preocupado com alergias ou preparos especiais?</strong> Você poderá discriminar observações individuais em cada item ao adicioná-los no carrinho.
                </p>
              </div>

              {/* Search & filters controls */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por prato, ingrediente, molho..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-slate-900 bg-white transition-all shadow-2xs"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Table Number selector for small layouts directly inside client menu */}
                <div className="sm:hidden flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium">Testando outra mesa?</span>
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className="text-xs text-slate-800 font-bold bg-transparent border-0 p-1 rounded focus:ring-0"
                  >
                    <option value="Mesa 08">Mesa 08</option>
                    <option value="Mesa 03">Mesa 03</option>
                    <option value="Mesa 05">Mesa 05</option>
                    <option value="Mesa 12">Mesa 12</option>
                    <option value="Balcão 02">Balcão 02</option>
                    <option value="Mesa VIP">Mesa VIP</option>
                  </select>
                </div>
              </div>

              {/* Seamless categories buttons */}
              <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin select-none">
                {[
                  { id: 'todos', label: 'Ver Tudo', icon: '✨' },
                  { id: 'entradas', label: 'Entradas', icon: '🍟' },
                  { id: 'hamburgueres', label: 'Hambúrgueres', icon: '🍔' },
                  { id: 'pizzas', label: 'Pizzas', icon: '🍕' },
                  { id: 'bebidas', label: 'Bebidas', icon: '🥤' },
                  { id: 'sobremesas', label: 'Sobremesas', icon: '🍰' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 border ${
                      selectedCategory === cat.id
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-white border-slate-200/70 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Menu items collection body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-h-[calc(100vh-320px)]">
              {isSkeletonLoading ? (
                /* Premium skeleton loaders resembling actual design */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map(idx => (
                    <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
                      <div className="w-full h-40 bg-slate-100 rounded-xl shimmer"></div>
                      <div className="h-4 bg-slate-200 rounded w-2/3 shimmer"></div>
                      <div className="h-3 bg-slate-100 rounded w-full shimmer"></div>
                      <div className="h-3 bg-slate-100 rounded w-5/6 shimmer"></div>
                      <div className="flex justify-between items-center pt-2">
                        <div className="h-5 bg-slate-200 rounded w-1/4 shimmer"></div>
                        <div className="h-8 bg-slate-200 rounded-lg w-1/3 shimmer"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {filteredProducts.map(prod => (
                    <div 
                      key={prod.id}
                      className="group bg-white rounded-2xl border border-slate-100/80 p-4 hover:border-slate-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                    >
                      <div>
                        {/* Food card illustration image */}
                        <div className="relative w-full h-40 rounded-xl overflow-hidden bg-slate-100">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          {/* Floating cook time indicator */}
                          <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-800 flex items-center gap-1 shadow-2xs">
                            <Clock className="w-3 h-3 text-rose-500" />
                            <span>{prod.prepTimeMinutes} min</span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <h3 className="font-display font-bold text-slate-900 group-hover:text-rose-500 transition-colors">
                            {prod.name}
                          </h3>
                          <p className="text-slate-500 text-xs mt-1 leading-relaxed line-clamp-2">
                            {prod.description}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="font-display font-extrabold text-lg text-slate-900">
                          R$ {prod.price.toFixed(2)}
                        </span>
                        
                        <button
                          onClick={() => {
                            setSelectedProduct(prod);
                            resetModalStates();
                          }}
                          className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-rose-500 transition-colors flex items-center gap-1 shadow-xs hover:shadow-md"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Nenhum produto encontrado</h4>
                  <p className="text-xs text-slate-500 mt-1">Experimente alterar a categoria ou rever os termos buscados.</p>
                </div>
              )}
            </div>

            {/* Float cart drawer trigger button */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0 sticky bottom-0 flex justify-between items-center z-10">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  {cart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {cart.reduce((s,i) => s + i.quantity, 0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold leading-none">Seu Carrinho</p>
                  <p className="text-sm font-extrabold text-slate-900">R$ {getCartTotal().toFixed(2)}</p>
                </div>
              </div>

              <button
                onClick={() => setIsCartOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition active:scale-95 flex items-center gap-2 shadow-md shadow-slate-900/10"
              >
                <span>Ver Carrinho</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </section>
        )}

        {/* ========================================================
            KITCHEN SCREEN PANEL
            ======================================================== */}
        {(activeMode === 'kitchen' || activeMode === 'split') && (
          <section className="flex-1 flex flex-col bg-slate-50 min-w-0">
            
            {/* Kitchen control bar header */}
            <div className="p-6 md:p-8 bg-white border-b border-slate-200/60 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    <span>Sistema KDS (Kitchen Display System)</span>
                  </div>
                  <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight flex items-center gap-2">
                    Painel Geral da Cozinha
                  </h2>
                </div>

                {/* Performance indicators solving Brazil kitchen metrics */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowKitchenStats(!showKitchenStats)}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{showKitchenStats ? "Ocultar " : "Mostrar "} Indicadores</span>
                  </button>
                </div>
              </div>

              {/* Core SaaS analytics indicators */}
              {showKitchenStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  
                  {/* Indicator 1 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Flame className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold leading-none">Fila de Espera</p>
                      <h4 className="font-display font-extrabold text-lg text-slate-900 leading-tight mt-1">
                        {kitchenStats.active} ativos
                      </h4>
                    </div>
                  </div>

                  {/* Indicator 2 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold leading-none">Entregues Hoje</p>
                      <h4 className="font-display font-extrabold text-lg text-slate-900 leading-tight mt-1">
                        {kitchenStats.completedToday} pedidos
                      </h4>
                    </div>
                  </div>

                  {/* Indicator 3 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold leading-none">Tempo de Preparo</p>
                      <h4 className="font-display font-extrabold text-lg text-slate-900 leading-tight mt-1">
                        ~{kitchenStats.avgMin} min
                      </h4>
                    </div>
                  </div>

                  {/* Indicator 4 */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold leading-none">Faturamento Estimado</p>
                      <h4 className="font-display font-extrabold text-lg text-slate-900 leading-tight mt-1">
                        R$ {kitchenStats.revenue.toFixed(0)}
                      </h4>
                    </div>
                  </div>

                </div>
              )}

              {/* Advanced kitchen list filtering tools */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={kitchenSearchQuery}
                    onChange={(e) => setKitchenSearchQuery(e.target.value)}
                    placeholder="Filtrar por mesa ou item..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Prioridade:</span>
                  {['todos', 'urgente', 'alta', 'media', 'baixa'].map(prio => (
                    <button
                      key={prio}
                      onClick={() => setKitchenPriorityFilter(prio)}
                      className={`px-2 py-1 rounded text-[10px] font-bold capitalize transition-colors ${
                        kitchenPriorityFilter === prio
                          ? 'bg-slate-950 text-white'
                          : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {prio === 'todos' ? 'Todas' : prio === 'media' ? 'Média' : prio}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Kanban Columns Framework */}
            <div className="flex-1 overflow-x-auto p-6 md:p-8 flex gap-6 items-start min-h-[500px]">
              
              {/* ================= COLUMN 1: NOVO PEDIDO ================= */}
              <div className="w-72 shrink-0 flex flex-col max-h-[calc(100vh-280px)] bg-slate-100/50 p-3 rounded-2xl border border-slate-200/40">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5 bg-sky-50 text-sky-700 px-2.5 py-1 rounded-lg border border-sky-200/50">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block animate-ping"></span>
                    <span className="font-display font-extrabold text-xs uppercase tracking-wide">Novos</span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-200/80 px-2 py-0.5 rounded text-slate-600">
                    {ordersByStatus.novo.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {ordersByStatus.novo.length > 0 ? (
                    ordersByStatus.novo.map(order => (
                      <KitchenOrderCard 
                        key={order.id} 
                        order={order} 
                        tick={tick} 
                        onAdvance={() => updateOrderStatus(order.id, 'preparo')}
                        onCancel={() => archiveOrder(order.id)}
                        advanceLabel="Iniciar Preparo"
                        advanceColor="bg-sky-600 hover:bg-sky-700"
                      />
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 bg-white/40 border border-dashed border-slate-200 rounded-xl">
                      <Bell className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-slate-400" />
                      <p className="text-[10px] font-semibold">Nenhum pedido pendente</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ================= COLUMN 2: EM PREPARO ================= */}
              <div className="w-72 shrink-0 flex flex-col max-h-[calc(100vh-280px)] bg-slate-100/50 p-3 rounded-2xl border border-slate-200/40">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200/50">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                    <span className="font-display font-extrabold text-xs uppercase tracking-wide">Em Preparo</span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-200/80 px-2 py-0.5 rounded text-slate-600">
                    {ordersByStatus.preparo.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {ordersByStatus.preparo.length > 0 ? (
                    ordersByStatus.preparo.map(order => (
                      <KitchenOrderCard 
                        key={order.id} 
                        order={order} 
                        tick={tick} 
                        onAdvance={() => updateOrderStatus(order.id, 'pronto')}
                        onCancel={() => updateOrderStatus(order.id, 'novo')}
                        onCancelLabel="Voltar"
                        advanceLabel="Marcar Pronto"
                        advanceColor="bg-amber-600 hover:bg-amber-700"
                      />
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 bg-white/40 border border-dashed border-slate-200 rounded-xl">
                      <Clock className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-slate-400" />
                      <p className="text-[10px] font-semibold">Nenhum prato na linha</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ================= COLUMN 3: PRONTO ================= */}
              <div className="w-72 shrink-0 flex flex-col max-h-[calc(100vh-280px)] bg-slate-100/50 p-3 rounded-2xl border border-slate-200/40">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200/50">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                    <span className="font-display font-extrabold text-xs uppercase tracking-wide">Prontos</span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-200/80 px-2 py-0.5 rounded text-slate-600">
                    {ordersByStatus.pronto.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {ordersByStatus.pronto.length > 0 ? (
                    ordersByStatus.pronto.map(order => (
                      <KitchenOrderCard 
                        key={order.id} 
                        order={order} 
                        tick={tick} 
                        onAdvance={() => updateOrderStatus(order.id, 'entregue')}
                        onCancel={() => updateOrderStatus(order.id, 'preparo')}
                        onCancelLabel="Voltar"
                        advanceLabel="Entregar Mesa"
                        advanceColor="bg-emerald-600 hover:bg-emerald-700"
                      />
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 bg-white/40 border border-dashed border-slate-200 rounded-xl">
                      <CheckCircle2 className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-slate-400" />
                      <p className="text-[10px] font-semibold">Sem pratos aguardando saída</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ================= COLUMN 4: ENTREGUES E HISTÓRICO ================= */}
              <div className="w-72 shrink-0 flex flex-col max-h-[calc(100vh-280px)] bg-slate-100/50 p-3 rounded-2xl border border-slate-200/40">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5 bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg">
                    <span className="font-display font-extrabold text-xs uppercase tracking-wide text-slate-500">Histórico de Hoje</span>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-200/80 px-2 py-0.5 rounded text-slate-600">
                    {ordersByStatus.entregue.length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {ordersByStatus.entregue.length > 0 ? (
                    ordersByStatus.entregue.map(order => (
                      <KitchenOrderCard 
                        key={order.id} 
                        order={order} 
                        tick={tick} 
                        onCancel={() => archiveOrder(order.id)}
                        onCancelLabel="Descartar"
                        hideAdvanceBtn={true}
                      />
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 bg-white/40 border border-dashed border-slate-200 rounded-xl">
                      <Info className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-slate-400" />
                      <p className="text-[10px] font-semibold">Nenhum prato servido ainda</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </section>
        )}

      </main>

      {/* ========================================================
          PRODUCT CUSTOMIZATION POPUP MODAL (PORTUGUESE)
          ======================================================== */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-slate-100"
            >
              <div className="relative h-48 bg-slate-100 sm:h-52">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-3 right-3 bg-white/90 hover:bg-white text-slate-800 p-1.5 rounded-full shadow-xs transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display font-extrabold text-xl text-slate-900">{selectedProduct.name}</h3>
                    <p className="text-xs text-rose-500 font-bold mt-1">Tempo de Preparo Estimado: {selectedProduct.prepTimeMinutes} minutos</p>
                  </div>
                  <span className="font-display font-black text-xl text-slate-900 whitespace-nowrap">
                    R$ {selectedProduct.price.toFixed(2)}
                  </span>
                </div>

                <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                  {selectedProduct.description}
                </p>

                {/* Customizable observation fields */}
                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                      Observações e Customizações (Opcional):
                    </label>
                    <textarea
                      value={modalObservation}
                      onChange={(e) => setModalObservation(e.target.value)}
                      placeholder="Ex: Ponto da carne (mal passado/bem passado), sem cebola, sem rúcula, molho à parte, ou indicar alergia alimentar severa..."
                      rows={2}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* Priority Alert Flag Modifier */}
                  <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/50 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="urgentAlertCheckbox"
                      checked={modalPriorityType === 'kids_allergy'}
                      onChange={(e) => setModalPriorityType(e.target.checked ? 'kids_allergy' : 'normal')}
                      className="mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-400"
                    />
                    <div>
                      <label htmlFor="urgentAlertCheckbox" className="text-xs font-bold text-rose-800 cursor-pointer select-none">
                        ⚠️ Alertas Especiais (Alergias ou Infantil)
                      </label>
                      <p className="text-[10px] text-rose-600 mt-0.5">
                        Marque esta opção se o prato contiver restrições alimentares extremas (lactose, amendoim, glúten) ou for para crianças pequenas. Isso marcará o pedido como prioridade na tela da cozinha!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Quantity Selector & Action Button */}
                <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setModalQuantity(q => Math.max(1, q - 1))}
                      className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 rounded-lg transition"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-display font-extrabold text-sm text-slate-900">
                      {modalQuantity}
                    </span>
                    <button
                      onClick={() => setModalQuantity(q => q + 1)}
                      className="p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 rounded-lg transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      // Automatically enrich observation with allergy notice if user flagged checked
                      let enrichedNote = modalObservation;
                      if (modalPriorityType === 'kids_allergy') {
                        enrichedNote = `[ATENÇÃO ALERGIA / INFANTIL] ${enrichedNote}`.trim();
                      }
                      addToCart(selectedProduct, modalQuantity, enrichedNote, modalPriorityType === 'kids_allergy');
                    }}
                    className="flex-1 py-3 px-5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-rose-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Confirmar Adição - R$ {(selectedProduct.price * modalQuantity).toFixed(2)}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          CART DRAWER SIDEBAR (PORTUGUESE)
          ======================================================== */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs">
            {/* Backdrop click closer */}
            <div className="absolute inset-0" onClick={() => setIsCartOpen(false)}></div>
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-100"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-rose-500" />
                  <h3 className="font-display font-extrabold text-lg text-slate-900">
                    Sacola de Pedidos
                  </h3>
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold">
                    {cart.reduce((s,i) => s + i.quantity, 0)} itens
                  </span>
                </div>

                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-slate-400 hover:text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Editable table number on drawer */}
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 shrink-0 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">Identificação da Comanda:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs bg-slate-900 text-white font-bold px-2 py-1 rounded">
                    {tableNumber}
                  </span>
                </div>
              </div>

              {/* Items scroll */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length > 0 ? (
                  cart.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-slate-900 leading-tight">
                          {item.product.name}
                        </h4>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xs font-extrabold text-slate-900">
                            R$ {item.product.price.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            unid.
                          </span>
                        </div>

                        {/* Special Custom observations highlighted */}
                        {item.observation && (
                          <div className={`mt-2 p-1.5 rounded text-[10px] leading-relaxed border ${
                            item.observation.includes('[ATENÇÃO ALERGIA')
                              ? 'bg-rose-50 text-rose-700 border-rose-100 font-medium'
                              : 'bg-slate-50 text-slate-500 border-slate-200/40 text-[9px]'
                          }`}>
                            <span className="font-medium">Obs:</span> {item.observation}
                          </div>
                        )}

                        <div className="mt-3 flex items-center justify-between">
                          {/* Quantity selectors */}
                          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg scale-90 origin-left">
                            <button
                              onClick={() => updateCartQuantity(idx, -1)}
                              className="p-1 hover:bg-white text-slate-500 rounded transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-bold text-xs">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQuantity(idx, 1)}
                              className="p-1 hover:bg-white text-slate-500 rounded transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(idx)}
                            className="text-slate-400 hover:text-rose-500 p-1.5"
                            title="Remover item da sacola"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-16 text-center text-slate-400">
                    <div className="w-12 h-12 rounded-full bg-slate-50 mx-auto flex items-center justify-center text-slate-300 mb-2">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold">Sua sacola está vazia</p>
                    <p className="text-[10px] text-slate-400 mt-1">Selecione pratos no cardápio para adicionar.</p>
                  </div>
                )}
              </div>

              {/* Bottom total review */}
              <div className="p-6 border-t border-slate-105 shrink-0 bg-slate-50">
                <div className="space-y-1.5 mb-5 text-slate-600">
                  <div className="flex justify-between text-xs">
                    <span>Taxa de Serviço (Mesa)</span>
                    <span className="text-emerald-600 font-semibold font-mono">Grátis</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Tempo Preparo Estimado</span>
                    <span className="font-mono">
                      {cart.length > 0 ? Math.max(...cart.map(i => i.product.prepTimeMinutes)) : 0} min
                    </span>
                  </div>
                  <div className="h-px bg-slate-200 my-2"></div>
                  <div className="flex justify-between items-baseline">
                    <span className="font-display font-extrabold text-sm text-slate-900">Total Geral:</span>
                    <span className="font-display font-black text-xl text-slate-900">
                      R$ {getCartTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleConfirmOrder}
                  disabled={cart.length === 0}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-rose-500 transition disabled:opacity-50 disabled:bg-slate-300 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/15"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>CONFIRMAR PEDIDO E CHAMAR COZINHA</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          SUBMISSION LOADING OVERLAY (2-3 SECONDS SIMULATED RESTAURANT VALIDATION)
          ======================================================== */}
      <AnimatePresence>
        {isSubmittingOrder && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              {/* Top ambient colored lighting gradient */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-orange-400 via-rose-500 to-indigo-500"></div>

              <div className="w-16 h-16 rounded-full bg-slate-100 mx-auto flex items-center justify-center mb-6">
                <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
              </div>

              <h3 className="font-display font-black text-lg text-slate-900">Transmitindo Pedido...</h3>
              
              {/* Stepper display */}
              <div className="mt-6 space-y-3.5 text-left max-w-xs mx-auto">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    submittingStep >= 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {submittingStep > 0 ? <Check className="w-3 h-3" /> : '1'}
                  </div>
                  <span className={`text-xs ${submittingStep >= 0 ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                    Validando comandas e quantidades...
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    submittingStep >= 1 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {submittingStep > 1 ? <Check className="w-3 h-3" /> : '2'}
                  </div>
                  <span className={`text-xs ${submittingStep >= 1 ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                    Autenticando via QR ID ({tableNumber})...
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    submittingStep >= 2 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {submittingStep > 2 ? <Check className="w-3 h-3" /> : '3'}
                  </div>
                  <span className={`text-xs ${submittingStep >= 2 ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                    Imprimindo comandas KDS na Cozinha!
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-mono mt-8">
                Operação segura criptografada - {tableNumber}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          SUCCESS NOTIFICATION POPUP PANEL
          ======================================================== */}
      <AnimatePresence>
        {submittedOrderSuccess && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl border border-slate-100"
            >
              <div className="w-12 h-12 bg-emerald-50 rounded-full mx-auto flex items-center justify-center text-emerald-500 mb-4 scale-110">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>

              <h4 className="font-display font-extrabold text-lg text-slate-900">Uau! Pedido Confirmado!</h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                As comandas de preparo foram consolidadas e o chef já visualizou a comanda do seu pedido da <strong className="text-slate-800">{tableNumber}</strong>!
              </p>

              {activeMode !== 'split' && activeMode !== 'kitchen' && (
                <div className="mt-4 p-2.5 rounded-xl bg-slate-50 text-slate-600 text-[10px] border border-slate-100">
                  💡 Experimente usar o botão de <strong>Visualização Simultânea</strong> no painel superior para ver o lado do cliente e a cozinha funcionando juntos!
                </div>
              )}

              <button
                onClick={() => setSubmittedOrderSuccess(false)}
                className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
              >
                Voltar ao Cardápio
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          REAL-TIME FLOATING TOAST GRAPHICS MANAGER
          ======================================================== */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none max-w-sm">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-3 bg-white transition hover:-translate-y-0.5 ${
              t.type === 'success' 
                ? 'border-emerald-200 text-emerald-900 shadow-emerald-100/50' 
                : t.type === 'warning'
                ? 'border-rose-200 text-rose-900 shadow-rose-100/50'
                : 'border-slate-200 text-slate-900 shadow-slate-100/50'
            }`}
          >
            {t.type === 'success' ? (
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
            ) : t.type === 'warning' ? (
              <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-500 flex items-center justify-center shrink-0">
                <Info className="w-3.5 h-3.5" />
              </div>
            )}
            <p className="flex-1 leading-normal">{t.message}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

// ========================================================
// INTERNAL DYNAMIC KITCHEN ORDER CARD COMPONENT
// ========================================================
interface KitchenOrderCardProps {
  key?: string;
  order: Order;
  tick: number;
  onAdvance?: () => void;
  onCancel?: () => void;
  onCancelLabel?: string;
  advanceLabel?: string;
  advanceColor?: string;
  hideAdvanceBtn?: boolean;
}

function KitchenOrderCard({
  order,
  tick,
  onAdvance,
  onCancel,
  onCancelLabel = "Cancelar",
  advanceLabel = "Avançar",
  advanceColor = "bg-slate-800 hover:bg-slate-700",
  hideAdvanceBtn = false
}: KitchenOrderCardProps) {
  
  // Calculate elapsed time accurate in seconds
  const elapsedMs = Date.now() - new Date(order.createdAt).getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 1000 / 60);
  const elapsedSeconds = Math.floor((elapsedMs / 1000) % 60);
  
  // Determine if order is delayed conceptually inside busy moments (longer than 10 mins and not served)
  const isDelayed = order.status !== 'entregue' && elapsedMinutes >= 10;
  
  // High contrast priority visual modifiers
  const priorityStyles = {
    urgente: 'bg-rose-500 text-white animate-pulse',
    alta: 'bg-orange-100 text-orange-900 border-orange-200',
    media: 'bg-amber-50 text-amber-900 border-amber-200',
    baixa: 'bg-slate-100 text-slate-700'
  };

  return (
    <motion.div 
      layout
      className={`bg-white rounded-xl border p-4 shadow-2xs transition-all flex flex-col justify-between ${
        isDelayed 
          ? 'border-rose-400 animate-urgent' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div>
        <div className="flex justify-between items-start gap-2">
          {/* Table index tag */}
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Mesa</span>
            <span className="font-display font-extrabold text-base text-slate-950 align-middle uppercase">{order.table}</span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-mono block leading-none">{order.id}</span>
            {/* Real-time waiting time tracker with high color codes */}
            <span className={`text-[11px] font-mono font-bold mt-0.5 inline-block px-1.5 py-0.5 rounded ${
              isDelayed 
                ? 'bg-rose-100 text-rose-700 font-semibold' 
                : 'bg-slate-100 text-slate-600'
            }`}>
              ⏱️ {elapsedMinutes.toString().padStart(2, '0')}:{elapsedSeconds.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Priority Badge */}
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-b border-slate-100 py-1.5">
          <span className="text-[10px] font-semibold text-slate-400">Classificação:</span>
          <span className={`text-[9px] uppercase font-black tracking-wider px-2 py-0.5 rounded-sm border ${priorityStyles[order.priority]}`}>
            {order.priority === 'media' ? 'Média' : order.priority}
          </span>
        </div>

        {/* Items checklist */}
        <div className="mt-3.5 space-y-2.5">
          {order.items.map((item, index) => (
            <div key={index} className="flex gap-2 text-xs">
              <span className="font-mono font-black text-rose-500 bg-rose-50 w-5 h-5 rounded flex items-center justify-center shrink-0">
                {item.quantity}x
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-slate-900 font-medium tracking-tight block">
                  {item.name}
                </span>
                
                {/* Visual modifier warnings for allergies/complimentary notes */}
                {item.observation && (
                  <span className={`text-[10px] block mt-1 p-1 rounded ${
                    item.observation.includes('[ATENÇÃO ALERGIA')
                      ? 'bg-rose-50 text-rose-700 border border-rose-100 font-extrabold'
                      : 'bg-slate-50 text-slate-500'
                  }`}>
                    💡 {item.observation}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Generic global internal alerts */}
        {order.notes && (
          <div className="mt-3 p-2 rounded-lg bg-slate-50 text-[10px] text-slate-500 border border-slate-200/50">
            {order.notes}
          </div>
        )}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100/80 flex items-center gap-1.5 justify-end">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          >
            {onCancelLabel}
          </button>
        )}

        {!hideAdvanceBtn && onAdvance && (
          <button
            onClick={onAdvance}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 transition-all ${advanceColor}`}
          >
            <span>{advanceLabel}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

    </motion.div>
  );
}
