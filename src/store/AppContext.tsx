import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, CartItem, Order, OrderStatus, Toast, RestaurantConfig, PaymentLog, UserSession, RolePermissionConfig, RestaurantId, SaaSFeature, SaaSLimit, SaaSPlan, SaaSPlanId, CategoryOption, BillingPayment, BillingCustomerStatus, RestaurantSubscriptionStatus, RestaurantOnboardingSetup } from '../types';
import { ROLE_PERMISSIONS } from '../utils/rbac';
import * as CatalogService from '../services/catalogService';
import * as OrderService from '../services/orderService';
import * as PaymentService from '../services/paymentService';
import * as RestaurantService from '../services/restaurantService';
import * as TableService from '../services/tableService';
import { getDefaultUser } from '../services/userService';
import * as PlanService from '../services/planService';
import * as AuthService from '../services/authService';
import * as BillingService from '../services/billingService';
import { isSupabaseConfigured, SupabaseAuthSession } from '../lib/supabase/client';
import * as FeatureGateService from '../services/featureGateService';

interface AppContextType {
  authSession: SupabaseAuthSession | null;
  authLoading: boolean;
  authError: string | null;
  isAuthenticated: boolean;
  hasActiveRestaurant: boolean;
  createRestaurantForCurrentUser: (setup: RestaurantOnboardingSetup) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  registerRestaurant: (email: string, password: string, restaurantName: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  currentPlan: SaaSPlan;
  currentPlanId: SaaSPlanId;
  currentSubscription: RestaurantSubscriptionStatus | null;
  billingPayments: BillingPayment[];
  billingCustomer: BillingCustomerStatus;
  refreshBilling: () => Promise<void>;
  setCurrentPlanId: (planId: SaaSPlanId) => void;
  canUseFeature: (feature: SaaSFeature) => boolean;
  getPlanLimit: (limit: SaaSLimit) => number;
  checkLimit: (limit: SaaSLimit, usage: number, increment?: number) => FeatureGateService.GateDecision;
  requireFeature: (feature: SaaSFeature) => boolean;
  requireLimit: (limit: SaaSLimit, usage: number, increment?: number) => boolean;
  showUpgradeNotice: (featureName: string) => void;
  activeRestaurantId: RestaurantId;
  setActiveRestaurantId: (restaurantId: RestaurantId) => void;
  setActiveRestaurantBySlug: (slug: string, allowPublicAccess?: boolean) => boolean;
  products: Product[];
  productCategories: CategoryOption[];
  orders: Order[];
  cart: CartItem[];
  tableNumber: string;
  setTableNumber: (num: string) => void;
  activeMode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split';
  setActiveMode: (mode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split') => void;
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
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
  paymentLogs: PaymentLog[];
  checkoutTable: (table: string, paymentMethod: 'pix' | 'credito' | 'debito' | 'dinheiro', serviceTax?: number, discount?: number) => Promise<void>;
  clearPaymentHistory: () => void;
  updateProduct: (updated: Product) => Promise<void>;
  addProduct: (newProd: Omit<Product, 'id' | 'restaurantId'>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  updateCategory: (category: CategoryOption) => Promise<void>;
  deleteCategory: (category: CategoryOption) => Promise<void>;
  publicRouteError: string | null;
  setPublicRouteError: (message: string | null) => void;
  restaurantConfig: RestaurantConfig;
  setRestaurantConfig: (config: RestaurantConfig) => Promise<void>;
  tables: string[];
  addTable: (num: string) => Promise<void>;
  updateTable: (tableId: string, label: string) => Promise<void>;
  deleteTable: (num: string, tableId?: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
type TablesByRestaurant = Record<RestaurantId, string[]>;
type Membership = AuthService.AuthMembership;

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

function mergeTablesByRestaurant(current: TablesByRestaurant, incoming: TablesByRestaurant): TablesByRestaurant {
  return Object.entries(incoming).reduce<TablesByRestaurant>((acc, [restaurantId, tables]) => {
    acc[restaurantId] = [...tables];
    return acc;
  }, { ...current });
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaultRestaurantId = RestaurantService.getDefaultRestaurantId();
  const supabaseConfigured = isSupabaseConfigured();
  const initialAuthSession = AuthService.getStoredSession();
  const [authSession, setAuthSession] = useState<SupabaseAuthSession | null>(initialAuthSession);
  const [authLoading, setAuthLoading] = useState(() => supabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const isAuthenticated = !!authSession;
  const hasActiveRestaurant = memberships.length > 0;
  const [currentPlanId, setCurrentPlanIdState] = useState<SaaSPlanId>(() => {
    if (supabaseConfigured) return PlanService.getDefaultPlanId();
    const saved = localStorage.getItem('flux_current_plan_id') as SaaSPlanId | null;
    return saved || PlanService.getDefaultPlanId();
  });
  const currentPlan = PlanService.getPlan(currentPlanId);
  const [currentSubscription, setCurrentSubscription] = useState<RestaurantSubscriptionStatus | null>(null);
  const [billingPayments, setBillingPayments] = useState<BillingPayment[]>([]);
  const [billingCustomer, setBillingCustomer] = useState<BillingCustomerStatus>({ hasCpfCnpj: false, cpfCnpjMasked: null });

  const setCurrentPlanId = (planId: SaaSPlanId) => {
    if (supabaseConfigured && currentSubscription && currentSubscription.planId !== planId) {
      addToast('Alteração manual de plano bloqueada. Use a tela de assinatura.', 'warning');
      return;
    }
    setCurrentPlanIdState(planId);
    if (!supabaseConfigured) localStorage.setItem('flux_current_plan_id', planId);
  };

  const hasBillingEntitlement = !supabaseConfigured || currentSubscription?.status === 'trialing' || currentSubscription?.status === 'active';
  const effectivePlan = hasBillingEntitlement ? currentPlan : PlanService.getPlan(PlanService.getDefaultPlanId());
  const canUseFeature = (feature: SaaSFeature) => FeatureGateService.canUseFeature(effectivePlan, hasBillingEntitlement, feature).allowed;
  const getPlanLimit = (limit: SaaSLimit) => effectivePlan.limits[limit];
  const checkLimit = (limit: SaaSLimit, usage: number, increment = 1) => FeatureGateService.checkLimit(effectivePlan, limit, usage, increment);
  const requireFeature = (feature: SaaSFeature) => {
    const decision = FeatureGateService.canUseFeature(effectivePlan, hasBillingEntitlement, feature);
    if (!decision.allowed) addToast(decision.message ?? 'Recurso indisponível no plano atual.', 'warning');
    return decision.allowed;
  };
  const requireLimit = (limit: SaaSLimit, usage: number, increment = 1) => {
    const decision = FeatureGateService.checkLimit(effectivePlan, limit, usage, increment);
    if (!decision.allowed) addToast(decision.message ?? 'Limite do plano atingido.', 'warning');
    return decision.allowed;
  };

  const [activeRestaurantId, setActiveRestaurantIdState] = useState<RestaurantId>(() => {
    return supabaseConfigured ? defaultRestaurantId : localStorage.getItem('flux_active_restaurant_id') || defaultRestaurantId;
  });
  const [publicRestaurantAccessId, setPublicRestaurantAccessId] = useState<RestaurantId | null>(null);

  const [currentUser, setCurrentUserInternal] = useState<UserSession>(() => {
    if (supabaseConfigured) return getDefaultUser(activeRestaurantId);
    const saved = readJson<UserSession>('flux_current_user');
    if (saved && saved.restaurantId === activeRestaurantId) return saved;
    return getDefaultUser(activeRestaurantId);
  });

  const login = async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const session = await AuthService.login(email, password);
      let activeMemberships = await AuthService.getActiveMemberships();
      if (activeMemberships.length === 0) {
        const onboarding = await AuthService.completePendingOnboarding(session);
        if (onboarding) {
          activeMemberships = [{
            id: 'onboarding-' + onboarding.restaurantId,
            restaurantId: onboarding.restaurantId,
            profileId: session.user.id,
            role: onboarding.memberRole,
            active: true
          }];
          setCurrentPlanIdState(onboarding.planId);
          localStorage.setItem('flux_current_plan_id', onboarding.planId);
          addToast('Restaurante criado com sucesso. Bem-vindo ao FluxMenu!', 'success');
        }
      }
      if (activeMemberships.length === 0) {
        setAuthSession(session);
        setMemberships([]);
        setActiveRestaurantIdState(defaultRestaurantId);
        setPublicRestaurantAccessId(null);
        setCurrentUserInternal(getDefaultUser(defaultRestaurantId));
        localStorage.removeItem('flux_active_restaurant_id');
        return;
      }
      const firstMembership = activeMemberships[0];
      setAuthSession(session);
      setMemberships(activeMemberships);
      setPublicRestaurantAccessId(null);
      setActiveRestaurantIdState(firstMembership.restaurantId);
      setCurrentUserInternal(AuthService.getUserSessionFromMembership(session, firstMembership, firstMembership.restaurantId));
      localStorage.setItem('flux_active_restaurant_id', firstMembership.restaurantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao autenticar.';
      setAuthError(message);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };


  const registerRestaurant = async (email: string, password: string, restaurantName: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const result = await AuthService.registerRestaurant({ email, password, restaurantName });
      setAuthSession(result.session);
      setPublicRestaurantAccessId(null);

      if (!result.onboarding) {
        setMemberships([]);
        setActiveRestaurantIdState(defaultRestaurantId);
        setCurrentUserInternal(getDefaultUser(defaultRestaurantId));
        localStorage.removeItem('flux_active_restaurant_id');
        addToast('Conta criada. Conclua a configuracao inicial da loja.', 'success');
        return;
      }

      const membership: Membership = {
        id: 'onboarding-' + result.onboarding.restaurantId,
        restaurantId: result.onboarding.restaurantId,
        profileId: result.session.user.id,
        role: result.onboarding.memberRole,
        active: true
      };
      setMemberships([membership]);
      setActiveRestaurantIdState(result.onboarding.restaurantId);
      setCurrentUserInternal(AuthService.getUserSessionFromMembership(result.session, membership, result.onboarding.restaurantId));
      setCurrentPlanIdState(result.onboarding.planId);
      localStorage.setItem('flux_active_restaurant_id', result.onboarding.restaurantId);
      localStorage.setItem('flux_current_plan_id', result.onboarding.planId);
      addToast('Restaurante criado com sucesso. Bem-vindo ao FluxMenu!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao criar conta.';
      setAuthError(message);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };


  const createRestaurantForCurrentUser = async (setup: RestaurantOnboardingSetup) => {
    if (!authSession) throw new Error('Sessão autenticada obrigatória.');
    setAuthLoading(true);
    setAuthError(null);
    try {
      AuthService.savePendingOnboarding({ email: authSession.user.email, restaurantName: setup.restaurantName });
      const onboarding = await AuthService.createRestaurantOnboarding(setup);
      if (!onboarding) throw new Error('Não foi possível concluir o onboarding.');
      const membership: Membership = {
        id: 'onboarding-' + onboarding.restaurantId,
        restaurantId: onboarding.restaurantId,
        profileId: authSession.user.id,
        role: onboarding.memberRole,
        active: true
      };
      setMemberships([membership]);
      setPublicRestaurantAccessId(null);
      setActiveRestaurantIdState(onboarding.restaurantId);
      setCurrentUserInternal(AuthService.getUserSessionFromMembership(authSession, membership, onboarding.restaurantId));
      setCurrentPlanIdState(onboarding.planId);
      localStorage.setItem('flux_active_restaurant_id', onboarding.restaurantId);
      localStorage.setItem('flux_current_plan_id', onboarding.planId);
      addToast('Restaurante criado com sucesso. Bem-vindo ao FluxMenu!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao criar restaurante.';
      setAuthError(message);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await AuthService.resendConfirmationEmail(email);
      addToast('Email de confirmação reenviado.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao reenviar confirmação.';
      setAuthError(message);
      throw error;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setAuthLoading(true);
    try {
      await AuthService.logout();
      resetAuthenticatedRuntimeState();
    } finally {
      setAuthLoading(false);
    }
  };

  const [activeMode, setActiveModeState] = useState<'client' | 'kitchen' | 'cashier' | 'admin' | 'split'>(() => {
    const savedMode = localStorage.getItem('flux_active_mode') as any;
    const allowed = ROLE_PERMISSIONS[currentUser.role].allowedModes;
    if (savedMode && allowed.includes(savedMode)) return savedMode;
    return allowed.includes('split') ? 'split' : allowed[0];
  });

  useEffect(() => {
    let cancelled = false;
    async function restorePersistedSession() {
      if (!supabaseConfigured) {
        setAuthLoading(false);
        return;
      }

      if (!authSession) {
        resetAuthenticatedRuntimeState();
        setAuthLoading(false);
        return;
      }

      try {
        const restored = await AuthService.restoreSession();
        if (cancelled) return;
        if (!restored) {
          resetAuthenticatedRuntimeState();
          setAuthLoading(false);
          return;
        }
        setAuthSession(restored);
      } catch {
        if (!cancelled) {
          resetAuthenticatedRuntimeState();
          setAuthLoading(false);
        }
      }
    }
    void restorePersistedSession();
    return () => {
      cancelled = true;
    };
  }, []);


  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 4500);
  };
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const [restaurantConfigs, setRestaurantConfigs] = useState<RestaurantConfig[]>(() => {
    if (supabaseConfigured) return [];
    const saved = readJson<RestaurantConfig[]>('flux_restaurant_configs');
    const legacyConfig = readJson<RestaurantConfig>('flux_restaurant_config');
    const seed = RestaurantService.getRestaurantProfiles();
    const normalizedSaved = saved ?? (legacyConfig ? [{ ...legacyConfig, restaurantId: legacyConfig.restaurantId ?? defaultRestaurantId }] : null);
    return mergeConfigsByRestaurantId(normalizedSaved, seed);
  });

  const [allProducts, setAllProducts] = useState<Product[]>(() => {
    if (supabaseConfigured) return [];
    const saved = readJson<Product[]>('flux_products');
    const normalizedSaved = saved ? CatalogService.ensureProductRestaurantIds(saved, defaultRestaurantId) : null;
    const seed = [...CatalogService.getProducts('rest_gusto'), ...CatalogService.getProducts('rest_bistro')];
    return mergeByRestaurantIdAndId(normalizedSaved, seed);
  });

  const [tablesByRestaurant, setTablesByRestaurant] = useState<TablesByRestaurant>(() => {
    if (supabaseConfigured) return {};
    const saved = getSavedTablesByRestaurant(defaultRestaurantId) ?? {};
    return {
      rest_gusto: saved.rest_gusto ?? TableService.getTables('rest_gusto'),
      rest_bistro: saved.rest_bistro ?? TableService.getTables('rest_bistro')
    };
  });

  const [tableNumber, setTableNumberState] = useState<string>(() => {
    if (supabaseConfigured) return '';
    return localStorage.getItem('flux_current_table_' + activeRestaurantId) || TableService.getTables(activeRestaurantId)[0] || 'Mesa 01';
  });

  const [allOrders, setAllOrders] = useState<Order[]>(() => {
    if (supabaseConfigured) return [];
    const saved = readJson<Order[]>('flux_orders');
    const normalizedSaved = saved ? OrderService.ensureOrderRestaurantIds(saved, defaultRestaurantId) : null;
    const seed = [...OrderService.getOrders('rest_gusto'), ...OrderService.getOrders('rest_bistro')];
    return mergeByRestaurantIdAndId(normalizedSaved, seed);
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    if (supabaseConfigured) return [];
    const saved = readJson<CartItem[]>('flux_cart_' + activeRestaurantId) ?? readJson<CartItem[]>('flux_cart');
    return saved?.filter(item => item.product.restaurantId === activeRestaurantId) ?? [];
  });

  const [categoryVersion, setCategoryVersion] = useState(0);
  const [publicRouteError, setPublicRouteError] = useState<string | null>(null);

  const [allPaymentLogs, setAllPaymentLogs] = useState<PaymentLog[]>(() => {
    if (supabaseConfigured) return [];
    const saved = readJson<PaymentLog[]>('flux_payment_logs');
    return saved ? PaymentService.ensurePaymentLogRestaurantIds(saved, defaultRestaurantId) : [];
  });

  function resetAuthenticatedRuntimeState() {
    setAuthSession(null);
    setMemberships([]);
    setCurrentUserInternal(getDefaultUser(defaultRestaurantId));
    setActiveRestaurantIdState(defaultRestaurantId);
    setPublicRestaurantAccessId(null);
    setCurrentPlanIdState(PlanService.getDefaultPlanId());
    setCurrentSubscription(null);
    setBillingPayments([]);
    setBillingCustomer({ hasCpfCnpj: false, cpfCnpjMasked: null });
    setRestaurantConfigs(supabaseConfigured ? [] : RestaurantService.getRestaurantProfiles());
    setAllProducts(supabaseConfigured ? [] : [...CatalogService.getProducts('rest_gusto'), ...CatalogService.getProducts('rest_bistro')]);
    setTablesByRestaurant(supabaseConfigured ? {} : { rest_gusto: TableService.getTables('rest_gusto'), rest_bistro: TableService.getTables('rest_bistro') });
    setTableNumberState(supabaseConfigured ? '' : 'Mesa 01');
    setAllOrders(supabaseConfigured ? [] : [...OrderService.getOrders('rest_gusto'), ...OrderService.getOrders('rest_bistro')]);
    setAllPaymentLogs([]);
    setCart([]);
    setCategoryVersion(prev => prev + 1);
    setPublicRouteError(null);
    setActiveModeState('client');
    localStorage.removeItem('flux_active_restaurant_id');
    localStorage.removeItem('flux_current_user');
    localStorage.removeItem('flux_current_plan_id');
    localStorage.removeItem('flux_active_mode');
    Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter((key): key is string => Boolean(key && key.startsWith('flux_cart_')))
      .forEach(key => localStorage.removeItem(key));
  }

  useEffect(() => {
    let cancelled = false;

    async function hydrateSupabaseReads() {
      if (supabaseConfigured && authSession) setAuthLoading(true);
      const [restaurantLoad, catalogLoad, tableLoad, planLoad, activeMemberships] = await Promise.all([
        RestaurantService.loadRestaurantsWithFallback(),
        CatalogService.loadProductsWithFallback(),
        TableService.loadTablesWithFallback(),
        PlanService.loadPlansWithFallback(),
        authSession ? AuthService.getActiveMemberships() : Promise.resolve([])
      ]);

      if (cancelled) return;

      const allFromSupabase = restaurantLoad.source === 'supabase'
        && catalogLoad.source === 'supabase'
        && tableLoad.source === 'supabase'
        && planLoad.source === 'supabase';

      if (allFromSupabase) {
        const memberRestaurantIds = activeMemberships.map(membership => membership.restaurantId);
        const publicRestaurantIds = restaurantLoad.restaurants.map(restaurant => restaurant.id);
        const isPublicOverrideActive = Boolean(publicRestaurantAccessId && publicRestaurantAccessId === activeRestaurantId && publicRestaurantIds.includes(activeRestaurantId));
        const restaurantIds = authSession
          ? Array.from(new Set([...memberRestaurantIds, ...(isPublicOverrideActive ? [activeRestaurantId] : [])]))
          : publicRestaurantIds;
        const nextRestaurantId = authSession && !isPublicOverrideActive
          ? (memberRestaurantIds.includes(activeRestaurantId) ? activeRestaurantId : memberRestaurantIds[0] ?? defaultRestaurantId)
          : (restaurantIds.includes(activeRestaurantId) ? activeRestaurantId : restaurantIds[0] ?? defaultRestaurantId);
        const nextPlanId = PlanService.getPlanIdForRestaurant(nextRestaurantId, currentPlanId);

        setMemberships(activeMemberships);
        setRestaurantConfigs(restaurantLoad.profiles.filter(profile => restaurantIds.includes(profile.restaurantId)));
        setAllProducts(catalogLoad.products.filter(product => restaurantIds.includes(product.restaurantId)));
        setTablesByRestaurant(Object.fromEntries(Object.entries(tableLoad.tablesByRestaurant).filter(([restaurantId]) => restaurantIds.includes(restaurantId))));
        setCart(prev => prev.filter(item => item.product.restaurantId === nextRestaurantId));

        if (authSession && memberRestaurantIds.includes(nextRestaurantId)) {
          const [orderLoad, paymentLogLoad] = await Promise.all([
            OrderService.loadOrdersWithFallback(nextRestaurantId),
            PaymentService.loadPaymentLogsWithFallback(nextRestaurantId)
          ]);
          setAllOrders(prev => [
            ...prev.filter(order => order.restaurantId !== nextRestaurantId),
            ...orderLoad.orders
          ]);
          setAllPaymentLogs(prev => [
            ...prev.filter(log => log.restaurantId !== nextRestaurantId),
            ...paymentLogLoad.paymentLogs
          ]);
        }

        const activeMembership = activeMemberships.find(membership => membership.restaurantId === nextRestaurantId);
        if (authSession && activeMembership) {
          setCurrentUserInternal(AuthService.getUserSessionFromMembership(authSession, activeMembership, nextRestaurantId));
        }

        if (nextRestaurantId !== activeRestaurantId) {
          setActiveRestaurantIdState(nextRestaurantId);
          localStorage.setItem('flux_active_restaurant_id', nextRestaurantId);
        }

        const nextSubscription = PlanService.getSubscriptionForRestaurant(nextRestaurantId);
        setCurrentSubscription(nextSubscription ? {
          id: nextSubscription.id,
          restaurantId: nextSubscription.restaurantId,
          planId: nextSubscription.planId,
          status: nextSubscription.status,
          billingStatus: nextSubscription.billingStatus,
          checkoutUrl: nextSubscription.checkoutUrl,
          trialEndsAt: nextSubscription.trialEndsAt,
          currentPeriodEnd: nextSubscription.currentPeriodEnd,
          cancelAtPeriodEnd: nextSubscription.cancelAtPeriodEnd
        } : null);

        if (nextPlanId !== currentPlanId) {
          setCurrentPlanIdState(nextPlanId);
        }

        if (authSession) setAuthLoading(false);
        return;
      }

      setRestaurantConfigs(prev => mergeConfigsByRestaurantId(prev, restaurantLoad.profiles));
      setAllProducts(prev => mergeByRestaurantIdAndId(prev, CatalogService.ensureProductRestaurantIds(catalogLoad.products, defaultRestaurantId)));
      setTablesByRestaurant(prev => mergeTablesByRestaurant(prev, tableLoad.tablesByRestaurant));
      if (authSession) setAuthLoading(false);
    }

    hydrateSupabaseReads().catch(error => {
      if (import.meta.env.DEV) console.warn('[FluxMenu data] Supabase bootstrap failed. Keeping local fallback data.', error);
      if (!cancelled && authSession) setAuthLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeRestaurantId, authSession, currentPlanId, defaultRestaurantId, publicRestaurantAccessId, supabaseConfigured]);

  const refreshBilling = async () => {
    if (!authSession || !activeRestaurantId) return;
    const billing = await BillingService.loadBillingStatus(activeRestaurantId);
    setCurrentSubscription(billing.subscription);
    setBillingPayments(billing.payments);
    setBillingCustomer(billing.customer);
    if (billing.subscription?.planId && billing.subscription.planId !== currentPlanId) setCurrentPlanIdState(billing.subscription.planId);
  };

  useEffect(() => {
    const nextPlanId = PlanService.getPlanIdForRestaurant(activeRestaurantId, currentPlanId);
    const nextSubscription = PlanService.getSubscriptionForRestaurant(activeRestaurantId);
    setCurrentSubscription(nextSubscription ? {
      id: nextSubscription.id,
      restaurantId: nextSubscription.restaurantId,
      planId: nextSubscription.planId,
      status: nextSubscription.status,
      billingStatus: nextSubscription.billingStatus,
      checkoutUrl: nextSubscription.checkoutUrl,
      trialEndsAt: nextSubscription.trialEndsAt,
      currentPeriodEnd: nextSubscription.currentPeriodEnd,
      cancelAtPeriodEnd: nextSubscription.cancelAtPeriodEnd
    } : null);
    if (nextPlanId !== currentPlanId) setCurrentPlanIdState(nextPlanId);
  }, [activeRestaurantId]);

  const restaurantConfig = useMemo(() => {
    if (supabaseConfigured) {
      return restaurantConfigs.find(config => config.restaurantId === activeRestaurantId)
        ?? restaurantConfigs[0]
        ?? { restaurantId: activeRestaurantId, name: 'FluxMenu', rating: '', deliveryEstimate: '', address: '', instagram: '' };
    }
    return RestaurantService.getRestaurantConfigForActive(restaurantConfigs, activeRestaurantId);
  }, [activeRestaurantId, restaurantConfigs, supabaseConfigured]);
  const products = useMemo(() => CatalogService.getProductsForRestaurant(allProducts, activeRestaurantId), [allProducts, activeRestaurantId]);
  const productCategories = useMemo(() => CatalogService.getProductCategories(activeRestaurantId), [activeRestaurantId, categoryVersion]);
  const tables = useMemo(() => tablesByRestaurant[activeRestaurantId] ?? (supabaseConfigured ? [] : TableService.getTables(activeRestaurantId)), [tablesByRestaurant, activeRestaurantId, supabaseConfigured]);
  const orders = useMemo(() => OrderService.getOrdersForRestaurant(allOrders, activeRestaurantId), [allOrders, activeRestaurantId]);
  const paymentLogs = useMemo(() => PaymentService.getPaymentLogsForRestaurant(allPaymentLogs, activeRestaurantId), [allPaymentLogs, activeRestaurantId]);

  useEffect(() => { if (!supabaseConfigured) localStorage.setItem('flux_current_plan_id', currentPlanId); }, [currentPlanId, supabaseConfigured]);
  useEffect(() => { if (!publicRestaurantAccessId) localStorage.setItem('flux_active_restaurant_id', activeRestaurantId); }, [activeRestaurantId, publicRestaurantAccessId]);
  useEffect(() => { if (!supabaseConfigured) localStorage.setItem('flux_current_user', JSON.stringify(currentUser)); }, [currentUser, supabaseConfigured]);
  useEffect(() => { if (!supabaseConfigured) localStorage.setItem('flux_restaurant_configs', JSON.stringify(restaurantConfigs)); }, [restaurantConfigs, supabaseConfigured]);
  useEffect(() => { if (!supabaseConfigured) localStorage.setItem('flux_products', JSON.stringify(allProducts)); }, [allProducts, supabaseConfigured]);
  useEffect(() => { if (!supabaseConfigured) localStorage.setItem('flux_tables_by_restaurant', JSON.stringify(tablesByRestaurant)); }, [tablesByRestaurant, supabaseConfigured]);
  useEffect(() => { if (!supabaseConfigured) localStorage.setItem('flux_orders', JSON.stringify(allOrders)); }, [allOrders, supabaseConfigured]);
  useEffect(() => { if (!supabaseConfigured) localStorage.setItem('flux_cart_' + activeRestaurantId, JSON.stringify(cart)); }, [cart, activeRestaurantId, supabaseConfigured]);
  useEffect(() => { if (!supabaseConfigured) localStorage.setItem('flux_payment_logs', JSON.stringify(allPaymentLogs)); }, [allPaymentLogs, supabaseConfigured]);

  useEffect(() => {
    const savedTable = supabaseConfigured ? null : localStorage.getItem('flux_current_table_' + activeRestaurantId);
    setTableNumberState(savedTable || tables[0] || (supabaseConfigured ? '' : 'Mesa 01'));
    setCart(prev => prev.filter(item => item.product.restaurantId === activeRestaurantId));

    if (authSession) {
      const membership = memberships.find(current => current.restaurantId === activeRestaurantId);
      if (membership && currentUser.restaurantId !== activeRestaurantId) {
        setCurrentUserInternal(AuthService.getUserSessionFromMembership(authSession, membership, activeRestaurantId));
      }
      return;
    }

    if (currentUser.restaurantId !== activeRestaurantId) setCurrentUserInternal(getDefaultUser(activeRestaurantId));
  }, [activeRestaurantId, authSession, currentUser.restaurantId, memberships, supabaseConfigured, tables]);


  useEffect(() => {
    if (!supabaseConfigured || !authSession || !activeRestaurantId) return;
    if (!memberships.some(membership => membership.restaurantId === activeRestaurantId)) return;
    let cancelled = false;

    const reloadOrdersAndPayments = () => {
      Promise.all([
        OrderService.loadOrdersWithFallback(activeRestaurantId),
        PaymentService.loadPaymentLogsWithFallback(activeRestaurantId)
      ])
        .then(([orderResult, paymentResult]) => {
          if (cancelled) return;
          setAllOrders(prev => [
            ...prev.filter(order => order.restaurantId !== activeRestaurantId),
            ...orderResult.orders
          ]);
          setAllPaymentLogs(prev => [
            ...prev.filter(log => log.restaurantId !== activeRestaurantId),
            ...paymentResult.paymentLogs
          ]);
        })
        .catch(error => {
          if (import.meta.env.DEV) console.warn('[FluxMenu data] Cashier realtime reload failed.', error);
        });
    };

    reloadOrdersAndPayments();
    const unsubscribeOrders = OrderService.subscribeToRestaurantOrders(activeRestaurantId, reloadOrdersAndPayments);
    const unsubscribePayments = PaymentService.subscribeToRestaurantPayments(activeRestaurantId, reloadOrdersAndPayments);
    return () => {
      cancelled = true;
      unsubscribeOrders();
      unsubscribePayments();
    };
  }, [activeRestaurantId, authSession, memberships, supabaseConfigured]);

  const showUpgradeNotice = (featureName: string) => {
    addToast(featureName + ' está disponível em um plano superior.', 'info');
  };

  const setActiveRestaurantId = (restaurantId: RestaurantId) => {
    if (authSession && !memberships.some(membership => membership.restaurantId === restaurantId)) {
      addToast('Usuário não está vinculado a este restaurante.', 'warning');
      return;
    }
    const membership = memberships.find(current => current.restaurantId === restaurantId);
    setPublicRestaurantAccessId(null);
    if (authSession && membership) setCurrentUserInternal(AuthService.getUserSessionFromMembership(authSession, membership, restaurantId));
    setActiveRestaurantIdState(restaurantId);
    localStorage.setItem('flux_active_restaurant_id', restaurantId);
  };

  const setActiveRestaurantBySlug = (slug: string, allowPublicAccess = false): boolean => {
    const normalizedSlug = slug.trim().toLowerCase();
    const config = restaurantConfigs.find(restaurant => restaurant.slug === normalizedSlug);
    if (!config) return false;
    if (config.restaurantId !== activeRestaurantId) {
      if (allowPublicAccess) {
        setPublicRestaurantAccessId(config.restaurantId);
        setActiveRestaurantIdState(config.restaurantId);
      } else {
        setActiveRestaurantId(config.restaurantId);
      }
    }
    return true;
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

  const setRestaurantConfig = async (config: RestaurantConfig) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canConfigureRestaurant) {
      addToast('Operação não autorizada para seu nível de acesso!', 'warning');
      return;
    }

    const nextConfig = { ...config, restaurantId: activeRestaurantId };
    setRestaurantConfigs(prev => RestaurantService.updateRestaurantConfig(prev, nextConfig));

    if (supabaseConfigured) {
      try {
        const savedConfig = await RestaurantService.saveRestaurantConfig(nextConfig);
        setRestaurantConfigs(prev => RestaurantService.updateRestaurantConfig(prev, savedConfig));
        addToast('Informações da loja salvas no Supabase.', 'success');
      } catch (error) {
        console.error(error);
        addToast('Não foi possível salvar as informações da loja no Supabase.', 'warning');
        throw error;
      }
    }
  };

  const setTableNumber = (num: string) => {
    setTableNumberState(num);
    if (!supabaseConfigured) localStorage.setItem('flux_current_table_' + activeRestaurantId, num);
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

    try {
      const newOrder = supabaseConfigured
        ? await OrderService.createOrderInSupabase(cart, tableNumber, activeRestaurantId)
        : OrderService.createOrder(cart, tableNumber, activeRestaurantId);
      setAllOrders(prev => OrderService.upsertOrder(prev, newOrder));
      setCart([]);
      addToast('Pedido ' + newOrder.id + ' enviado para a produção!', 'success');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      addToast(error instanceof Error ? error.message : 'Não foi possível enviar o pedido.', 'warning');
      throw error;
    }
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

    if (supabaseConfigured) {
      OrderService.updateOrderStatusInSupabase(orderId, activeRestaurantId, nextStatus)
        .then(updated => {
          setAllOrders(prev => OrderService.upsertOrder(prev, updated));
          addToast('Pedido ' + orderId + ' (' + updated.table + ') agora está ' + desc, 'info');
        })
        .catch(error => {
          console.error(error);
          addToast('Não foi possível atualizar o status no Supabase.', 'warning');
        });
      return;
    }

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


  const updateProduct = async (updated: Product) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast('Apenas gestores com permissão de edição de catálogo podem alterar produtos!', 'warning');
      return;
    }

    try {
      const savedProduct = await CatalogService.saveProduct({ ...updated, restaurantId: activeRestaurantId });
      setAllProducts(prev => CatalogService.updateProduct(prev, savedProduct));
      addToast('Produto "' + savedProduct.name + '" salvo no Supabase.', 'success');
    } catch (error) {
      console.error(error);
      addToast('Não foi possível salvar no Supabase. Verifique conexão e permissões.', 'warning');
    }
  };

  const addProduct = async (newProd: Omit<Product, 'id' | 'restaurantId'>) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast('Apenas gestores com permissão de edição de catálogo podem adicionar produtos!', 'warning');
      return;
    }

    if (!requireLimit('maxProducts', products.length, 1)) return;

    try {
      const createdProduct = await CatalogService.createProductInSupabase({ ...newProd, restaurantId: activeRestaurantId });
      setAllProducts(prev => [...prev, createdProduct]);
      addToast('Produto "' + createdProduct.name + '" criado no Supabase.', 'success');
    } catch (error) {
      console.error(error);
      addToast(error instanceof Error ? error.message : 'Não foi possível criar o produto.', 'warning');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast('Apenas gestores com permissão de edição de catálogo podem remover produtos!', 'warning');
      return;
    }

    try {
      await CatalogService.deactivateProductInSupabase(id, activeRestaurantId);
      setAllProducts(prev => CatalogService.deleteProduct(prev, id, activeRestaurantId));
      addToast('Produto removido do cardápio.', 'warning');
    } catch (error) {
      console.error(error);
      addToast('Não foi possível remover o produto no Supabase.', 'warning');
    }
  };

  const addCategory = async (name: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast('Operação não autorizada para seu nível de acesso!', 'warning');
      return;
    }

    try {
      await CatalogService.createCategoryInSupabase(activeRestaurantId, name);
      setCategoryVersion(prev => prev + 1);
      addToast('Categoria criada no Supabase.', 'success');
    } catch (error) {
      console.error(error);
      addToast(error instanceof Error ? error.message : 'Não foi possível criar a categoria.', 'warning');
    }
  };

  const updateCategory = async (category: CategoryOption) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast('Operação não autorizada para seu nível de acesso!', 'warning');
      return;
    }

    try {
      await CatalogService.updateCategoryInSupabase(category);
      setCategoryVersion(prev => prev + 1);
      addToast('Categoria salva no Supabase.', 'success');
    } catch (error) {
      console.error(error);
      addToast(error instanceof Error ? error.message : 'Não foi possível salvar a categoria.', 'warning');
    }
  };

  const deleteCategory = async (category: CategoryOption) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canEditProducts) {
      addToast('Operação não autorizada para seu nível de acesso!', 'warning');
      return;
    }

    try {
      await CatalogService.deactivateCategoryInSupabase(category);
      setCategoryVersion(prev => prev + 1);
      addToast('Categoria removida do cardápio.', 'warning');
    } catch (error) {
      console.error(error);
      addToast('Não foi possível remover a categoria no Supabase.', 'warning');
    }
  };

  const addTable = async (num: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canManageTables) {
      addToast('Operação de mesas não autorizada para seu nível de acesso!', 'warning');
      return;
    }
    if (tables.includes(num)) {
      addToast('Esta mesa já existe!', 'warning');
      return;
    }

    if (!requireLimit('maxTables', tables.length, 1)) return;

    if (supabaseConfigured) {
      await TableService.createTableInSupabase(activeRestaurantId, num);
    }

    setTablesByRestaurant(prev => ({ ...prev, [activeRestaurantId]: TableService.addTable(prev[activeRestaurantId] ?? [], num) }));
    addToast(num + ' cadastrada com sucesso', 'success');
  };

