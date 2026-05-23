import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { useApp } from '../store/AppContext';
import { ChevronRight, CheckCircle, Trash2, ShieldAlert, Clock, AlertOctagon } from 'lucide-react';
import { motion } from 'motion/react';

interface KitchenOrderCardProps {
  order: Order;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({ order }) => {
  const { updateOrderStatus, archiveOrder, tick } = useApp();

  // Local checklist trackers so chefs can physically cross out dishes as they make them
  const [checkedItems, setCheckedItems] = useState<{ [key: number]: boolean }>({});

  const handleToggleCheck = (index: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Calculate elapsed waiting times dynamically tied to Tick context state
  const elapsedMs = Date.now() - new Date(order.createdAt).getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 1000 / 60);
  const elapsedSeconds = Math.floor((elapsedMs / 1000) % 60);

  // Consider an order delayed in peak periods if waiting more than 10 minutes and not yet delivered
  const isDelayed = order.status !== 'entregue' && elapsedMinutes >= 10;

  // Visual style definitions
  const priorityStyles = {
    urgente: 'bg-rose-500 text-white animate-pulse border-rose-600',
    alta: 'bg-orange-100 text-orange-950 border-orange-200',
    media: 'bg-slate-50 text-slate-800 border-slate-200/60',
    baixa: 'bg-slate-100 text-slate-600 border-transparent'
  };

  // Column workflows
  const handleAdvance = () => {
    if (order.status === 'novo') {
      updateOrderStatus(order.id, 'preparo');
    } else if (order.status === 'preparo') {
      updateOrderStatus(order.id, 'pronto');
    } else if (order.status === 'pronto') {
      updateOrderStatus(order.id, 'entregue');
    }
  };

  const handleArchivedSubmit = () => {
    archiveOrder(order.id);
  };

  return (
    <motion.div
      layout
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all flex flex-col justify-between ${
        isDelayed
          ? 'border-rose-400 shadow-rose-100 animate-urgent'
          : 'border-slate-200/70 hover:border-slate-300'
      }`}
      id={`order-kds-card-${order.id}`}
    >
      <div>
        {/* Table & Id Top Bar */}
        <div className="flex justify-between items-start gap-4 mb-3">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Mesa</span>
            <span className="text-lg font-black text-slate-950 font-display transition-colors">
              {order.table}
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[9px] text-slate-400 font-mono block leading-none">{order.id}</span>
            <span className={`text-[10px] font-mono font-bold mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
              isDelayed
                ? 'bg-rose-100 text-rose-700 font-extrabold'
                : 'bg-slate-100 text-slate-600'
            }`}>
              <Clock className="w-2.5 h-2.5" />
              {elapsedMinutes.toString().padStart(2, '0')}:{elapsedSeconds.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Priority categorization indicator */}
        <div className="flex items-center justify-between border-t border-b border-slate-100 py-1.5 my-2 gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Classificação:</span>
          <span className={`text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded-sm font-black border ${priorityStyles[order.priority]}`}>
            {order.priority}
          </span>
        </div>

        {/* Dynamic Checklist Ingredients items */}
        <div className="space-y-2.5 mt-3">
          {order.items.map((item, index) => {
            const isChecked = !!checkedItems[index];
            const hasAllergyWarning = item.observation && (
              item.observation.includes('[ATENÇÃO ALERGIA') || 
              item.observation.toLowerCase().includes('alergia')
            );

            return (
              <div
                key={index}
                onClick={() => handleToggleCheck(index)}
                className={`flex gap-3 text-xs p-2 rounded-lg cursor-pointer transition select-none ${
                  isChecked 
                    ? 'bg-slate-50/50 opacity-45' 
                    : 'bg-white hover:bg-slate-50/50'
                }`}
                id={`kds-card-${order.id}-item-${index}`}
              >
                {/* Quantity and check bubble */}
                <span className={`w-6 h-6 rounded-md font-mono text-[11px] font-black shrink-0 flex items-center justify-center transition-all ${
                  isChecked 
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-600 font-black'
                }`}>
                  {isChecked ? '✓' : `${item.quantity}x`}
                </span>

                <div className="flex-1 min-w-0">
                  <span className={`text-xs block font-bold text-slate-900 ${isChecked ? 'line-through text-slate-400' : ''}`}>
                    {item.name}
                  </span>

                  {/* Special modifications warning tags */}
                  {item.observation && (
                    <span className={`text-[10px] block mt-1 p-1 rounded font-semibold ${
                      hasAllergyWarning
                        ? 'bg-rose-50 text-rose-700 border border-rose-100/60 animate-pulse font-extrabold flex items-center gap-1 shrink-0'
                        : 'bg-slate-50 text-slate-500'
                    }`}>
                      {hasAllergyWarning && <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />}
                      💡 {item.observation}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Global summary notes */}
        {order.notes && (
          <div className="mt-3 p-2 rounded-lg bg-rose-50/40 text-[9px] font-bold text-rose-800 border border-rose-100/50 flex gap-1 items-start">
            <AlertOctagon className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
            <div>{order.notes}</div>
          </div>
        )}
      </div>

      {/* Button controls */}
      <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between gap-2 shrink-0">
        
        {/* Archive / Dismiss button */}
        {order.status === 'entregue' ? (
          <button
            onClick={handleArchivedSubmit}
            className="text-[10px] font-extrabold text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg py-1.5 px-2.5 transition flex items-center gap-1 cursor-pointer shrink-0 uppercase"
            title="Arquivar pedido entregue"
            id={`btn-archive-${order.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar
          </button>
        ) : (
          <button
            onClick={handleArchivedSubmit}
            className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg py-1.5 px-2.5 transition cursor-pointer uppercase shrink-0"
            title="Cancelar o pedido"
            id={`btn-cancel-${order.id}`}
          >
            Excluir
          </button>
        )}

        {/* Advance status workflow button */}
        {order.status !== 'entregue' && (
          <button
            onClick={handleAdvance}
            className={`py-1.5 px-3.5 rounded-xl text-[10px] font-black text-white flex items-center gap-1 transition-all select-none cursor-pointer shadow-3xs ${
              order.status === 'novo'
                ? 'bg-slate-900 hover:bg-slate-800'
                : order.status === 'preparo'
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            id={`btn-advance-${order.id}`}
          >
            <span>
              {order.status === 'novo' ? 'Começar Preparo' : order.status === 'preparo' ? 'Pronto!' : 'Entregar'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
