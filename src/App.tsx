import React from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { Header } from './components/Header';
import { ClientMenu } from './components/ClientMenu';
import { KitchenPanel } from './components/KitchenPanel';
import { AdminPanel } from './components/AdminPanel';
import { CashierPanel } from './components/CashierPanel';
import { ToastContainer } from './components/ToastContainer';

const AppContent: React.FC = () => {
  const { activeMode } = useApp();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 font-sans" id="main-app-viewport">
      {/* Universal Multi-Interface Switcher Header */}
      <Header />

      {/* Screen area selection transitions */}
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
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Left side: Client autoatendimento */}
            <div className="flex-1 h-1/2 lg:h-full overflow-hidden flex flex-col relative" id="split-left-client">
              <ClientMenu />
            </div>

            {/* Right side: Kitchen dashboard KDS */}
            <div className="flex-1 h-1/2 lg:h-full overflow-hidden flex flex-col relative" id="split-right-kitchen">
              <KitchenPanel />
            </div>
          </div>
        )}
      </main>

      {/* Persistent global notification overlay */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
