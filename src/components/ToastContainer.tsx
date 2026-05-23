import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../store/AppContext';
import { Check, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          let icon = <Info className="w-4 h-4 text-blue-500" />;
          let bg = 'bg-white border-slate-100';

          if (toast.type === 'success') {
            icon = <Check className="w-4 h-4 text-emerald-500" />;
            bg = 'bg-white border-emerald-100/80';
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="w-4 h-4 text-amber-500 animate-bounce" />;
            bg = 'bg-white border-amber-100/80';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto p-4 rounded-xl border shadow-lg flex items-start gap-3 ${bg}`}
              id={`toast-${toast.id}`}
            >
              <div className="p-1 rounded-lg bg-slate-50/80 shrink-0">
                {icon}
              </div>
              <div className="flex-1 text-xs font-semibold text-slate-800 pt-0.5">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg hover:bg-slate-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
