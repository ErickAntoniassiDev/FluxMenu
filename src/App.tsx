import React, { useEffect } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { Header } from './features/shared/Header';
import { ClientMenu } from './features/customer/ClientMenu';
import { KitchenPanel } from './features/kitchen/KitchenPanel';
import { AdminPanel } from './features/admin/AdminPanel';
import { CashierPanel } from './features/cashier/CashierPanel';
import { ToastContainer } from './features/shared/ToastContainer';
import { LoginScreen } from './features/shared/LoginScreen';
import { OnboardingScreen } from './features/shared/OnboardingScreen';
import { HashRouter, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ROLE_PERMISSIONS } from './utils/rbac';

type AppMode = 'client' | 'kitchen' | 'cashier' | 'admin' | 'split';

const MODE_ROUTES: Record<AppMode, string> = {
  client: '/pedidos',
  kitchen: '/cozinha',
  cashier: '/caixa',
  admin: '/admin',
  split: '/dashboard'
};

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getDefaultRouteForMode(mode: AppMode): string {
  return MODE_ROUTES[mode] ?? '/admin';
}

function getDefaultRouteForRole(role: keyof typeof ROLE_PERMISSIONS): string {
  const allowed = ROLE_PERMISSIONS[role].allowedModes;
  if (allowed.includes('admin')) return '/admin';
  if (allowed.includes('kitchen')) return '/cozinha';
  if (allowed.includes('cashier')) return '/caixa';
  if (allowed.includes('split')) return '/dashboard';
  return '/pedidos';
}

function isPublicMenuRoute(path: string): boolean {
  const browserParts = window.location.pathname.split('/').filter(Boolean);
  return path === '/client' || path.startsWith('/client/') || path.startsWith('/r/') || browserParts[0] === 'r';
}

const RouteSynchronizer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tableNumber, setTableNumber, addToast, tables, setActiveRestaurantBySlug, setPublicRouteError } = useApp();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const routerParts = location.pathname.split('/').filter(Boolean);
    const browserParts = window.location.pathname.split('/').filter(Boolean);
    const routeParts = browserParts[0] === 'r' ? browserParts : routerParts;
    const isPublicRestaurantRoute = routeParts[0] === 'r';

    const restaurantSlug = params.get('restaurant')
      ?? (isPublicRestaurantRoute ? routeParts[1] : null)
      ?? (routerParts[0] === 'client' ? routerParts[1] : null);
    const tableParam = params.get('mesa')
      ?? params.get('table')
      ?? (isPublicRestaurantRoute ? routeParts[2] : null)
      ?? (routerParts[0] === 'client' ? routerParts[2] : null);

    if (!restaurantSlug && !tableParam) {
      setPublicRouteError(null);
      return;
    }

    if (restaurantSlug) {
      const foundRestaurant = setActiveRestaurantBySlug(decodeURIComponent(restaurantSlug));
      if (!foundRestaurant) {
        setPublicRouteError('Restaurante não encontrado ou indisponível.');
        return;
      }
    }

    if (tableParam) {
      const rawTable = decodeURIComponent(tableParam);
      let formattedTable = tables.find(table => toSlug(table) === toSlug(rawTable)) ?? '';
      if (!formattedTable && rawTable.startsWith('Mesa') && rawTable.length > 4 && !rawTable.includes(' ')) {
        const numPart = rawTable.substring(4);
        if (/^\d+$/.test(numPart)) formattedTable = `Mesa ${numPart}`;
      }
      if (!formattedTable) {
        setPublicRouteError('Mesa não encontrada ou inativa.');
        return;
      }
      if (formattedTable !== tableNumber) {
        setTableNumber(formattedTable);
        addToast(`Mesa de autoatendimento identificada via URL: ${formattedTable}`, 'info');
      }
    }

    setPublicRouteError(null);
  }, [location.pathname, location.search, tableNumber, setTableNumber, addToast, tables, setActiveRestaurantBySlug, setPublicRouteError]);

  return <>{children}</>;
};

const SmartRoot: React.FC = () => {
  const { authLoading, isAuthenticated, hasActiveRestaurant, currentUser } = useApp();
  if (authLoading) return <div className="h-full w-full flex items-center justify-center text-xs font-black text-slate-500 uppercase">Carregando sessão...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasActiveRestaurant) return <Navigate to="/onboarding" replace />;
  return <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />;
};

