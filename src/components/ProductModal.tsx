import React, { useState } from 'react';
import { Product } from '../types';
import { useApp } from '../store/AppContext';
import { X, Plus, Minus, Info, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addToCart } = useApp();
  const [quantity, setQuantity] = useState<number>(1);
  const [observation, setObservation] = useState<string>('');
  const [isAllergy, setIsAllergy] = useState<boolean>(false);
  const [allergyDetails, setAllergyDetails] = useState<string>('');

  if (!product) return null;

  const handleIncrement = () => setQuantity(prev => prev + 1);
  const handleDecrement = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  const handleAdd = () => {
    let finalObs = observation.trim();
    if (isAllergy && allergyDetails.trim()) {
      finalObs = `[ATENÇÃO ALERGIA: ${allergyDetails.trim()}] ${finalObs}`;
    } else if (isAllergy) {
      finalObs = `[ATENÇÃO ALERGIA] ${finalObs}`;
    }

    addToCart(product, quantity, finalObs);
    onClose();
  };

  const totalPrice = product.price * quantity;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="product-modal-container">
      {/* Overlay backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl flex flex-col"
          id={`modal-product-${product.id}`}
        >
          {/* Header Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 w-8 h-8 rounded-full bg-slate-900/40 hover:bg-slate-900/60 text-white flex items-center justify-center backdrop-blur-xs transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Product Hero Image */}
          <div className="relative h-56 w-full bg-slate-100 overflow-hidden shrink-0">
            <img
              src={product.image}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="px-2 py-0.5 rounded-sm bg-rose-500 text-[9px] font-extrabold uppercase tracking-widest leading-none block w-max mb-1.5 shadow-sm">
                {product.category}
              </span>
              <h3 className="text-xl font-display font-extrabold leading-none tracking-tight">
                {product.name}
              </h3>
            </div>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-20rem)]">
            {/* Description and metadata */}
            <div>
              <p className="text-xs text-slate-500 leading-relaxed font-normal">
                {product.description}
              </p>
              <div className="flex items-center gap-3 mt-3.5 text-[11px] font-semibold text-slate-400 font-mono">
                <span className="flex items-center gap-1">
                  ⏱️ Prep: {product.prepTimeMinutes} min
                </span>
                <span>•</span>
                <span>ID: {product.id}</span>
              </div>
            </div>

            {/* Price section */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-xs font-bold text-slate-500">Valor Unitário</span>
              <span className="text-sm font-black text-slate-950 font-mono">
                {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>

            {/* Customizer: Observações */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Instruções Especiais / Observações</span>
                <span className="text-[10px] font-normal text-slate-400">Opcional</span>
              </label>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Exemplo: sem cebola, molho à parte, bem passado..."
                rows={2}
                maxLength={140}
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 outline-hidden transition resize-none placeholder-slate-400 font-medium"
              />
            </div>

            {/* Allergy Flag section (Severe High Contrast Switcher) */}
            <div className={`p-4 rounded-xl border transition-all ${
              isAllergy 
                ? 'bg-rose-50 border-rose-200' 
                : 'bg-white border-slate-200'
            }`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllergy}
                  onChange={(e) => setIsAllergy(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-rose-500 focus:ring-rose-400"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                    <AlertTriangle className={`w-3.5 h-3.5 ${isAllergy ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
                    Atenção Alergias Alimentares
                  </span>
                  <p className="text-[10px] text-slate-500 select-none mt-0.5">
                    Selecione se possui alergia severa a algum ingrediente (Ex: amendoim, glúten, lactose).
                  </p>
                </div>
              </label>

              {isAllergy && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={allergyDetails}
                    onChange={(e) => setAllergyDetails(e.target.value)}
                    placeholder="Descreva a restrição detalhadamente (ex: ALERGIA À CEBOLA)"
                    maxLength={80}
                    className="w-full p-2.5 rounded-md border border-rose-200 bg-white text-xs font-black placeholder-rose-400 text-rose-950 focus:border-rose-500 focus:ring-rose-500/20 outline-hidden"
                  />
                  <span className="text-[9px] font-semibold text-rose-600 uppercase block mt-1.5 animate-pulse">
                    🚨 ISSO DEIXARÁ O PEDIDO EM ALTA PRIORIDADE NA COZINHA!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-4 shrink-0">
            {/* Quantity select counter */}
            <div className="flex items-center bg-slate-800 border border-slate-700/60 rounded-xl p-1 shrink-0">
              <button
                onClick={handleDecrement}
                className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-all cursor-pointer"
                id="btn-decrement-modal"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center text-sm font-extrabold text-white font-mono">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-all cursor-pointer"
                id="btn-increment-modal"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Big checkout sum & action submit button */}
            <button
              onClick={handleAdd}
              className="flex-1 h-12 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-black tracking-wider flex items-center justify-between px-5 transition active:scale-98 shadow-md cursor-pointer"
              id="btn-add-to-cart-submit"
            >
              <span>ADICIONAR AO TOTAL</span>
              <span className="font-mono bg-rose-600/60 px-3 py-1 rounded-lg">
                {totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
