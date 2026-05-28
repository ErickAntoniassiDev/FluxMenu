import React, { useState } from 'react';
import { Order, OrderStatus } from '../../types';
import { useApp } from '../../store/AppContext';
import { ChevronRight, CheckCircle, Trash2, ShieldAlert, Clock, AlertOctagon, Lightbulb } from 'lucide-react';
import { motion } from 'motion/react';

interface KitchenOrderCardProps {
  order: Order;
  currentTime: number;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({ order, currentTime }) => {
  const { updateOrderStatus, archiveOrder } = useApp();

  // Local checklist trackers so chefs can physically cross out dishes as they make them
  const [checkedItems, setCheckedItems] = useState<{ [key: number]: boolean }>({});

  const handleToggleCheck = (index: number) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Freeze the production timer once the order is ready or delivered.
  const timerEnd = order.status === 'novo' || order.status === 'preparo'
    ? currentTime
    : new Date(order.updatedAt || order.createdAt).getTime();
  const elapsedMs = Math.max(0, timerEnd - new Date(order.createdAt).getTime());
  const elapsedMinutes = Math.floor(elapsedMs / 1000 / 60);
  const elapsedSeconds = Math.floor((elapsedMs / 1000) % 60);

  // Consider delayed only while the kitchen is still producing it.
  const isDelayed = (order.status === 'novo' || order.status === 'preparo') && elapsedMinutes >= 10;

  // Visual style definitions - Resto das cores tem que ser fortes
  const priorityStyles = {
    urgente: 'bg-red-650 text-white font-extrabold animate-pulse border-red-750 shadow-md',
    alta: 'bg-orange-600 text-white font-extrabold border-orange-700 shadow-sm',
    media: 'bg-slate-800 text-white font-extrabold border-slate-700 shadow-xs',
    baixa: 'bg-slate-600 text-white font-bold border-slate-550 shadow-xs'
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
          ? 'border-red-500 shadow-red-100 animate-urgent'
          : 'border-slate-200/70 hover:border-slate-350'
      }`}
      id={`order-kds-card-${order.id}`}
    >
      <div>
        {/* Table & Id Top Bar */}
        <div className="flex justify-between items-start gap-4 mb-3">
          <div>
            <span className="text-[9px] uppercase font-extrabold text-slate-400 block leading-none">Mesa</span>
            <span className="text-lg font-black text-slate-950 font-display transition-colors">
              {order.table}
            </span>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[9px] text-slate-400 font-mono block leading-none">{order.id}</span>
            <span className={`text-[10px] font-mono font-bold mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${
              isDelayed
                ? 'bg-red-600 text-white font-extrabold'
                : 'bg-slate-950 text-white font-bold'
            }`}>
              <Clock className="w-2.5 h-2.5" />
              {elapsedMinutes.toString().padStart(2, '0')}:{elapsedSeconds.toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Priority categorization indicator */}
        <div className="flex items-center justify-between border-t border-b border-slate-100 py-1.5 my-2 gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Classificação:</span>
          <span className={`text-[9px] tracking-wider uppercase px-2 py-0.5 rounded-md font-extrabold border ${priorityStyles[order.priority]}`}>
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
                    ? 'bg-slate-100 opacity-45' 
                    : 'bg-white hover:bg-slate-100'
                }`}
                id={`kds-card-${order.id}-item-${index}`}
              >
                {/* Quantity and check bubble - Cores Fortes */}
                <span className={`w-6 h-6 rounded-md font-mono text-[11px] font-black shrink-0 flex items-center justify-center transition-all ${
                  isChecked 
                    ? 'bg-emerald-600 text-white border border-emerald-700 shadow-xs animate-scale-in' 
                    : 'bg-red-600 text-white font-extrabold shadow-sm'
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
                        ? 'bg-red-650 text-white border border-red-700 animate-pulse font-extrabold flex items-center gap-1 shrink-0'
                        : 'bg-slate-100 text-slate-600 font-bold'
                    }`}>
                      {hasAllergyWarning && <ShieldAlert className="w-3 h-3 text-white shrink-0" />}
                      <Lightbulb className="w-3 h-3 shrink-0" /> {item.observation}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Global summary notes */}
        {order.notes && (
          <div className="mt-3 p-2 rounded-lg bg-red-650 text-white font-extrabold text-[9px] border border-red-700 flex gap-1 items-start shadow-sm">
            <AlertOctagon className="w-3 h-3 text-white shrink-0 mt-0.5" />
            <div>{order.notes}</div>
          </div>
        )}
      </div>

      {/* Button controls */}
      <div className="mt-4 pt-3 border-t border-slate-150 flex items-center justify-between gap-2 shrink-0">
        
        {/* Archive / Dismiss button */}
        {order.status === 'entregue' ? (
          <button
            onClick={handleArchivedSubmit}
            className="text-[10px] font-extrabold text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg py-1.5 px-2.5 transition flex items-center gap-1 cursor-pointer shrink-0 uppercase"
            title="Arquivar pedido entregue"
            id={`btn-archive-${order.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar
          </button>
        ) : (
          <button
            onClick={handleArchivedSubmit}
            className="text-[10px] font-extrabold text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg py-1.5 px-2.5 transition cursor-pointer uppercase shrink-0"
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
            className={`py-1.5 px-3.5 rounded-xl text-[10px] font-black text-white flex items-center gap-1 transition-all select-none cursor-pointer shadow-sm ${
              order.status === 'novo'
                ? 'bg-slate-950 hover:bg-slate-855'
                : order.status === 'preparo'
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
            id={`btn-advance-${order.id}`}
          >
            <span>
              {order.status === 'novo' ? 'Começar Preparo' : order.status === 'preparo' ? 'Pronto!' : 'Entregar'}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        )}
      </div>
    </motion.div>
  );
};