const ProtectedView: React.FC<{ mode: AppMode; children: React.ReactNode }> = ({ mode, children }) => {
  const { authLoading, isAuthenticated, hasActiveRestaurant, currentUser, isModeAllowed } = useApp();
  if (authLoading) return <div className="h-full w-full flex items-center justify-center text-xs font-black text-slate-500 uppercase">Carregando sessão...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!hasActiveRestaurant) return <Navigate to="/onboarding" replace />;
  if (!isModeAllowed(mode)) return <Navigate to={getDefaultRouteForRole(currentUser.role)} replace />;
  return <>{children}</>;
};

const OperationalShell: React.FC<{ mode: AppMode; children: React.ReactNode }> = ({ mode, children }) => {
  const { activeMode, setActiveMode } = useApp();

  useEffect(() => {
    if (activeMode !== mode) setActiveMode(mode);
  }, [activeMode, mode, setActiveMode]);

  return (
    <ProtectedView mode={mode}>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 font-sans" id="main-app-viewport">
        <Header />
        <main className="flex-1 overflow-hidden relative flex flex-col">{children}</main>
        <ToastContainer />
      </div>
    </ProtectedView>
  );
};

const AppContent: React.FC = () => {
  const { authLoading, isAuthenticated, hasActiveRestaurant, activeMode } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  useEffect(() => {
    if (path === '/portal') navigate(getDefaultRouteForMode(activeMode === 'client' ? 'admin' : activeMode), { replace: true });
  }, [activeMode, navigate, path]);

  if (path === '/' || path === '') {
    return (
      <RouteSynchronizer>
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 font-sans">
          <main className="flex-1 overflow-hidden relative flex flex-col"><SmartRoot /></main>
          <ToastContainer />
        </div>
      </RouteSynchronizer>
    );
  }

  if (isPublicMenuRoute(path)) {
    return (
      <RouteSynchronizer>
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 font-sans" id="public-menu-viewport">
          <main className="flex-1 overflow-hidden relative flex flex-col"><ClientMenu /></main>
          <ToastContainer />
        </div>
      </RouteSynchronizer>
    );
  }

  if (path === '/login') {
    if (authLoading) return <div className="h-screen w-screen flex items-center justify-center text-xs font-black text-slate-500 uppercase">Carregando sessão...</div>;
    if (isAuthenticated && hasActiveRestaurant) return <Navigate to="/admin" replace />;
    if (isAuthenticated && !hasActiveRestaurant) return <Navigate to="/onboarding" replace />;
    return <div className="h-screen w-screen bg-slate-50 font-sans"><LoginScreen /><ToastContainer /></div>;
  }

  if (path === '/onboarding') {
    if (!authLoading && !isAuthenticated) return <Navigate to="/login" replace />;
    if (!authLoading && isAuthenticated && hasActiveRestaurant) return <Navigate to="/admin" replace />;
    return <div className="h-screen w-screen bg-slate-50 font-sans"><OnboardingScreen /><ToastContainer /></div>;
  }

  if (path === '/admin') {
    return <OperationalShell mode="admin"><div className="flex-1 h-full overflow-hidden"><AdminPanel /></div></OperationalShell>;
  }

  if (path === '/kitchen' || path === '/kds' || path === '/cozinha') {
    return <OperationalShell mode="kitchen"><div className="flex-1 h-full overflow-hidden"><KitchenPanel /></div></OperationalShell>;
  }

  if (path === '/cashier' || path === '/caixa') {
    return <OperationalShell mode="cashier"><div className="flex-1 h-full overflow-hidden"><CashierPanel /></div></OperationalShell>;
  }

  if (path === '/dashboard') {
    return (
      <OperationalShell mode="split">
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200" id="split-management-dashboard">
          <div className="flex-1 h-1/2 lg:h-full overflow-hidden flex flex-col relative animate-fade-in" id="split-left-client"><ClientMenu /></div>
          <div className="flex-1 h-1/2 lg:h-full overflow-hidden flex flex-col relative animate-fade-in" id="split-right-kitchen"><KitchenPanel /></div>
        </div>
      </OperationalShell>
    );
  }

  if (path === '/pedidos' || path === '/mesas') {
    return <OperationalShell mode="client"><div className="flex-1 h-full overflow-hidden"><ClientMenu /></div></OperationalShell>;
  }

  return <Navigate to="/" replace />;
};

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AppProvider>
  );
}
