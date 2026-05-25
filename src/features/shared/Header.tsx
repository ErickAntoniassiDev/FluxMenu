import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { 
  Utensils, 
  Smartphone, 
  ChefHat, 
  Layers, 
  Sliders, 
  Receipt, 
  ShieldCheck, 
  ChevronDown, 
  User,
  LogOut,
} from 'lucide-react';
import { getStaffUsers } from '../../services/userService';

const ROLE_LABEL_PT: Record<string, string> = {
  owner: 'Dono (Owner)',
  manager: 'Gerente (Manager)',
  kitchen: 'Cozinha (Kitchen)',
  cashier: 'Caixa (Cashier)',
  waiter: 'Garçom (Waiter)',
  customer: 'Cliente (Customer)',
};

const ROLE_COLOR_CLASSES: Record<string, string> = {
  owner: 'bg-red-600 text-white font-extrabold border border-red-700 px-2 py-0.5 shadow-sm', // vermelho no rosa, forte
  manager: 'bg-purple-700 text-white font-extrabold border border-purple-850 px-2 py-0.5 shadow-sm', // forte
  kitchen: 'bg-amber-600 text-white font-extrabold border border-amber-700 px-2 py-0.5 shadow-sm', // forte e vibrante
  cashier: 'bg-emerald-600 text-white font-extrabold border border-emerald-700 px-2 py-0.5 shadow-sm', // forte e vibrante
  waiter: 'bg-slate-950 text-white font-extrabold border border-slate-900 px-2 py-0.5 shadow-sm', // fundo azul usar preto, forte
  customer: 'bg-slate-800 text-white font-extrabold border border-slate-705 px-2 py-0.5 shadow-sm', // forte e vibrante
};

