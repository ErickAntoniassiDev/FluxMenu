import React, { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { Product } from '../../types';
import { getMenuCategories } from '../../services/catalogService';
import { ShoppingCart, Search } from 'lucide-react';
import { ProductModal } from './ProductModal';
import { CartSidebar } from './CartSidebar';
import { AnimatePresence, motion } from 'motion/react';

export const ClientMenu: React.FC = () => {
  const { activeRestaurantId, canUseFeature, products, cart, tableNumber, publicRouteError } = useApp();
  const categories = getMenuCategories(activeRestaurantId);
  const canRemoveBranding = canUseFeature('remove_fluxmenu_branding');

  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);


  // Live filter catalog products based on search queries and categories
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchAvailable = product.available !== false;
      const matchCat = selectedCategory === 'todos' || product.category === selectedCategory;
      const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchAvailable && matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart indicators
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalVal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  if (publicRouteError) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center p-6" id="client-public-route-error">
        <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-sm text-center shadow-xs">
          <h2 className="text-sm font-black text-slate-950 uppercase">Cardápio indisponível</h2>
          <p className="text-xs text-slate-500 mt-2 font-semibold">{publicRouteError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 animate-fade-in relative" id="client-menu-container">
      {/* Search and Header filters overlay bar */}
      <div className="bg-white p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-red-600 rounded-xs inline-block"></span>
            Cardápio Interativo ({tableNumber})
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">
            Selecione seus itens e envie para a cozinha.
            {!canRemoveBranding && <span className="ml-1 text-red-600">Powered by FluxMenu</span>}
          </p>
        </div>

        {/* Input box and Portal Link */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">
          <div className="relative flex-1 md:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar pratos, bebidas..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:border-red-650 focus:bg-white text-xs text-slate-800 outline-hidden tracking-tight transition"
              id="client-search-input"
            />
          </div>

          <a
            href="#/portal"
            className="px-3 py-2 rounded-xl text-[10px] uppercase font-black tracking-wider text-red-650 border border-red-100 bg-red-50/30 hover:bg-red-50 hover:text-red-750 transition flex items-center gap-1.5 cursor-pointer select-none"
            title="Clique para acessar o Portal Administrativo com perfis operacionais, KDS de Cozinha e Caixa"
          >
            <span>🔐 Portal</span>
          </a>
        </div>
      </div>

      {/* Row of Category Buttons */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto scrollbar-none shrink-0" id="client-category-scroll">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition cursor-pointer select-none border ${
              selectedCategory === cat.id
                ? 'bg-red-600 text-white border-red-700 shadow-sm'
                : 'bg-slate-55 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-transparent'
            }`}
            id={`category-tab-${cat.id}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Primary Products list cards viewport */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        {filteredProducts.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400">
            <span className="text-xl">🍽️</span>
            <span className="text-xs font-black tracking-wider uppercase text-slate-800 mt-2 block">Nenhum prato disponível</span>
            <p className="text-[10px] text-slate-500 mt-1">Tente mudar sua pesquisa ou categoria selecionada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map(product => {
              const isAvailable = product.available !== false;
              
              return (
                <div
                  key={product.id}
                  onClick={() => isAvailable && setSelectedProduct(product)}
                  className={`group relative bg-white border rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col ${
                    isAvailable 
                      ? 'cursor-pointer border-slate-200/60 hover:border-red-300' 
                      : 'border-slate-105 filter grayscale opacity-60 pointer-events-none'
                  }`}
                  id={`product-card-${product.id}`}
                >
                  {/* Image banner */}
                  <div className="h-36 bg-slate-100 relative overflow-hidden shrink-0">
                    <img
                      src={product.image}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                    />
                    
                    {/* Time prep badge overlay */}
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-slate-900/75 backdrop-blur-xs rounded text-[9px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1">
                      ⏱️ {product.prepTimeMinutes} min
                    </div>

                    {/* Category tag - Vermelho no Rosa */}
                    <div className="absolute bottom-2.5 left-2.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-xs rounded-sm text-[8px] font-extrabold text-red-500 uppercase tracking-widest border border-slate-800">
                      {product.category}
                    </div>

                    {/* Sold out alert overlay */}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-slate-950/70 border border-slate-900 backdrop-blur-xs flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded bg-red-600/90 text-white text-[10px] uppercase font-black tracking-widest animate-pulse border border-red-500">
                          Esgotado!
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body elements */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 leading-snug tracking-tight mb-1">
                        {product.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mb-4 font-semibold">
                        {product.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto">
                      <span className="text-xs font-black text-slate-950 font-mono">
                        {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      
                      {isAvailable ? (
                        <button className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-650 font-black text-[10px] group-hover:bg-red-600 group-hover:text-white transition cursor-pointer select-none border border-red-100">
                          + Adicionar
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Indisponível</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Basket Checkout triggering bar (If items exist in cart) - Vermelho no Rosa */}
      <AnimatePresence>
        {cartItemCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 z-40 max-w-[calc(100%-2rem)] md:max-w-sm"
            id="floating-cart-bar"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-red-650 hover:bg-red-700 text-white rounded-xl py-3.5 px-4 flex items-center justify-between shadow-lg hover:shadow-xl transition active:scale-98 cursor-pointer border border-red-750"
            >
              <div className="flex items-center gap-2.5">
                <span className="relative p-1.5 rounded-lg bg-red-750">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-red-650 text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {cartItemCount}
                  </span>
                </span>
                <div className="text-left leading-none">
                  <span className="text-[10px] font-black uppercase tracking-wider block font-black">Ver Carrinho</span>
                  <span className="text-[9px] text-red-100 mt-0.5 block font-semibold">{tableNumber} • Mesa selecionada</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-xs font-black bg-red-750/50 px-3 py-1.5 rounded-lg">
                <span>Total:</span>
                <span>{cartTotalVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive product notes/modifiers modal overlay */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
      </AnimatePresence>

      {/* Reusable slide bar cart sidebar */}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
      />
    </div>
  );
};
