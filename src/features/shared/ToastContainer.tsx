import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../store/AppContext';
import { Check, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed bottom-5 right-5 z-55 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          let icon = <Info className="w-4 h-4 text-slate-950" />;
          let bg = 'bg-white border-slate-200 shadow-md';

          if (toast.type === 'success') {
            icon = <Check className="w-4 h-4 text-emerald-600" />;
            bg = 'bg-white border-emerald-300 shadow-md';
          } else if (toast.type === 'warning') {
            icon = <AlertTriangle className="w-4 h-4 text-red-600 animate-bounce" />;
            bg = 'bg-white border-red-300 shadow-md';
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`pointer-events-auto p-4 rounded-xl border flex items-start gap-3 ${bg}`}
              id={`toast-${toast.id}`}
            >
              <div className="p-1 rounded-lg bg-slate-100 shrink-0">
                {icon}
              </div>
              <div className="flex-1 text-xs font-bold text-slate-900 pt-0.5">
                {toast.message}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-900 p-0.5 rounded-lg hover:bg-slate-100 cursor-pointer"
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