export const Header: React.FC = () => {
  const {
    currentPlan,
    getPlanLimit,
    showUpgradeNotice,
    activeRestaurantId,
    activeMode,
    setActiveMode,
    restaurantConfig,
    tableNumber,
    setTableNumber,
    tables,
    currentUser,
    setCurrentUser,
    logout,
    hasPermission,
    isModeAllowed,
    isAuthenticated,
  } = useApp();

  const navigate = useNavigate();
  const modeRoutes = { client: '/pedidos', kitchen: '/cozinha', cashier: '/caixa', admin: '/admin', split: '/dashboard' } as const;
  const goToMode = (mode: keyof typeof modeRoutes) => {
    setActiveMode(mode);
    navigate(modeRoutes[mode]);
  };

  const staffUsers = getStaffUsers(activeRestaurantId);
  const userLimit = getPlanLimit('maxStaffUsers');
  const visibleStaffUsers = isAuthenticated ? [currentUser] : (userLimit < 0 ? staffUsers : staffUsers.slice(0, userLimit));
  const canRemoveBranding = currentPlan.features.remove_fluxmenu_branding;

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs backdrop-blur-xl shrink-0">
      <div className="mx-auto px-4 lg:px-8 py-3 md:py-0 md:h-18 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
        
        {/* Logo and identity */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/10 transition-transform hover:scale-105 shrink-0">
              <Utensils className="w-4.5 h-4.5 text-red-550" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-display font-extrabold text-xs md:text-sm tracking-tight select-none">
                  {restaurantConfig.name}
                </h1>
                <span className="px-1 py-0.5 rounded-md bg-red-650 text-[8px] uppercase font-bold text-white tracking-wide border border-red-700 shadow-xs leading-none">
                  Live POS
                </span>
              </div>
              {!canRemoveBranding && (
                <p className="text-[8px] text-slate-400 font-mono">FluxMenu</p>
              )}
            </div>
          </div>

          {/* Table select mobile short display */}
          <div className="text-right sm:hidden select-none">
            <span className="text-[7px] font-bold text-slate-400 uppercase block tracking-wider leading-none">MESA</span>
            <span className="text-[10px] text-red-650 font-black uppercase tracking-tight block">
              {tableNumber}
            </span>
          </div>
        </div>

        {/* Dynamic Navigation Mode switcher restricted by Role Permissions */}
        <div className="bg-slate-100 p-0.5 rounded-xl flex items-center relative gap-0.5 border border-slate-200/50 overflow-x-auto w-full md:w-auto scrollbar-none">
          
          {isModeAllowed('client') && (
            <button
              onClick={() => goToMode('client')}
              className={`px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                activeMode === 'client' 
                  ? 'bg-slate-950 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="nav-client-btn"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden leading-none md:inline">Autoatendimento</span>
              <span className="md:hidden leading-none">Menu</span>
            </button>
          )}

          {isModeAllowed('kitchen') && (
            <button
              onClick={() => goToMode('kitchen')}
              className={`px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                activeMode === 'kitchen' 
                  ? 'bg-slate-950 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="nav-kitchen-btn"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span className="hidden leading-none md:inline">Cozinha</span>
              <span className="md:hidden leading-none">Cozinha</span>
            </button>
          )}

          {isModeAllowed('cashier') && (
            <button
              onClick={() => goToMode('cashier')}
              className={`px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                activeMode === 'cashier' 
                  ? 'bg-slate-950 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="nav-cashier-btn"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span className="hidden leading-none md:inline">Painel Caixa</span>
              <span className="md:hidden leading-none">Caixa</span>
            </button>
          )}

          {isModeAllowed('admin') && (
            <button
              onClick={() => goToMode('admin')}
              className={`px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                activeMode === 'admin' 
                  ? 'bg-slate-950 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="nav-admin-btn"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden leading-none md:inline">Admin</span>
              <span className="md:hidden leading-none">Admin</span>
            </button>
          )}

          {isModeAllowed('split') && (
            <button
              onClick={() => goToMode('split')}
              className={`px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-lg text-[10px] md:text-xs font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                activeMode === 'split' 
                  ? 'bg-slate-950 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              id="nav-split-btn"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden leading-none md:inline">Dashboard</span>
              <span className="md:hidden leading-none">Dashboard</span>
            </button>
          )}

        </div>

        {/* Operational controls and access profile selector */}
        <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto shrink-0 border-t border-slate-100/40 pt-2 md:pt-0 md:border-t-0">
          
          <div className="h-6 w-px bg-slate-100 hidden sm:block"></div>

          <div className="text-right hidden lg:block select-none">
            <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider leading-none mb-0.5">PLANO</span>
            <span className="text-xs text-slate-900 font-extrabold uppercase tracking-tight block">{currentPlan.name}</span>
          </div>

          <div className="h-6 w-px bg-slate-100 hidden lg:block"></div>

          <div className="text-right hidden lg:block select-none">
            <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider leading-none mb-0.5">UNIDADE</span>
            <span className="text-xs text-slate-900 font-extrabold uppercase tracking-tight block">{restaurantConfig.name}</span>
          </div>

          <div className="h-6 w-px bg-slate-100 hidden lg:block"></div>

          {/* Table select widget (Readonly text for customer, Dropdown select for authorized staff) */}
          <div className="text-right hidden sm:block select-none">
            <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider leading-none mb-0.5">LOCAL</span>
            {hasPermission('canOrderForAnyTable') ? (
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="text-xs text-slate-900 font-extrabold bg-transparent border-0 p-0 text-right uppercase tracking-tight focus:ring-0 cursor-pointer hover:text-red-600 hover:underline"
                id="header-table-select"
              >
                {tables.map(tab => (
                  <option key={tab} value={tab} className="text-slate-800 font-medium text-xs bg-white">{tab}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-red-600 font-black uppercase tracking-tight block">
                {tableNumber}
              </span>
            )}
          </div>

          <div className="h-6 w-px bg-slate-100 hidden sm:block"></div>

          {/* Access profile selector */}
          <div className="relative" ref={dropdownRef} id="access-profile-container">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-150 bg-slate-105 hover:bg-slate-100 transition-all duration-200 text-left cursor-pointer hover:border-slate-350 max-w-[120px] md:max-w-[200px]"
              title="Alternar perfil de acesso"
              id="auth-profile-dropdown-btn"
            >
              {currentUser.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-6 h-6 rounded-lg object-cover shrink-0 ring-1 ring-slate-100" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                </div>
              )}
              
              <div className="hidden md:block overflow-hidden leading-none select-none">
                <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">{currentUser.name.split(' ')[0]}</p>
                <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded inline-block mt-0.5 tracking-wider uppercase scale-90 -translate-x-1 ${ROLE_COLOR_CLASSES[currentUser.role]}`}>
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu Overlay */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 md:w-72 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                
                {/* Dropdown Header */}
                <div className="p-4 bg-slate-50/50 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4.5 h-4.5 text-slate-700" />
                    <div>
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">Perfis de Acesso</h3>
                      <p className="text-[10px] text-slate-400">Selecione um perfil operacional</p>
                    </div>
                  </div>
                </div>

                {/* Dropdown Options List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                  {visibleStaffUsers.map((user) => {
                    const isSelected = user.id === currentUser.id;
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          setCurrentUser(user);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full p-2.5 flex items-center gap-3 text-left transition ${
                          isSelected 
                            ? 'bg-red-50/50 hover:bg-red-100/30' 
                            : 'hover:bg-slate-55'
                        }`}
                      >
                        {user.avatar ? (
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-8 h-8 rounded-xl object-cover shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                          
                          {/* Role Badge Description */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md tracking-wider uppercase ${ROLE_COLOR_CLASSES[user.role]}`}>
                              {ROLE_LABEL_PT[user.role]}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {staffUsers.length > visibleStaffUsers.length && (
                  <button
                    onClick={() => showUpgradeNotice('Multiusuários')}
                    className="w-full p-3 bg-amber-50 text-left border-t border-amber-100 hover:bg-amber-100 transition cursor-pointer"
                  >
                    <p className="text-[10px] font-black text-amber-800 uppercase">Upgrade necessário</p>
                    <p className="text-[9px] text-amber-700 font-semibold mt-0.5">Seu plano atual permite {userLimit} usuário ativo.</p>
                  </button>
                )}

                {/* Dropdown Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2">
                  <p className="text-[9px] text-slate-400 font-medium text-center">Plano ativo: {currentPlan.name}. As permissões acompanham a assinatura atual.</p>
                  <button
                    onClick={() => void logout()}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:border-red-200 text-[10px] font-black uppercase flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
