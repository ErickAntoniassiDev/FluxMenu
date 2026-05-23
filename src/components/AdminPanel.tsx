import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Product } from '../types';
import { 
  DollarSign, 
  Layers, 
  Eye, 
  EyeOff, 
  Tag, 
  Plus, 
  TrendingUp, 
  Store, 
  MapPin, 
  QrCode, 
  Trash2, 
  Settings, 
  UtensilsCrossed, 
  Check, 
  PlusCircle, 
  X,
  Clock
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const {
    products,
    updateProduct,
    addProduct,
    deleteProduct,
    orders,
    restaurantConfig,
    setRestaurantConfig,
    tables,
    addTable,
    deleteTable
  } = useApp();

  // Active sub-sections within the Admin
  const [activeTab, setActiveTab] = useState<'catalog' | 'tables' | 'settings'>('catalog');

  // Edit Product modals states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState<boolean>(false);

  // New product inputs
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState(0);
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<'entradas' | 'hamburgueres' | 'pizzas' | 'bebidas' | 'sobremesas'>('entradas');
  const [newPrep, setNewPrep] = useState(15);
  const [newImage, setNewImage] = useState('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=cover&q=80');

  // New tabular inputs
  const [newTableNameInput, setNewTableNameInput] = useState('');
  const [selectedQRTable, setSelectedQRTable] = useState<string>(tables[0] || 'Mesa 08');

  // Core metrics analytics derived in real time
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, order) => sum + (order.status === 'entregue' ? order.total : 0), 0);
  }, [orders]);

  const activeOrdersVal = useMemo(() => {
    return orders.filter(o => o.status !== 'entregue').reduce((sum, o) => sum + o.total, 0);
  }, [orders]);

  // Handle Catalog Toggles
  const handleToggleAvailability = (prod: Product) => {
    updateProduct({
      ...prod,
      available: prod.available === false ? true : false
    });
  };

  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProduct(editingProduct);
    setEditingProduct(null);
  };

  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newPrice <= 0) return;
    addProduct({
      name: newName,
      price: Number(newPrice),
      description: newDesc,
      category: newCategory,
      prepTimeMinutes: Number(newPrep),
      image: newImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=cover&q=80',
      available: true
    });
    
    // Clear inputs
    setNewName('');
    setNewPrice(0);
    setNewDesc('');
    setNewPrep(15);
    setIsAddFormOpen(false);
  };

  const handleAddTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNameInput.trim()) return;
    addTable(newTableNameInput.trim());
    setNewTableNameInput('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50" id="admin-panel-container">
      
      {/* Top dashboard summary header banner */}
      <div className="bg-white p-6 border-b border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center shrink-0">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-1 px-1.5 rounded-md bg-slate-900 text-white font-mono text-[10px]">Portal</span>
            FluxMenu SaaS Dashboard
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Configurações Administrativas do Cardápio, Preços e Lojas
          </p>
        </div>

        {/* Core metrics cards */}
        <div className="flex gap-4 flex-wrap w-full md:w-auto">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3 shrink-0 flex-1 md:flex-initial">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Faturamento (Entregues)</span>
              <span className="text-xs font-black text-slate-900 font-mono mt-0.5 block">
                {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3 shrink-0 flex-1 md:flex-initial">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">Pedidos em Produção</span>
              <span className="text-xs font-black text-slate-900 font-mono mt-0.5 block">
                {activeOrdersVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Sub Tabs Row */}
      <div className="bg-white px-6 border-b border-slate-100 flex gap-4 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`py-4 text-xs font-bold transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
            activeTab === 'catalog'
              ? 'border-rose-500 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-catalog"
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          Gerenciar Cardápio
        </button>

        <button
          onClick={() => setActiveTab('tables')}
          className={`py-4 text-xs font-bold transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
            activeTab === 'tables'
              ? 'border-rose-500 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-tables"
        >
          <QrCode className="w-3.5 h-3.5" />
          Configurar Mesas &amp; QR Codes
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-4 text-xs font-bold transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
            activeTab === 'settings'
              ? 'border-rose-500 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-settings"
        >
          <Settings className="w-3.5 h-3.5" />
          Cadastro da Loja / SaaS
        </button>
      </div>

      {/* Main workspace section viewport */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* TAB 1: CARDÁPIO */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200/65">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Catálogo Geral</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Configure preços, mude status ativo/recolhido e adicione especialidades.</p>
              </div>

              <button
                onClick={() => setIsAddFormOpen(true)}
                className="px-3 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition select-none"
                id="admin-btn-add-product"
              >
                <PlusCircle className="w-4 h-4" />
                Novidade
              </button>
            </div>

            {/* List products catalog in columns or clean row list */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-4">Foto / Produto</th>
                      <th className="p-4">Preço BRL</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Preparo</th>
                      <th className="p-4">Disponibilidade</th>
                      <th className="p-4 text-right">Controles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {products.map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 flex items-center gap-3">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover bg-slate-50 border shrink-0"
                          />
                          <div>
                            <span className="font-extrabold text-slate-900 block">{prod.name}</span>
                            <span className="text-[10px] text-slate-400 leading-none truncate max-w-[200px] block mt-0.5">
                              {prod.description}
                            </span>
                          </div>
                        </td>

                        <td className="p-4 font-mono font-bold text-slate-900">
                          {prod.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>

                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border text-slate-500 uppercase font-black tracking-widest text-[8px]">
                            {prod.category}
                          </span>
                        </td>

                        <td className="p-4 font-mono font-medium text-slate-500">
                          ⏱️ {prod.prepTimeMinutes} min
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => handleToggleAvailability(prod)}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase py-1 px-2.5 transition flex items-center gap-1 cursor-pointer select-none border ${
                              prod.available !== false
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                            }`}
                            id={`toggle-available-${prod.id}`}
                          >
                            {prod.available !== false ? (
                              <>
                                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                                Visível
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                Ocultado
                              </>
                            )}
                          </button>
                        </td>

                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => setEditingProduct(prod)}
                            className="px-2 py-1 border border-slate-200/80 hover:border-slate-300 rounded text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-white cursor-pointer transition select-none"
                            id={`edit-prod-btn-${prod.id}`}
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => deleteProduct(prod.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded cursor-pointer transition select-none inline-block align-middle"
                            id={`delete-prod-btn-${prod.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIGURAR MESAS E QR CODE */}
        {activeTab === 'tables' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Tables Manager Column */}
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-4 lg:col-span-1">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Mesas Ativas</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Cadastre ou remova mesas do estabelecimento.</p>
              </div>

              {/* Form submit add tables */}
              <form onSubmit={handleAddTableSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Exemplo: Mesa 10"
                  value={newTableNameInput}
                  onChange={(e) => setNewTableNameInput(e.target.value)}
                  maxLength={12}
                  className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-rose-500 placeholder-slate-400 font-medium bg-slate-50"
                  id="table-add-input"
                />
                <button
                  type="submit"
                  className="px-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer select-none"
                  id="table-add-btn-submit"
                >
                  <Plus className="w-3.5 h-3.5" />
                  +
                </button>
              </form>

              {/* List scroll */}
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {tables.map(tab => (
                  <div key={tab} className="py-2.5 flex items-center justify-between text-xs font-semibold text-slate-850">
                    <span className="uppercase text-slate-900 font-extrabold font-display">{tab}</span>
                    <button
                      onClick={() => deleteTable(tab)}
                      className="text-slate-350 hover:text-rose-500 p-1 rounded hover:bg-rose-50 transition"
                      id={`delete-table-${tab}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Live QR Creator Preview Column */}
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-4 lg:col-span-2">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Gerador de QR Code de Autoatendimento</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Os clientes leem o código na mesa para acessar o cardápio sincronizado!</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                
                {/* Select mesa */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase leading-none">Mesa Alvo para QR Code</label>
                    <select
                      value={selectedQRTable}
                      onChange={(e) => setSelectedQRTable(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-200 rounded-lg p-2.5 outline-hidden focus:border-rose-500 cursor-pointer text-slate-800"
                      id="qr-table-select-target"
                    >
                      {tables.map(t => (
                        <option key={t} value={t} className="uppercase font-bold">{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 text-[10.5px] leading-relaxed text-slate-500 space-y-2">
                    <p>🔗 <strong>URL codificada final de simulação:</strong></p>
                    <code className="text-[9px] block p-2 bg-white rounded border select-all truncate font-mono text-rose-500 font-semibold uppercase">
                      https://fluxmenu.saas/?mesa={selectedQRTable.replace(' ', '')}
                    </code>
                    <p className="pt-1 border-t">Aponte a câmera para simular o autoatendimento direto nessa mesa.</p>
                  </div>
                </div>

                {/* Styled Print QR Code card element */}
                <div className="p-6 bg-slate-900 rounded-2xl flex flex-col items-center text-center shadow-xl select-none" id="simulated-qr-card-print">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-400 leading-none mb-1">
                    FluxMenu • {restaurantConfig.name}
                  </span>
                  <span className="text-xl font-black uppercase text-white font-display tracking-wide mb-3">
                    {selectedQRTable}
                  </span>

                  {/* Vectors generated code block representation */}
                  <div className="p-4 bg-white rounded-xl shadow-md flex items-center justify-center shrink-0">
                    <div className="w-28 h-28 border border-slate-100 flex items-center justify-center relative">
                      <QrCode className="w-24 h-24 text-slate-900" />
                      <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center absolute text-rose-400 text-[6px]">
                        FM
                      </div>
                    </div>
                  </div>

                  <span className="text-[9.5px] text-slate-400 leading-relaxed font-semibold mt-3 max-w-[150px]">
                    Escaneie para realizar o pedido direto do celular
                  </span>

                  <button
                    onClick={() => alert(`Simulando impressão térmica de adesivo de mesa para o ${selectedQRTable}...`)}
                    className="w-full h-9 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-bold uppercase transition mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Imprimir Adesivo
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 3: RESTAURANT PROFILE CONFIGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-6">
            <div>
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Identidade Corporativa e SaaS</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Defina logos, descrições e detalhes comerciais expostos no cabeçalho do POS.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Nome Oficial do Estabelecimento</label>
                <input
                  type="text"
                  value={restaurantConfig.name}
                  onChange={(e) => setRestaurantConfig({ ...restaurantConfig, name: e.target.value })}
                  placeholder="Nome do Restaurante"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-rose-500"
                  id="config-name-input"
                />
              </div>

              <div className="space-y-1.5 font-bold">
                <label className="text-xs font-bold text-slate-500">Endereço Físico</label>
                <input
                  type="text"
                  value={restaurantConfig.address}
                  onChange={(e) => setRestaurantConfig({ ...restaurantConfig, address: e.target.value })}
                  placeholder="Endereço"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-rose-500 font-normal"
                  id="config-address-input"
                />
              </div>

              <div className="space-y-1.5 font-bold">
                <label className="text-xs font-bold text-slate-500">Contato Comercial</label>
                <input
                  type="text"
                  value={restaurantConfig.phone}
                  onChange={(e) => setRestaurantConfig({ ...restaurantConfig, phone: e.target.value })}
                  placeholder="Telefone"
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-rose-500 font-normal"
                  id="config-phone-input"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-[10px] leading-tight text-emerald-850">
                  ⚡ <strong>Persistência Local Ativa:</strong> Todas as modificações feitas permanecem gravadas permanentemente no seu navegador usando o LocalState.
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL EDIT ELEMENT FOR PRODUCTS CATALOG */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto" id="edit-prod-wrapper">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs" onClick={() => setEditingProduct(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setEditingProduct(null)}
                className="absolute right-4 top-4 hover:bg-slate-100 text-slate-400 p-1.5 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4 border-b pb-2">
                Editar Detalhes do Produto
              </h4>

              <form onSubmit={handleEditProductSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                <div className="space-y-1">
                  <label>Título do Prato / Bebida</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 font-semibold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label>Preço Sugerido (BRL)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                      className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 font-bold text-slate-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label>Tempo Preparo (Min)</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.prepTimeMinutes}
                      onChange={(e) => setEditingProduct({ ...editingProduct, prepTimeMinutes: Number(e.target.value) })}
                      className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 font-bold text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Categoria principal</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 text-slate-900"
                  >
                    <option value="entradas">Entradas</option>
                    <option value="hamburgueres">Hambúrgueres</option>
                    <option value="pizzas">Pizzas</option>
                    <option value="bebidas">Bebidas</option>
                    <option value="sobremesas">Sobremesas</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label>Imagem Mock URL</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.image}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 font-normal text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label>Ingredientes / Descrição comercial</label>
                  <textarea
                    required
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 font-normal text-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase transition shrink-0 cursor-pointer"
                  id="edit-prod-submit-inner"
                >
                  Confirmar Alterações
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADD ELEMENT FOR NEW CATALOG CARD */}
      {isAddFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" id="add-prod-wrapper-container">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs" onClick={() => setIsAddFormOpen(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setIsAddFormOpen(false)}
                className="absolute right-4 top-4 hover:bg-slate-100 text-slate-400 p-1.5 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4 border-b pb-2">
                Cadastrar Novo Item no Cardápio
              </h4>

              <form onSubmit={handleAddProductSubmit} className="space-y-4 text-xs font-bold text-slate-700">
                <div className="space-y-1">
                  <label>Nome do Prato / Bebida</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Moscow Mule da Casa"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 font-semibold"
                    id="add-prod-input-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label>Preço sugerido (BRL)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="38.50"
                      value={newPrice || ''}
                      onChange={(e) => setNewPrice(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 font-mono font-bold"
                      id="add-prod-input-price"
                    />
                  </div>

                  <div className="space-y-1">
                    <label>Preparo estimado (Min)</label>
                    <input
                      type="number"
                      required
                      placeholder="10"
                      value={newPrep || ''}
                      onChange={(e) => setNewPrep(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 font-mono"
                      id="add-prod-input-prep"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Categoria principal</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 font-bold"
                    id="add-prod-select-category"
                  >
                    <option value="entradas">Entradas</option>
                    <option value="hamburgueres">Hambúrgueres</option>
                    <option value="pizzas">Pizzas</option>
                    <option value="bebidas">Bebidas</option>
                    <option value="sobremesas">Sobremesas</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label>Imagem URL</label>
                  <input
                    type="text"
                    value={newImage}
                    onChange={(e) => setNewImage(e.target.value)}
                    placeholder="URL de imagem opcional Unsplash"
                    className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 font-normal"
                    id="add-prod-input-image"
                  />
                </div>

                <div className="space-y-1">
                  <label>Ingredientes principais / Descrição comercial</label>
                  <textarea
                    required
                    placeholder="Descreva detalhes ou sabores..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-rose-500 font-normal"
                    id="add-prod-input-description"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-black uppercase transition shrink-0 cursor-pointer"
                  id="add-prod-submit-form"
                >
                  Salvar Produto no SaaS
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
