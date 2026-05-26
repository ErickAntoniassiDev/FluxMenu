import React, { useState } from 'react';
import { Product } from '../../types';
import { useApp } from '../../store/AppContext';
import { Image as ImageIcon, X, Plus, Minus, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';


function getReadableTextColor(hexColor: string): '#0f172a' | '#ffffff' {
  const normalized = hexColor.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '#ffffff';
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.62 ? '#0f172a' : '#ffffff';
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose }) => {
  const { addToCart, restaurantConfig } = useApp();
  const [quantity, setQuantity] = useState<number>(1);
  const [observation, setObservation] = useState<string>('');
  const [isAllergy, setIsAllergy] = useState<boolean>(false);
  const [allergyDetails, setAllergyDetails] = useState<string>('');

  if (!product) return null;

  const secondaryColor = restaurantConfig.secondaryColor || '#0f172a';
  const secondaryTextColor = getReadableTextColor(secondaryColor);
  const secondarySoftBackground = secondaryTextColor === '#ffffff' ? 'rgba(15, 23, 42, 0.22)' : 'rgba(15, 23, 42, 0.08)';

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
            className="absolute right-4 top-4 z-10 w-8 h-8 rounded-full bg-slate-900/40 hover:bg-slate-900/60 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Product Hero Image */}
          <div className="relative h-56 w-full bg-slate-100 overflow-hidden shrink-0">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-100 text-slate-350">
                <ImageIcon className="h-10 w-10" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="px-2 py-0.5 rounded-sm bg-red-650 text-[9px] font-extrabold uppercase tracking-widest leading-none block w-max mb-1.5 shadow-sm border border-red-750">
                {product.category}
              </span>
              <h3 className="text-xl font-display font-extrabold leading-none tracking-tight">
                {product.name}
              </h3>
            </div>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-20rem)] text-slate-700">
            {/* Description and metadata */}
            <div>
              <p className="text-xs text-slate-505 leading-relaxed font-semibold">
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
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-150">
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
                className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-hidden transition resize-none placeholder-slate-400 font-semibold"
              />
            </div>

            {/* Allergy Flag section (Severe High Contrast Switcher) - Vermelho no Rosa */}
            <div className={`p-4 rounded-xl border transition-all ${
              isAllergy 
                ? 'bg-red-50 border-red-200' 
                : 'bg-white border-slate-205'
            }`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAllergy}
                  onChange={(e) => setIsAllergy(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-605"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1">
                    <AlertTriangle className={`w-3.5 h-3.5 ${isAllergy ? 'text-red-600 animate-bounce' : 'text-slate-450'}`} />
                    Atenção Alergias Alimentares
                  </span>
                  <p className="text-[10px] text-slate-500 select-none mt-0.5 font-semibold">
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
                    className="w-full p-2.5 rounded-md border border-red-250 bg-white text-xs font-black placeholder-red-400 text-red-950 focus:border-red-600 focus:ring-red-600/20 outline-hidden"
                  />
                  <span className="text-[9px] font-black text-red-605 uppercase block mt-1.5 animate-pulse">
                    🚨 ISSO DEIXARÁ O PEDIDO EM ALTA PRIORIDADE NA COZINHA!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-6 bg-slate-950 border-t border-slate-900 flex items-center justify-between gap-4 shrink-0">
            {/* Quantity select counter */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shrink-0">
              <button
                onClick={handleDecrement}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all cursor-pointer"
                id="btn-decrement-modal"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center text-sm font-extrabold text-white font-mono">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all cursor-pointer"
                id="btn-increment-modal"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Big checkout sum & action submit button - Vermelho no Rosa */}
            <button
              onClick={handleAdd}
              className="flex-1 h-12 rounded-xl text-xs font-black tracking-widest flex items-center justify-between px-5 transition active:scale-98 shadow-md cursor-pointer border"
              style={{ backgroundColor: secondaryColor, borderColor: secondaryColor, color: secondaryTextColor }}
              id="btn-add-to-cart-submit"
            >
              <span>ADICIONAR AO TOTAL</span>
              <span className="font-mono font-black px-3 py-1 rounded-lg" style={{ backgroundColor: secondarySoftBackground }}>
                {totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
