import React, { useEffect, useRef } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { Header } from './features/shared/Header';
import { ClientMenu } from './features/customer/ClientMenu';
import { KitchenPanel } from './features/kitchen/KitchenPanel';
import { AdminPanel } from './features/admin/AdminPanel';
import { CashierPanel } from './features/cashier/CashierPanel';
import { ToastContainer } from './features/shared/ToastContainer';
import { HashRouter, useLocation, useNavigate } from 'react-router-dom';

const RouteSynchronizer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tableNumber, setTableNumber, addToast } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // Parse Table scanned dynamic parameter from URL (?mesa=Mesa10)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mesaParam = params.get('mesa');
    if (mesaParam) {
      let formattedTable = decodeURIComponent(mesaParam);
      // Automatically normalize names like Mesa08 to 'Mesa 08' for full compatibility
      if (formattedTable.startsWith('Mesa') && formattedTable.length > 4 && !formattedTable.includes(' ')) {
        const numPart = formattedTable.substring(4);
        if (/^\d+$/.test(numPart)) {
          formattedTable = `Mesa ${numPart}`;
        }
      }
      if (formattedTable && formattedTable !== tableNumber) {
        setTableNumber(formattedTable);
        addToast(`Mesa de autoatendimento identificada via URL: ${formattedTable}`, 'info');
      }
    }
  }, [location.search, tableNumber, setTableNumber, addToast]);

  // Sync index route "/" -> "/client"
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '') {
      navigate('/client', { replace: true });
    }
  }, [location.pathname, navigate]);

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { activeMode } = useApp();
  const location = useLocation();
  const path = location.pathname;

  // The custom management/owner dashboard (/portal)
  if (path === '/portal') {
    return (
      <RouteSynchronizer>
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 font-sans" id="main-app-viewport">
          {/* Universal Multi-Interface Switcher Header - Only visible on Owner Portal */}
          <Header />

          {/* Screen area selection options inside the portal */}
          <main className="flex-1 overflow-hidden relative flex flex-col">
            {activeMode === 'client' && (
              <div className="flex-1 h-full overflow-hidden">
                <ClientMenu />
              </div>
            )}

            {activeMode === 'kitchen' && (
              <div className="flex-1 h-full overflow-hidden">
                <KitchenPanel />
              </div>
            )}

            {activeMode === 'cashier' && (
              <div className="flex-1 h-full overflow-hidden">
                <CashierPanel />
              </div>
            )}

            {activeMode === 'admin' && (
              <div className="flex-1 h-full overflow-hidden">
                <AdminPanel />
              </div>
            )}

            {activeMode === 'split' && (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200" id="split-management-dashboard">
                {/* Left side: Client autoatendimento */}
                <div className="flex-1 h-1/2 lg:h-full overflow-hidden flex flex-col relative animate-fade-in" id="split-left-client">
                  <ClientMenu />
                </div>

                {/* Right side: Kitchen dashboard KDS */}
                <div className="flex-1 h-1/2 lg:h-full overflow-hidden flex flex-col relative animate-fade-in" id="split-right-kitchen">
                  <KitchenPanel />
                </div>
              </div>
            )}
          </main>

          {/* Persistent global notification overlay */}
          <ToastContainer />
        </div>
      </RouteSynchronizer>
    );
  }

  // Pure High-Fidelity Client Views and Standalone Screens (NO HEADER, fully isolated for production deployment)
  return (
    <RouteSynchronizer>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 font-sans" id="standalone-app-viewport">
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {(() => {
            if (path === '/kitchen' || path === '/kds') {
              return (
                <div className="flex-1 h-full overflow-hidden">
                  <KitchenPanel />
                </div>
              );
            }
            if (path === '/cashier' || path === '/caixa') {
              return (
                <div className="flex-1 h-full overflow-hidden">
                  <CashierPanel />
                </div>
              );
            }
            if (path === '/admin') {
              return (
                <div className="flex-1 h-full overflow-hidden">
                  <AdminPanel />
                </div>
              );
            }
            // Fallbacks: '/' or '/client' renders the client-facing digital menu
            return (
              <div className="flex-1 h-full overflow-hidden">
                <ClientMenu />
              </div>
            );
          })()}
        </main>

        {/* Persistent global notification overlay */}
        <ToastContainer />
      </div>
    </RouteSynchronizer>
  );
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
