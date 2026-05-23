import React, { useState, useMemo } from 'react';
import { useApp } from '../../store/AppContext';
import { Product } from '../../types';
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

  // Core metrics analytics derived in real time - Cores Fortes
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
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in" id="admin-panel-container">
      
      {/* Top dashboard summary header banner */}
      <div className="bg-white p-6 border-b border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center shrink-0">
        <div>
          <h2 className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-1 px-1.5 rounded-md bg-slate-950 text-white font-mono text-[9px] uppercase font-black">Portal</span>
            FluxMenu SaaS Dashboard
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Configurações Administrativas do Cardápio, Preços e Lojas
          </p>
        </div>

        {/* Core metrics cards - Cores Fortes */}
        <div className="flex gap-4 flex-wrap w-full md:w-auto">
          <div className="bg-emerald-600 p-3.5 rounded-xl border border-emerald-700 flex items-center gap-3 shrink-0 flex-1 md:flex-initial text-white shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-black text-emerald-100 block leading-none">Faturamento (Entregues)</span>
              <span className="text-xs font-black font-mono mt-1 block">
                {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>

          {/* Fundo Azul Usar Preto e Forte */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 flex items-center gap-3 shrink-0 flex-1 md:flex-initial text-white shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[9px] uppercase font-black text-slate-300 block leading-none">Pedidos em Produção</span>
              <span className="text-xs font-black font-mono mt-1 block">
                {activeOrdersVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Sub Tabs Row - Vermelho no Rosa */}
      <div className="bg-white px-6 border-b border-slate-100 flex gap-4 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`py-4 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
            activeTab === 'catalog'
              ? 'border-red-600 text-red-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-catalog"
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          Gerenciar Cardápio
        </button>

        <button
          onClick={() => setActiveTab('tables')}
          className={`py-4 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
            activeTab === 'tables'
              ? 'border-red-600 text-red-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-tables"
        >
          <QrCode className="w-3.5 h-3.5" />
          Configurar Mesas
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-4 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
            activeTab === 'settings'
              ? 'border-red-600 text-red-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-settings"
        >
          <Settings className="w-3.5 h-3.5" />
          Cadastro da Loja
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

              {/* Vermelho no Rosa e Forte */}
              <button
                onClick={() => setIsAddFormOpen(true)}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition select-none tracking-wide"
                id="admin-btn-add-product"
              >
                <PlusCircle className="w-4 h-4" />
                Novidade
              </button>
            </div>

            {/* List products catalog in columns or clean row list */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto border border-slate-150 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-4">Foto / Produto</th>
                      <th className="p-4">Preço BRL</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Preparo</th>
                      <th className="p-4">Disponibilidade</th>
                      <th className="p-4 text-right">Controles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-705">
                    {products.map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="p-4 flex items-center gap-3">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover bg-slate-105 border border-slate-200 shadow-xs shrink-0"
                          />
                          <div>
                            <span className="font-extrabold text-slate-900 block">{prod.name}</span>
                            <span className="text-[10px] text-slate-450 leading-none truncate max-w-[200px] block mt-1 font-semibold">
                              {prod.description}
                            </span>
                          </div>
                        </td>

                        <td className="p-4 font-mono font-black text-slate-900">
                          {prod.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>

                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-900 text-white uppercase font-black tracking-widest text-[8px]">
                            {prod.category}
                          </span>
                        </td>

                        <td className="p-4 font-mono font-bold text-slate-600">
                          ⏱️ {prod.prepTimeMinutes} min
                        </td>

                        <td className="p-4">
                          {/* Cores Fortes */}
                          <button
                            onClick={() => handleToggleAvailability(prod)}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition flex items-center gap-1 cursor-pointer select-none border ${
                              prod.available !== false
                                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                                : 'bg-slate-100 text-slate-400 border-slate-250 hover:bg-slate-200'
                            }`}
                            id={`toggle-available-${prod.id}`}
                          >
                            {prod.available !== false ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
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
                            className="px-2.5 py-1 border border-slate-250 hover:border-slate-300 rounded text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-white cursor-pointer transition select-none active:scale-95"
                            id={`edit-prod-btn-${prod.id}`}
                          >
                            Editar
                          </button>

                          {/* Vermelho no Rosa */}
                          <button
                            onClick={() => deleteProduct(prod.id)}
                            className="p-1 px-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded cursor-pointer transition select-none inline-block align-middle active:scale-90"
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
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
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
                  className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 placeholder-slate-400 font-semibold bg-slate-50"
                  id="table-add-input"
                />
                <button
                  type="submit"
                  className="px-3.5 bg-slate-950 hover:bg-slate-855 text-white font-black text-xs rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer select-none"
                  id="table-add-btn-submit"
                >
                  <Plus className="w-3.5 h-3.5" />
                  +
                </button>
              </form>

              {/* List scroll - Vermelho no Rosa */}
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {tables.map(tab => (
                  <div key={tab} className="py-2.5 flex items-center justify-between text-xs font-bold text-slate-850">
                    <span className="uppercase text-slate-900 font-extrabold font-display">{tab}</span>
                    <button
                      onClick={() => deleteTable(tab)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition cursor-pointer"
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
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase leading-none">Mesa Alvo para QR Code</label>
                    <select
                      value={selectedQRTable}
                      onChange={(e) => setSelectedQRTable(e.target.value)}
                      className="w-full text-xs font-bold border border-slate-250 rounded-lg p-2.5 outline-hidden focus:border-red-650 cursor-pointer text-slate-800 bg-white"
                      id="qr-table-select-target"
                    >
                      {tables.map(t => (
                        <option key={t} value={t} className="uppercase font-bold">{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Vermelho no Rosa */}
                  <div className="p-3.5 rounded-xl bg-slate-100 border text-[10.5px] leading-relaxed text-slate-500 space-y-2 font-semibold">
                    <p>🔗 <strong>Simular escaneamento QR:</strong></p>
                    <a
                      href={`${window.location.origin}/#/client?mesa=${selectedQRTable.replace(' ', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9.5px] block p-2 bg-white hover:bg-slate-50 rounded border select-all truncate font-mono text-red-650 font-black uppercase underline decoration-red-600/30 transition hover:text-red-750 cursor-pointer"
                      title="Clique para simular a leitura do QR Code abrindo o cardápio desta mesa em uma nova aba"
                    >
                      {window.location.origin}/#/client?mesa={selectedQRTable.replace(' ', '')}
                    </a>
                    <p className="pt-1 border-t text-[10px] border-slate-200">Clique no link acima para abrir o autoatendimento pré-configurado para esta mesa em uma nova aba do navegador.</p>
                  </div>
                </div>

                {/* Styled Print QR Code card element - Vermelho no Rosa e Fundo Azul Usar Preto */}
                <div className="p-6 bg-black rounded-2xl flex flex-col items-center text-center shadow-xl select-none" id="simulated-qr-card-print border border-slate-800">
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-500 leading-none mb-1">
                    FluxMenu • {restaurantConfig.name}
                  </span>
                  <span className="text-xl font-black uppercase text-white font-display tracking-wide mb-3">
                    {selectedQRTable}
                  </span>

                  {/* Vectors generated code block representation */}
                  <div className="p-4 bg-white rounded-xl shadow-md flex items-center justify-center shrink-0">
                    <div className="w-28 h-28 border border-slate-100 flex items-center justify-center relative">
                      <QrCode className="w-24 h-24 text-slate-900" />
                      <div className="w-6 h-6 rounded bg-slate-950 border border-slate-800 flex items-center justify-center absolute text-red-500 text-[6px] font-black font-mono">
                        FM
                      </div>
                    </div>
                  </div>

                  <span className="text-[9.5px] text-slate-400 leading-relaxed font-bold mt-3 max-w-[150px]">
                    Escaneie para realizar o pedido direto do celular
                  </span>

                  <button
                    onClick={() => alert(`Simulando impressão térmica de adesivo de mesa para o ${selectedQRTable}...`)}
                    className="w-full h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase transition mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
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
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-bold text-slate-800"
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
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-normal text-slate-705"
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
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-normal text-slate-705"
                  id="config-phone-input"
                />
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="p-3 bg-emerald-600 text-white font-bold rounded-lg text-[10.5px] leading-tight border border-emerald-700 shadow-sm">
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
          <div className="flex min-h-full items-center justify-center p-4 animate-fade-in">
            <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <button
                onClick={() => setEditingProduct(null)}
                className="absolute right-4 top-4 hover:bg-slate-100 text-slate-400 p-1.5 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4 border-b pb-2">
                Editar Detalhes do Prato
              </h4>

              <form onSubmit={handleEditProductSubmit} className="space-y-4 text-xs font-bold text-slate-755">
                <div className="space-y-1">
                  <label>Título do Prato / Bebida</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-black text-slate-900"
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
                      className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-bold text-slate-905 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label>Tempo Preparo (Min)</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.prepTimeMinutes}
                      onChange={(e) => setEditingProduct({ ...editingProduct, prepTimeMinutes: Number(e.target.value) })}
                      className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-bold text-slate-905 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Categoria principal</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 text-slate-900"
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
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-normal text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label>Ingredientes / Descrição comercial</label>
                  <textarea
                    required
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-normal text-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-11 bg-slate-950 hover:bg-slate-855 text-white rounded-xl text-xs font-black uppercase transition shrink-0 cursor-pointer"
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
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs animate-fade-in" onClick={() => setIsAddFormOpen(false)} />
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

              <form onSubmit={handleAddProductSubmit} className="space-y-4 text-xs font-bold text-slate-755">
                <div className="space-y-1">
                  <label>Nome do Prato / Bebida</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Moscow Mule da Casa"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-semibold"
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
                      className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-mono font-bold"
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
                      className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-mono"
                      id="add-prod-input-prep"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Categoria principal</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-bold font-black text-slate-900"
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
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-normal text-slate-700"
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
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-normal text-slate-700"
                    id="add-prod-input-description"
                  />
                </div>

                {/* Vermelho no Rosa */}
                <button
                  type="submit"
                  className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase transition shrink-0 cursor-pointer shadow-md"
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
