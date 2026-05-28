import React, { useState } from 'react';
import { useApp } from '../../store/AppContext';
import { Image as ImageIcon, X, Trash2, ArrowRight, Table, Sparkles, ShoppingCart, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


function getReadableTextColor(hexColor: string): '#0f172a' | '#ffffff' {
  const normalized = hexColor.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '#ffffff';
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? '#0f172a' : '#ffffff';
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({ isOpen, onClose }) => {
  const {
    cart,
    removeFromCart,
    updateCartQuantity,
    getCartTotal,
    confirmOrder,
    tableNumber,
    restaurantConfig
  } = useApp();

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const secondaryColor = restaurantConfig.secondaryColor || '#0f172a';
  const secondaryTextColor = getReadableTextColor(secondaryColor);

  const handleConfirmOrder = async () => {
    if (cart.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await confirmOrder();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const total = getCartTotal();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" id="cart-sidebar-wrapper" role="dialog" aria-modal="true" aria-labelledby="cart-sidebar-title">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs cursor-pointer"
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-screen max-w-md pointer-events-auto flex flex-col bg-white shadow-2xl border-l border-slate-200"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100/80 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-red-50 text-red-600 block">
                    <Table className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 id="cart-sidebar-title" className="text-sm font-extrabold text-slate-950 uppercase tracking-tight">meu carrinho</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Enviando para {tableNumber}</p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-slate-50 border border-slate-150 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  id="close-cart-btn" aria-label="Fechar carrinho"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Items List container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 select-none">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-150 text-slate-400 mb-4 animate-pulse">
                      <ShoppingCart className="w-7 h-7" />
                    </div>
                    <span className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider block">Carrinho Vazio</span>
                    <p className="text-[10px] text-slate-500 max-w-[220px] leading-relaxed mt-1 font-semibold">
                      Explore nosso cardápio e adicione seus pratos e bebidas favoritas para iniciar um pedido.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Fundo Azul Usar Preto */}
                    <div className="p-3 bg-slate-950 border border-slate-900 rounded-xl flex items-start gap-2 text-white shadow-sm">
                      <Sparkles className="w-4 h-4 shrink-0 text-red-500 mt-0.5 animate-pulse" />
                      <div className="text-[10px] leading-tight font-semibold">
                        Seu pedido será enviado para a cozinha. Acompanhe o progresso no KDS.
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {cart.map((item, index) => (
                        <div key={`${item.product.id}-${index}`} className="py-4 flex gap-3 first:pt-0 last:pb-0" id={`cart-item-${item.product.id}`}>
                          {item.product.image ? (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              decoding="async"
                              className="w-12 h-12 rounded-lg object-cover bg-slate-100 border border-slate-150 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-150 shrink-0 flex items-center justify-center text-slate-350">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate">{item.product.name}</span>
                            <span className="text-xs font-black text-red-600 font-mono block mt-0.5">
                              {(item.product.price * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                            
                            {item.observation && (
                              <span className={`text-[9px] block font-semibold p-1 mt-1.5 rounded-sm truncate ${
                                item.observation.includes('[ATENÇÃO ALERGIA')
                                  ? 'bg-red-50 text-red-700 font-black border border-red-200'
                                  : 'bg-slate-55 text-slate-505 border'
                              }`}>
                                <Lightbulb className="inline w-3 h-3 mr-1 align-[-2px]" />{item.observation}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1.5 justify-between shrink-0 select-none">
                            <button
                              onClick={() => removeFromCart(index)}
                              className="text-slate-300 hover:text-red-600 p-1 rounded-sm hover:bg-slate-55 transition-colors cursor-pointer"
                              title="Remover item" aria-label="Remover item do carrinho"
                              id={`remove-cart-${item.product.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
                              <button
                                onClick={() => updateCartQuantity(index, -1)}
                                aria-label="Diminuir quantidade"
                                className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-705 font-mono text-[10px] font-black flex items-center justify-center hover:bg-slate-55 transition"
                              >
                                -
                              </button>
                              <span className="text-[11px] font-extrabold text-slate-800 font-mono w-4 text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateCartQuantity(index, 1)}
                                aria-label="Aumentar quantidade"
                                className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-705 font-mono text-[10px] font-black flex items-center justify-center hover:bg-slate-55 transition"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Summary & Confirm Order button */}
              {cart.length > 0 && (
                <div className="p-6 bg-slate-50 border-t border-slate-150 shrink-0 text-slate-700">
                  <div className="space-y-2 mb-5">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-mono">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>Taxa de Serviço</span>
                      <span className="font-mono text-emerald-600 font-bold">Sem taxa</span>
                    </div>
                    <div className="h-px bg-slate-200 my-1"></div>
                    <div className="flex justify-between text-xs font-black text-slate-950">
                      <span>TOTAL GERAL</span>
                      <span className="text-sm font-black text-red-655 font-mono">
                        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting}
                    className="w-full h-12 disabled:bg-slate-400 rounded-xl text-xs font-black tracking-widest flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                      style={{ backgroundColor: isSubmitting ? undefined : secondaryColor, color: isSubmitting ? undefined : secondaryTextColor }}
                    id="confirm-order-submit-btn"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Sincronizando com a Cozinha...</span>
                      </div>
                    ) : (
                      <>
                        <span>ENVIAR PEDIDO AGORA</span>
                        <ArrowRight className="w-3.5 h-3.5 text-red-500" />
                      </>
                    )}
                  </button>

                  <p className="text-[9px] text-center text-slate-400 font-extrabold uppercase tracking-wider mt-3">
                    Seu pedido aparecerá para a equipe da cozinha.
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
