import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { KitchenOrderCard } from './KitchenOrderCard';
import { ChefHat, Search, Trash2 } from 'lucide-react';

export const KitchenPanel: React.FC = () => {
  const {
    orders,
    clearAllOrders
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('todos');
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Compute live operational metrics
  const stats = useMemo(() => {
    let novoCount = 0;
    let prepCount = 0;
    let prontoCount = 0;
    let delayedCount = 0;

    orders.forEach(order => {
      if (order.status === 'novo') novoCount++;
      else if (order.status === 'preparo') prepCount++;
      else if (order.status === 'pronto') prontoCount++;

      // Delayed: more than 10 mins and not served
      const elapsedMins = (currentTime - new Date(order.createdAt).getTime()) / 1000 / 60;
      if (order.status !== 'entregue' && elapsedMins >= 10) {
        delayedCount++;
      }
    });

    return {
      novo: novoCount,
      preparo: prepCount,
      pronto: prontoCount,
      delayed: delayedCount,
      total: orders.length
    };
  }, [orders, currentTime]);

  // Live filter orders array
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchSearch = order.table.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          order.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPriority = priorityFilter === 'todos' || order.priority === priorityFilter;
      return matchSearch && matchPriority;
    });
  }, [orders, searchQuery, priorityFilter]);

  // List orders divided into columns
  const columnNew = filteredOrders.filter(o => o.status === 'novo');
  const columnPrep = filteredOrders.filter(o => o.status === 'preparo');
  const columnReady = filteredOrders.filter(o => o.status === 'pronto' || o.status === 'entregue');

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100" id="kitchen-panel-container">
      
      {/* Metrics Counter bar with custom widgets */}
      <div className="bg-slate-950 p-4 md:p-6 border-b border-slate-800/85 flex flex-wrap gap-4 items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-500">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-tight flex items-center gap-2 text-white">
              Painel Operacional KDS
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
              Monitoramento de Pedidos e Filas de Produção
            </p>
          </div>
        </div>

        {/* Real-time counters widgets - Cores Fortes */}
        <div className="flex gap-2.5 overflow-x-auto py-1">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 text-center select-none min-w-[70px]">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Novos</span>
            <span className="text-base font-black font-mono text-white block">{stats.novo}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 text-center select-none min-w-[70px]">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Preparo</span>
            <span className="text-base font-black font-mono text-amber-500 block">{stats.preparo}</span>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 text-center select-none min-w-[70px]">
            <span className="text-[9px] uppercase font-bold text-slate-500 block">Prontos</span>
            <span className="text-base font-black font-mono text-emerald-500 block">{stats.pronto}</span>
          </div>

          {stats.delayed > 0 && (
            <div className="px-3.5 py-1.5 rounded-xl bg-red-950/50 border border-red-900 shrink-0 text-center select-none animate-pulse min-w-[70px]">
              <span className="text-[9px] uppercase font-extrabold text-red-400 block">Atrasados</span>
              <span className="text-base font-black font-mono text-red-500 block">{stats.delayed}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and settings actions bar */}
      <div className="bg-slate-950/80 p-4 border-b border-slate-800/50 flex flex-wrap gap-3 items-center justify-between shrink-0">
        
        {/* Left searching and filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full max-w-xs shrink-0">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtro Mesa / ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 rounded-xl border border-slate-800 focus:border-red-650 focus:bg-slate-900/90 text-xs text-slate-200 outline-hidden tracking-tight transition placeholder-slate-500"
              id="kds-search-input"
            />
          </div>

          {/* Quick classification toggle - Cores Fortes */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs text-slate-300 font-extrabold bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 outline-hidden focus:border-red-600 cursor-pointer"
            id="kds-priority-select-filter"
          >
            <option value="todos">Todas Prioridades</option>
            <option value="urgente">⚠️ Urgentes</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>

        {/* Right DB triggers */}
        <div className="flex gap-2">
          <button
            onClick={clearAllOrders}
            className="px-3 py-2 text-xs border border-red-900 bg-red-955/30 text-red-500 hover:bg-red-900 hover:text-white rounded-lg transition cursor-pointer flex items-center gap-1.5 font-bold"
            title="Limpar permanentemente todos os pedidos ativos"
            id="kds-btn-clear-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Zerar Tela
          </button>
        </div>
      </div>

      {/* Kanban lanes content layout */}
      <div className="flex-1 overflow-x-auto p-4 md:p-6">
        <div className="min-w-[900px] h-full grid grid-cols-3 gap-6">
          
          {/* Column 1: NOVOS - Fundo Azul Usar Preto */}
          <div className="flex flex-col h-full bg-black/60 rounded-2xl border border-slate-800 p-4 shadow-inner" id="kds-lane-new">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0 mb-4 select-none">
              <span className="text-xs font-black uppercase text-slate-300 tracking-wide flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-700 block shrink-0 inline-block"></span>
                Novos Pedidos ({columnNew.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {columnNew.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center text-slate-600">
                  <div className="text-2xl mb-1.5">🛌</div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Sem pedidos</span>
                  <p className="text-[9px] text-slate-600 max-w-[150px] leading-relaxed mt-0.5">Novos pedidos aparecerão aqui conforme forem enviados.</p>
                </div>
              ) : (
                columnNew.map(order => (
                  <KitchenOrderCard key={order.id} order={order} currentTime={currentTime} />
                ))
              )}
            </div>
          </div>

          {/* Column 2: PREPARO - Cores fortes */}
          <div className="flex flex-col h-full bg-slate-950/45 rounded-2xl border border-slate-800 p-4" id="kds-lane-prep">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0 mb-4 select-none">
              <span className="text-xs font-black uppercase text-slate-300 tracking-wide flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block shrink-0 inline-block shadow-sm"></span>
                Em Preparo ({columnPrep.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {columnPrep.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center text-slate-600">
                  <div className="text-2xl mb-1.5">🍳</div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Cozinha calma</span>
                  <p className="text-[9px] text-slate-600 max-w-[150px] leading-relaxed mt-0.5">Avance pratos da coluna Novos para iniciar.</p>
                </div>
              ) : (
                columnPrep.map(order => (
                  <KitchenOrderCard key={order.id} order={order} currentTime={currentTime} />
                ))
              )}
            </div>
          </div>

          {/* Column 3: READY / DELIVERED - Cores fortes */}
          <div className="flex flex-col h-full bg-slate-950/45 rounded-2xl border border-slate-800 p-4" id="kds-lane-ready">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0 mb-4 select-none">
              <span className="text-xs font-black uppercase text-slate-300 tracking-wide flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block shrink-0 inline-block shadow-sm animate-pulse-fast"></span>
                Prontos &amp; Entregues ({columnReady.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {columnReady.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center text-slate-600">
                  <div className="text-2xl mb-1.5">🔔</div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Nenhum pronto</span>
                  <p className="text-[9px] text-slate-600 max-w-[150px] leading-relaxed mt-0.5">Pratos prontos aguardam a retirada do garçom.</p>
                </div>
              ) : (
                columnReady.map(order => (
                  <KitchenOrderCard key={order.id} order={order} currentTime={currentTime} />
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