  const updateTable = async (tableId: string, label: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canManageTables) {
      addToast('Operação de mesas não autorizada para seu nível de acesso!', 'warning');
      return;
    }
    if (supabaseConfigured) {
      await TableService.updateTableInSupabase(activeRestaurantId, tableId, label);
    }
    const currentLabel = tables.find(table => table === label) ? label : '';
    setTablesByRestaurant(prev => ({
      ...prev,
      [activeRestaurantId]: (prev[activeRestaurantId] ?? []).map(table => table === currentLabel ? label : table)
    }));
    addToast('Mesa atualizada com sucesso', 'success');
  };

  const deleteTable = async (num: string, tableId?: string) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canManageTables) {
      addToast('Operação de mesas não autorizada para seu nível de acesso!', 'warning');
      return;
    }
    if (supabaseConfigured && tableId) {
      await TableService.setTableActiveInSupabase(activeRestaurantId, tableId, false);
    }
    setTablesByRestaurant(prev => ({ ...prev, [activeRestaurantId]: TableService.deleteTable(prev[activeRestaurantId] ?? [], num) }));
    addToast(num + ' removida do sistema', 'warning');
  };

  const checkoutTable = async (table: string, paymentMethod: 'pix' | 'credito' | 'debito' | 'dinheiro', serviceTax = 0, discount = 0) => {
    if (!ROLE_PERMISSIONS[currentUser.role].canProcessCheckout) {
      addToast('Seu perfil não possui autorização para receber pagamentos e faturar mesas!', 'warning');
      return;
    }
    const unpaidOrders = PaymentService.getUnpaidOrdersByTable(allOrders, table, activeRestaurantId);
    if (unpaidOrders.length === 0) {
      addToast('A ' + table + ' não possui faturas pendentes de pagamento!', 'warning');
      return;
    }

    try {
      const newLog = supabaseConfigured
        ? await PaymentService.closeTablePaymentInSupabase({ restaurantId: activeRestaurantId, table, paymentMethod, serviceTax, discount })
        : PaymentService.createPaymentLog(activeRestaurantId, table, unpaidOrders, paymentMethod);
      setAllOrders(prev => PaymentService.checkoutOrders(prev, table, activeRestaurantId, paymentMethod));
      setAllPaymentLogs(prev => [newLog, ...prev.filter(log => log.id !== newLog.id)]);
      const methodNames = { pix: 'PIX', credito: 'Cartão de Crédito', debito: 'Cartão de Débito', dinheiro: 'Dinheiro' };
      addToast('Mesa ' + table + ' finalizada via ' + methodNames[paymentMethod] + '! Total: R$ ' + newLog.amount.toFixed(2), 'success');
    } catch (error) {
      console.error(error);
      addToast(error instanceof Error ? error.message : 'Não foi possível fechar a mesa.', 'warning');
      throw error;
    }
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
      authSession,
      authLoading,
      authError,
      isAuthenticated,
      hasActiveRestaurant,
      createRestaurantForCurrentUser,
      login,
      registerRestaurant,
      resendConfirmationEmail,
      logout,
      currentPlan,
      currentPlanId,
      currentSubscription,
      billingPayments,
      billingCustomer,
      refreshBilling,
      setCurrentPlanId,
      canUseFeature,
      getPlanLimit,
      checkLimit,
      requireFeature,
      requireLimit,
      showUpgradeNotice,
      activeRestaurantId,
      setActiveRestaurantId,
      setActiveRestaurantBySlug,
      products,
      productCategories,
      orders,
      cart,
      tableNumber,
      setTableNumber,
      activeMode,
      setActiveMode,
      toasts,
      addToast,
      removeToast,
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
      paymentLogs,
      checkoutTable,
      clearPaymentHistory,
      updateProduct,
      addProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      publicRouteError,
      setPublicRouteError,
      restaurantConfig,
      setRestaurantConfig,
      tables,
      addTable,
      updateTable,
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
