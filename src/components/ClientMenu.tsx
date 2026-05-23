import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Product } from '../types';
import { ShoppingCart, Search, Utensils, Info, HelpCircle } from 'lucide-react';
import { ProductModal } from './ProductModal';
import { CartSidebar } from './CartSidebar';
import { AnimatePresence, motion } from 'motion/react';

export const ClientMenu: React.FC = () => {
  const { products, cart, tableNumber } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Filter Categories list
  const categories = [
    { id: 'todos', label: 'Tudo' },
    { id: 'entradas', label: 'Entradas' },
    { id: 'hamburgueres', label: 'Hambúrgueres' },
    { id: 'pizzas', label: 'Pizzas' },
    { id: 'bebidas', label: 'Bebidas' },
    { id: 'sobremesas', label: 'Sobremesas' }
  ];

  // Live filter catalog products based on search queries and categories
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchCat = selectedCategory === 'todos' || product.category === selectedCategory;
      const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart indicators
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalVal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  return (
    <div className="flex flex-col h-full bg-slate-50/50" id="client-menu-container">
      {/* Search and Header filters overlay bar */}
      <div className="bg-white p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-rose-500 rounded-xs inline-block"></span>
            Cardápio Interativo ({tableNumber})
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">
            Selecione seus itens e envie para a cozinha em tempo real!
          </p>
        </div>

        {/* Input box */}
        <div className="relative w-full md:max-w-xs shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar pratos, bebidas..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:border-rose-500 focus:bg-white text-xs text-slate-800 outline-hidden tracking-tight transition"
            id="client-search-input"
          />
        </div>
      </div>

      {/* Row of Category Buttons */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex gap-2 overflow-x-auto scrollbar-none shrink-0" id="client-category-scroll">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer select-none border ${
              selectedCategory === cat.id
                ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                : 'bg-slate-50 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border-transparent'
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
                      ? 'cursor-pointer border-slate-200/60 hover:border-rose-200' 
                      : 'border-slate-100 filter grayscale opacity-60 pointer-events-none'
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

                    {/* Category tag */}
                    <div className="absolute bottom-2.5 left-2.5 px-1.5 py-0.5 bg-black/50 backdrop-blur-xs rounded-sm text-[8px] font-extrabold text-rose-300 uppercase tracking-widest">
                      {product.category}
                    </div>

                    {/* Sold out alert overlay */}
                    {!isAvailable && (
                      <div className="absolute inset-0 bg-slate-950/70 border border-slate-900 backdrop-blur-xs flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded bg-rose-500/90 text-white text-[10px] uppercase font-black tracking-widest animate-pulse border border-rose-400">
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
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mb-4">
                        {product.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto">
                      <span className="text-xs font-black text-slate-950 font-mono">
                        {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      
                      {isAvailable ? (
                        <button className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-500 font-extrabold text-[10px] group-hover:bg-rose-500 group-hover:text-white transition cursor-pointer select-none border border-rose-100">
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

      {/* Floating Bottom Basket Checkout triggering bar (If items exist in cart) */}
      <AnimatePresence>
        {cartItemCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-40 max-w-sm w-full"
            id="floating-cart-bar"
          >
            <button
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-rose-500 hover:bg-rose-400 text-white rounded-xl py-3.5 px-4 flex items-center justify-between shadow-lg hover:shadow-xl transition active:scale-98 cursor-pointer border border-rose-400 hover:border-rose-300"
            >
              <div className="flex items-center gap-2.5">
                <span className="relative p-1.5 rounded-lg bg-rose-600">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="absolute -top-1.5 -right-1.5 bg-white text-rose-600 text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {cartItemCount}
                  </span>
                </span>
                <div className="text-left leading-none">
                  <span className="text-[10px] font-black uppercase tracking-wider block">Ver Carrinho</span>
                  <span className="text-[9px] text-rose-100 mt-0.5 block">{tableNumber} • Mesa selecionada</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-xs font-black bg-rose-600/50 px-3 py-1.5 rounded-lg">
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
