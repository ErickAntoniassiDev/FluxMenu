import React, { useState, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { Order, OrderItem, PaymentLog } from '../types';
import { 
  Receipt, 
  DollarSign, 
  Percent, 
  Layers, 
  CreditCard, 
  QrCode, 
  Coins, 
  Check, 
  Search, 
  ArrowRight, 
  TrendingUp, 
  Clipboard, 
  Printer, 
  Calendar, 
  AlertCircle, 
  ArrowLeft,
  X,
  History,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CashierPanel: React.FC = () => {
  const {
    orders,
    tables,
    checkoutTable,
    paymentLogs,
    clearPaymentHistory,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'tables' | 'history'>('tables');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // Modifiers state
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [includeServiceTax, setIncludeServiceTax] = useState<boolean>(true);
  
  // Checkout flow state
  const [checkoutStep, setCheckoutStep] = useState<'bill' | 'payment' | 'completed'>('bill');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credito' | 'debito' | 'dinheiro'>('pix');
  const [cashAmountPaid, setCashAmountPaid] = useState<string>('');
  
  // Thermal receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Filter tables
  const filteredTables = useMemo(() => {
    return tables.filter(t => t.toLowerCase().includes(tableSearch.toLowerCase()));
  }, [tables, tableSearch]);

  // Aggregate unpaid orders grouped by table
  const tableBillingData = useMemo(() => {
    const tableOrdersMap: Record<string, Order[]> = {};
    
    // Group only unpaid/active orders
    orders.forEach(order => {
      // Treat omitted paymentStatus as 'pendente'
      if (order.paymentStatus !== 'pago') {
        if (!tableOrdersMap[order.table]) {
          tableOrdersMap[order.table] = [];
        }
        tableOrdersMap[order.table].push(order);
      }
    });

    const result: Record<string, {
      orders: Order[];
      items: { name: string; quantity: number; price: number; observation: string }[];
      subtotal: number;
      lastUpdatedAt: string;
      hasReadyItems: boolean;
      status: 'novo' | 'preparo' | 'pronto';
    }> = {};

    Object.entries(tableOrdersMap).forEach(([table, tableOrders]) => {
      // Aggregate items across all orders
      const itemsMap: Record<string, { name: string; quantity: number; price: number; observations: string[] }> = {};
      let subtotal = 0;
      let latestTime = '';
      let hasReadyItems = false;
      let highestStatusValue = 0; // 1: novo, 2: preparo, 3: pronto
      let tableStatus: 'novo' | 'preparo' | 'pronto' = 'novo';

      tableOrders.forEach(o => {
        subtotal += o.total;
        if (!latestTime || o.updatedAt > latestTime) {
          latestTime = o.updatedAt;
        }
        
        if (o.status === 'pronto') {
          hasReadyItems = true;
        }

        const sVal = o.status === 'novo' ? 1 : o.status === 'preparo' ? 2 : o.status === 'pronto' ? 3 : 0;
        if (sVal > highestStatusValue) {
          highestStatusValue = sVal;
          if (o.status === 'novo' || o.status === 'preparo' || o.status === 'pronto') {
            tableStatus = o.status;
          }
        }

        o.items.forEach(i => {
          const key = i.productId + '_' + (i.price).toString();
          if (!itemsMap[key]) {
            itemsMap[key] = { name: i.name, quantity: 0, price: i.price, observations: [] };
          }
          itemsMap[key].quantity += i.quantity;
          if (i.observation) {
            itemsMap[key].observations.push(i.observation);
          }
        });
      });

      const aggregatedItems = Object.values(itemsMap).map(v => ({
        name: v.name,
        quantity: v.quantity,
        price: v.price,
        observation: v.observations.join('; ')
      }));

      result[table] = {
        orders: tableOrders,
        items: aggregatedItems,
        subtotal,
        lastUpdatedAt: latestTime || new Date().toISOString(),
        hasReadyItems,
        status: tableStatus
      };
    });

    return result;
  }, [orders]);

  // Statistics summaries
  const stats = useMemo(() => {
    const faturamento = paymentLogs.reduce((acc, log) => acc + log.amount, 0);
    const completedCount = paymentLogs.length;
    const ticketMedio = completedCount > 0 ? faturamento / completedCount : 0;
    
    // Sum of all currently outstanding bills
    const openTotal = Object.keys(tableBillingData).reduce((acc, tableKey) => acc + tableBillingData[tableKey].subtotal, 0);
    const activeTablesCount = Object.keys(tableBillingData).length;

    return {
      faturamento,
      completedCount,
      ticketMedio,
      openTotal,
      activeTablesCount
    };
  }, [paymentLogs, tableBillingData]);

  // Calculations for chosen table bill
  const billingSummary = useMemo(() => {
    if (!selectedTable || !tableBillingData[selectedTable]) {
      return { subtotal: 0, taxaServico: 0, desconto: 0, total: 0 };
    }
    const currentTableData = tableBillingData[selectedTable];
    const subtotal = currentTableData.subtotal;
    const taxaServico = includeServiceTax ? subtotal * 0.1 : 0;
    const desconto = subtotal * (discountPercent / 100);
    const total = subtotal + taxaServico - desconto;

    return {
      subtotal,
      taxaServico,
      desconto,
      total
    };
  }, [selectedTable, tableBillingData, includeServiceTax, discountPercent]);

  // Cash change calculator
  const cashChange = useMemo(() => {
    if (paymentMethod !== 'dinheiro' || !cashAmountPaid) return 0;
    const numPaid = parseFloat(cashAmountPaid.replace(',', '.'));
    if (isNaN(numPaid)) return 0;
    const change = numPaid - billingSummary.total;
    return change > 0 ? change : 0;
  }, [paymentMethod, cashAmountPaid, billingSummary]);

  // Trigger Checkout Execution
  const handleConfirmCheckout = () => {
    if (!selectedTable) return;
    
    // Run the actual state store update
    checkoutTable(selectedTable, paymentMethod);
    
    // Transition UI
    setCheckoutStep('completed');
    addToast(`Pagamento da ${selectedTable} processado com sucesso!`, 'success');
  };

  // Close Register Table Action
  const finishTableCheckout = () => {
    setSelectedTable(null);
    setCheckoutStep('bill');
    setDiscountPercent(0);
    setIncludeServiceTax(true);
    setCashAmountPaid('');
  };

  const handleSelectTable = (table: string) => {
    setSelectedTable(table);
    setCheckoutStep('bill');
    setDiscountPercent(0);
    setIncludeServiceTax(true);
    setCashAmountPaid('');
  };

  // Filter payment history
  const filteredHistory = useMemo(() => {
    return paymentLogs.filter(log => 
      log.table.toLowerCase().includes(historySearch.toLowerCase()) ||
      log.id.toLowerCase().includes(historySearch.toLowerCase()) ||
      log.paymentMethod.toLowerCase().includes(historySearch.toLowerCase())
    );
  }, [paymentLogs, historySearch]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  return (
    <div className="flex-1 bg-slate-50 overflow-y-auto px-4 lg:px-8 py-6 flex flex-col gap-6" id="cashier-panel-container">
      
      {/* SaaS Dashboard Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metr 1: Faturamento do Dia */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 transition hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Faturamento (Hoje)</span>
            <span className="text-lg md:text-xl font-extrabold text-slate-900 font-mono tracking-tight block">
              {formatCurrency(stats.faturamento)}
            </span>
          </div>
        </div>

        {/* Metr 2: Valor em Aberto */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 transition hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Contas Em Aberto</span>
            <span className="text-lg md:text-xl font-extrabold text-slate-900 font-mono tracking-tight block">
              {formatCurrency(stats.openTotal)}
            </span>
          </div>
        </div>

        {/* Metr 3: Ticket Médio */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 transition hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Ticket Médio</span>
            <span className="text-lg md:text-xl font-extrabold text-slate-900 font-mono tracking-tight block">
              {formatCurrency(stats.ticketMedio)}
            </span>
          </div>
        </div>

        {/* Metr 4: Transações Concluídas */}
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 transition hover:shadow-md">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">Transações</span>
            <span className="text-lg md:text-xl font-extrabold text-slate-900 font-mono tracking-tight block">
              {stats.completedCount} <span className="text-xs text-slate-400 font-normal">pagas</span>
            </span>
          </div>
        </div>

      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('tables')}
          className={`pb-3 text-sm font-bold transition flex items-center gap-2 relative ${
            activeTab === 'tables' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="cashier-tab-tables"
        >
          <Layers className="w-4 h-4" />
          Mesas e Fechamento
          {stats.activeTablesCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-[10px] text-white font-mono font-extrabold leading-none">
              {stats.activeTablesCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-sm font-bold transition flex items-center gap-2 relative ${
            activeTab === 'history' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'
          }`}
          id="cashier-tab-history"
        >
          <History className="w-4 h-4" />
          Histórico de Vendas
          {stats.completedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-200 text-[10px] text-slate-700 font-mono font-bold leading-none">
              {stats.completedCount}
            </span>
          )}
        </button>
      </div>

      {/* Main content grid */}
      <div className="grow grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {activeTab === 'tables' ? (
          <>
            {/* Left side list of tables (4 cols on lg) */}
            <div className="lg:col-span-5 flex flex-col gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs">
              <div className="flex flex-col gap-2">
                <h3 className="font-display font-bold text-slate-900 text-sm">Controle de Mesas</h3>
                <p className="text-xs text-slate-400">Selecione uma mesa ocupada para detalhar os itens e realizar o fechamento.</p>
              </div>

              {/* Table Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Pesquisar mesa..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all placeholder:text-slate-400"
                  id="cashier-table-search-input"
                />
                {tableSearch && (
                  <button 
                    onClick={() => setTableSearch('')} 
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Table list scrolling area */}
              <div className="grow overflow-y-auto max-h-[500px] lg:max-h-[600px] flex flex-col gap-2 pr-1" id="cashier-tables-scroll">
                {filteredTables.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-slate-400">Nenhuma mesa encontrada.</p>
                  </div>
                ) : (
                  filteredTables.map(table => {
                    const hasBilling = !!tableBillingData[table];
                    const billing = tableBillingData[table];
                    const isSelected = selectedTable === table;

                    return (
                      <button
                        key={table}
                        onClick={() => handleSelectTable(table)}
                        className={`w-full p-4 rounded-xl border transition-all text-left flex items-center justify-between gap-4 cursor-pointer hover:border-slate-300 hover:bg-slate-50 ${
                          isSelected 
                            ? 'border-rose-500 bg-rose-50/20 shadow-xs ring-1 ring-rose-500/35' 
                            : hasBilling
                              ? 'border-amber-200 bg-amber-50/10'
                              : 'border-slate-100 bg-white'
                        }`}
                        id={`cashier-table-item-${table}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-extrabold text-xs tracking-tighter ${
                            isSelected
                              ? 'bg-rose-500 text-white'
                              : hasBilling
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-500'
                          }`}>
                            {table.replace(/[^\d]/g, '') || "V"}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-slate-800 block">{table}</span>
                            {hasBilling ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
                                  billing.status === 'pronto' ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}></span>
                                <span className="text-[10px] text-slate-500 font-semibold font-mono">
                                  {billing.orders.length} {billing.orders.length === 1 ? 'pedido' : 'pedidos'} • {formatTime(billing.lastUpdatedAt)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 block mt-0.5">Mesa disponível</span>
                            )}
                          </div>
                        </div>

                        {hasBilling && (
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-slate-900 font-mono block">
                              {formatCurrency(billing.subtotal)}
                            </span>
                            {billing.status === 'pronto' && (
                              <span className="inline-block px-1.5 py-0.5 mt-0.5 rounded-md bg-emerald-150 text-emerald-800 text-[8px] font-extrabold uppercase tracking-wide">
                                Pronto p/ Caixa
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right side checkout registry details (7 cols on lg) */}
            <div className="lg:col-span-7 flex flex-col min-h-0">
              
              <AnimatePresence mode="wait">
                {!selectedTable ? (
                  // Empty State
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="grow bg-white border border-slate-250/65 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-2xs h-full"
                    id="cashier-details-empty"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                      <Receipt className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-base text-slate-800">Terminal de Fechamento</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Selecione uma mesa ativa ao lado para faturar, aplicar descontos, emitir o extrato impresso e registrar pagamento.
                      </p>
                    </div>
                  </motion.div>
                ) : !tableBillingData[selectedTable] ? (
                  // Vacuum State: chosen but has no order (Livre)
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="grow bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 h-full"
                    id="cashier-table-vacant"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                      <Check className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-base text-slate-800">{selectedTable} está vazia</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">
                        Esta mesa não possui comandas ou pedidos em andamento no momento.
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedTable(null)}
                      className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl flex items-center gap-1.5 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Painel
                    </button>
                  </motion.div>
                ) : (
                  // High Productive billing dashboard step tracker
                  <motion.div 
                    key={selectedTable + '_' + checkoutStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.18 }}
                    className="grow bg-white border border-slate-200/90 rounded-2xl flex flex-col shadow-xs min-h-0 h-full"
                    id="cashier-active-details"
                  >
                    {/* Bill Header */}
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={finishTableCheckout}
                          className="p-1 text-slate-400 hover:text-slate-600 transition md:hidden"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-extrabold text-slate-900 text-base">{selectedTable}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-mono font-extrabold">
                              CONTA ABERTA
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Operador: Terminal Principal</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Extrato Printer button */}
                        <button
                          onClick={() => setShowReceiptModal(true)}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                          title="Imprimir extrato de conta para levar à mesa"
                          id="btn-print-extrato"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Extrato da Conta</span>
                        </button>
                        
                        <button
                          onClick={finishTableCheckout}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Conditional steps view */}
                    {checkoutStep === 'bill' && (
                      <div className="grow overflow-y-auto p-5 flex flex-col gap-5 max-h-[480px]">
                        
                        {/* Agregated Comanda List */}
                        <div className="border border-slate-100 rounded-xl overflow-hidden">
                          <div className="bg-slate-50/50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Itens Consumidos</span>
                            <span className="text-[10px] font-mono text-slate-400">{tableBillingData[selectedTable].items.reduce((acc, i) => acc + i.quantity, 0)} itens</span>
                          </div>
                          <div className="divide-y divide-slate-100 max-h-[180px] overflow-y-auto">
                            {tableBillingData[selectedTable].items.map((item, idx) => (
                              <div key={idx} className="p-3 flex justify-between items-start gap-4">
                                <div className="flex items-start gap-2 max-w-[70%]">
                                  <span className="font-mono text-xs font-extrabold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded text-center shrink-0">
                                    {item.quantity}x
                                  </span>
                                  <div>
                                    <h5 className="font-semibold text-slate-800 text-xs">{item.name}</h5>
                                    {item.observation && (
                                      <p className="text-[10px] text-amber-700 font-medium italic mt-0.5">
                                        Observações: {item.observation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono text-xs text-slate-800 block">{formatCurrency(item.price * item.quantity)}</span>
                                  <span className="text-[9px] text-slate-400 block font-mono">un: {formatCurrency(item.price)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Order Warnings if any */}
                        {tableBillingData[selectedTable].orders.some(o => o.notes) && (
                          <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 flex gap-2 items-start shrink-0">
                            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <div className="text-[10px]">
                              <p className="font-bold">Aviso Crítico na Comanda:</p>
                              <p className="font-normal mt-0.5">
                                {tableBillingData[selectedTable].orders.map(o => o.notes).filter(Boolean).join(' | ')}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Modifiers configuration (Discounts & Service fee) */}
                        <div className="p-4 bg-slate-50/50 border border-slate-150/70 rounded-xl flex flex-col gap-4">
                          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">Adicionais e Modificadores</h4>
                          
                          {/* Toggle service fee */}
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <span className="text-xs font-semibold text-slate-800">Taxa de Serviço Obrigatória (10%)</span>
                              <p className="text-[10px] text-slate-400">Gorjeta opcional recomendada para garçons.</p>
                            </div>
                            <button
                              onClick={() => setIncludeServiceTax(!includeServiceTax)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                includeServiceTax ? 'bg-emerald-500' : 'bg-slate-200'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  includeServiceTax ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Discount percent preset picker */}
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-semibold text-slate-800">Desconto Especial</span>
                              <span className="text-xs font-bold text-rose-500 font-mono">-{discountPercent}%</span>
                            </div>
                            <div className="grid grid-cols-5 gap-2">
                              {[0, 5, 10, 15, 20].map((pct) => (
                                <button
                                  key={pct}
                                  onClick={() => setDiscountPercent(pct)}
                                  className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                                    discountPercent === pct
                                      ? 'border-rose-550 bg-rose-50 text-rose-600 font-bold'
                                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                                  }`}
                                >
                                  {pct === 0 ? 'Sem' : `${pct}%`}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                    {checkoutStep === 'payment' && (
                      <div className="grow overflow-y-auto p-5 flex flex-col gap-5 max-h-[480px]">
                        
                        <div className="flex items-center justify-between border border-slate-100 p-3.5 rounded-xl bg-slate-50/50">
                          <div>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total a Cobrar</span>
                            <span className="text-lg font-extrabold text-slate-900 font-mono mt-0.5 block">{formatCurrency(billingSummary.total)}</span>
                          </div>
                          <button
                            onClick={() => setCheckoutStep('bill')}
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold transition"
                          >
                            Revisar comanda
                          </button>
                        </div>

                        {/* Payment Selector Tabs */}
                        <div className="grid grid-cols-4 gap-2">
                          
                          {/* Pix */}
                          <button
                            onClick={() => setPaymentMethod('pix')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                              paymentMethod === 'pix'
                                ? 'border-rose-500 bg-rose-50/20 text-rose-600 shadow-2xs'
                                : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
                            }`}
                          >
                            <QrCode className="w-5 h-5 text-indigo-500" />
                            <span className="text-[10px] font-bold">PIX</span>
                          </button>

                          {/* Crédito */}
                          <button
                            onClick={() => setPaymentMethod('credito')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                              paymentMethod === 'credito'
                                ? 'border-rose-500 bg-rose-50/20 text-rose-600 shadow-2xs'
                                : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
                            }`}
                          >
                            <CreditCard className="w-5 h-5 text-emerald-500" />
                            <span className="text-[10px] font-bold">C. Crédito</span>
                          </button>

                          {/* Débito */}
                          <button
                            onClick={() => setPaymentMethod('debito')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                              paymentMethod === 'debito'
                                ? 'border-rose-500 bg-rose-50/20 text-rose-600 shadow-2xs'
                                : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
                            }`}
                          >
                            <CreditCard className="w-5 h-5 text-amber-500" />
                            <span className="text-[10px] font-bold">C. Débito</span>
                          </button>

                          {/* Dinheiro */}
                          <button
                            onClick={() => setPaymentMethod('dinheiro')}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-center cursor-pointer ${
                              paymentMethod === 'dinheiro'
                                ? 'border-rose-500 bg-rose-50/20 text-rose-600 shadow-2xs'
                                : 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white'
                            }`}
                          >
                            <Coins className="w-5 h-5 text-rose-400" />
                            <span className="text-[10px] font-bold">Dinheiro</span>
                          </button>

                        </div>

                        {/* payment sub-forms details */}
                        <div className="grow p-4 border border-slate-100 rounded-xl bg-slate-50/30 flex flex-col justify-center items-center">
                          {paymentMethod === 'pix' && (
                            <div className="text-center flex flex-col items-center gap-3 py-4">
                              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                <QrCode className="w-24 h-24 text-indigo-700" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-indigo-900 leading-tight">Chave Dinâmica PIX Gerada</h4>
                                <p className="text-[10px] text-slate-400 max-w-[240px] mt-1 font-sans">
                                  Display estático do QR Code para o tablet ou celular do cliente. Sistema monitorando conciliação bancária automaticamente.
                                </p>
                              </div>
                            </div>
                          )}

                          {(paymentMethod === 'credito' || paymentMethod === 'debito') && (
                            <div className="text-center flex flex-col items-center gap-4 py-8">
                              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 animate-pulse">
                                <CreditCard className="w-8 h-8 text-rose-500" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-850 leading-tight">Aguardando Aprovação do Cartão</h4>
                                <p className="text-[10px] text-slate-400 max-w-[240px] mt-1 font-sans">
                                  Insira ou aproxime o cartão na maquininha externa integrada (PIN Pad #4).
                                </p>
                              </div>
                            </div>
                          )}

                          {paymentMethod === 'dinheiro' && (
                            <div className="w-full flex flex-col gap-4 py-2">
                              <div>
                                <label className="text-[11px] font-bold text-slate-450 uppercase block">Recebido (R$)</label>
                                <input
                                  type="text"
                                  placeholder="0,00"
                                  value={cashAmountPaid}
                                  onChange={(e) => setCashAmountPaid(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-base text-slate-900 font-mono font-bold focus:ring-1 focus:ring-rose-550 focus:border-rose-550 transition-all placeholder:text-slate-350"
                                  id="cash-amount-received-input"
                                />
                              </div>

                              {cashAmountPaid && (
                                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-emerald-800">
                                  <span className="text-xs font-bold">Cálculo de Troco</span>
                                  <span className="text-lg font-extrabold font-mono">{formatCurrency(cashChange)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    )}

                    {checkoutStep === 'completed' && (
                      <div className="grow flex flex-col items-center justify-center text-center p-8 gap-4 h-full">
                        <div className="w-14 h-14 rounded-full bg-emerald-100/60 text-emerald-600 flex items-center justify-center border border-emerald-250">
                          <Check className="w-7 h-7" />
                        </div>
                        <div>
                          <h4 className="font-display font-black text-slate-800 text-base">Transação Concluída</h4>
                          <p className="text-xs text-slate-400 max-w-sm mt-1">
                            A conta da {selectedTable} foi fechada com sucesso! Todos os pedidos associados foram liquidados no dashboard.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowReceiptModal(true)}
                            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition active:scale-95"
                          >
                            <Printer className="w-4 h-4" /> Reemitir Cupom
                          </button>
                          <button
                            onClick={finishTableCheckout}
                            className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition active:scale-95"
                          >
                            Finalizar e Fechar comanda
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bill Footer aggregates and next steps button */}
                    {checkoutStep !== 'completed' && (
                      <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-4">
                        {/* Summary details */}
                        <div className="flex flex-col gap-1.5 text-xs text-slate-550">
                          <div className="flex justify-between items-center">
                            <span>Subtotal Consumo</span>
                            <span className="font-mono">{formatCurrency(billingSummary.subtotal)}</span>
                          </div>
                          
                          {includeServiceTax && (
                            <div className="flex justify-between items-center text-slate-500">
                              <span>Taxa de Serviço (10%)</span>
                              <span className="font-mono">{formatCurrency(billingSummary.taxaServico)}</span>
                            </div>
                          )}
                          
                          {discountPercent > 0 && (
                            <div className="flex justify-between items-center text-rose-600">
                              <span>Desconts de {discountPercent}%</span>
                              <span className="font-mono">-{formatCurrency(billingSummary.desconto)}</span>
                            </div>
                          )}

                          <div className="h-px bg-slate-200/60 my-1"></div>
                          
                          <div className="flex justify-between items-center text-slate-950 font-black text-sm">
                            <span>Total Líquido</span>
                            <span className="font-mono">{formatCurrency(billingSummary.total)}</span>
                          </div>
                        </div>

                        {/* Next trigger button */}
                        {checkoutStep === 'bill' ? (
                          <button
                            onClick={() => setCheckoutStep('payment')}
                            className="w-full py-3 bg-rose-500 text-white hover:bg-rose-650 rounded-xl leading-none text-xs font-extrabold tracking-wide transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/10 hover:shadow-lg"
                            id="btn-goto-payment"
                          >
                            <span>Ir para Recebimento</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCheckoutStep('bill')}
                              className="px-4 py-3 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              Voltar
                            </button>
                            <button
                              onClick={handleConfirmCheckout}
                              className="grow py-3 bg-emerald-650 text-white hover:bg-emerald-700 rounded-xl leading-none text-xs font-extrabold tracking-wide transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/15"
                              id="btn-confirm-payment"
                            >
                              <Check className="w-4 h-4" />
                              <span>Registrar Pagamento {formatCurrency(billingSummary.total)}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </>
        ) : (
          /* History tab View (Full Grid width - 12 columns) */
          <div className="lg:col-span-12 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col gap-5 min-h-0">
            
            {/* History Header search & cleaning */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                  <Clipboard className="w-5 h-5 text-amber-500" />
                  Livro de Caixa e Transações
                </h3>
                <p className="text-xs text-slate-450 mt-0.5">Histórico persistente de todas as contas pagas no sistema.</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <div className="relative grow sm:grow-0">
                  <Search className="w-4 h-4 text-slate-450 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar por mesa, ID ou método..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all placeholder:text-slate-400"
                    id="cashier-history-search-input"
                  />
                  {historySearch && (
                    <button 
                      onClick={() => setHistorySearch('')} 
                      className="absolute right-3 top-3 text-slate-450 hover:text-slate-650"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={clearPaymentHistory}
                  disabled={paymentLogs.length === 0}
                  className="px-3 py-2 border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-650 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 disabled:pointer-events-none active:scale-95 shrink-0"
                  id="btn-clear-history"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500" />
                  <span className="hidden sm:inline">Zerar Caixa</span>
                </button>
              </div>
            </div>

            {/* Invoices list area */}
            <div className="grow overflow-y-auto max-h-[500px] border border-slate-100 rounded-xl" id="cashier-history-table-container">
              {filteredHistory.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-xs text-slate-400">Nenhuma transação concluída.</p>
                  <button
                    onClick={() => setHistorySearch('')}
                    className="mt-2 text-xs font-semibold text-rose-500 hover:underline"
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                      <th className="p-4 uppercase tracking-wider text-[10px]">Cód. Transação</th>
                      <th className="p-4 uppercase tracking-wider text-[10px]">Data & Hora</th>
                      <th className="p-4 uppercase tracking-wider text-[10px]">Mesa</th>
                      <th className="p-4 uppercase tracking-wider text-[10px] text-center">Itens Comprados</th>
                      <th className="p-4 uppercase tracking-wider text-[10px]">Método</th>
                      <th className="p-4 uppercase tracking-wider text-[10px] text-right">Faturamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.map((log) => {
                      const methodLabels = {
                        pix: 'PIX bancário',
                        credito: 'Cartão de Crédito',
                        debito: 'Cartão de Débito',
                        dinheiro: 'Espécie / Dinheiro'
                      };

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition duration-150 text-slate-700">
                          <td className="p-4 font-mono font-bold text-slate-900">{log.id}</td>
                          <td className="p-4 font-normal text-slate-500 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(log.timestamp).toLocaleDateString('pt-BR')} às {formatTime(log.timestamp)}
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-slate-800">{log.table}</span>
                          </td>
                          <td className="p-4 text-center font-mono font-semibold">{log.itemsCount}x</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold gap-1 ${
                              log.paymentMethod === 'pix'
                                ? 'bg-indigo-50 text-indigo-700'
                                : log.paymentMethod === 'credito'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : log.paymentMethod === 'debito'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-rose-50 text-rose-700'
                            }`}>
                              {methodLabels[log.paymentMethod] || log.paymentMethod}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-slate-950">
                            {formatCurrency(log.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Extreme SaaS Wow Factor detail: Dynamic printer receipt simulation overlay modal */}
      <AnimatePresence>
        {showReceiptModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-55 flex items-center justify-center p-4 backdrop-blur-xs select-none">
            <motion.div 
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col gap-4 border border-slate-200"
            >
              {/* Receipt controller top drawer */}
              <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold tracking-tight">CUPOM NÃO FISCAL - SIMULAÇÃO</span>
                </div>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Thermal Paper Mockup Container */}
              <div className="p-8 max-h-[440px] overflow-y-auto bg-slate-50 flex items-center justify-center">
                
                {/* Simulated Thermal Tape roll */}
                <div className="bg-white p-6 shadow-md border-x border-dashed border-slate-300 w-full font-mono text-[10px] text-slate-850 flex flex-col gap-4 leading-normal relative before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-slate-100">
                  
                  {/* Merchant information */}
                  <div className="text-center flex flex-col items-center gap-1 text-[11px] font-bold border-b border-dashed border-slate-300 pb-4">
                    <Receipt className="w-6 h-6 text-slate-800" />
                    <span className="text-xs font-black uppercase text-slate-900">Gusto & Charcoal</span>
                    <span className="font-normal text-[9px] text-slate-500">FluxMenu SaaS POS Engine</span>
                    <span className="font-normal text-[9px] text-slate-500">Lorena, 1420 - Jardins, SP</span>
                  </div>

                  {/* Operational context */}
                  <div className="flex flex-col gap-1 text-slate-500 border-b border-dashed border-slate-250 pb-3">
                    <div className="flex justify-between">
                      <span>DOC: Extrato de Mesa</span>
                      <span className="font-bold text-slate-850">#{selectedTable ? selectedTable.replace(/[^\d]/g, '') : '99'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mesa:</span>
                      <span className="font-bold text-slate-850">{selectedTable}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Data:</span>
                      <span>{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hora:</span>
                      <span>{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Itemized list inside simulated tape */}
                  <div className="flex flex-col gap-2.5 border-b border-dashed border-slate-250 pb-3">
                    <div className="flex justify-between font-bold text-slate-950 pb-1">
                      <span>ITEM DESCRIÇÃO (QTD x VR)</span>
                      <span>VALOR</span>
                    </div>

                    {selectedTable && tableBillingData[selectedTable]?.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5">
                        <div className="flex justify-between">
                          <span className="uppercase">{idx+1}. {item.name}</span>
                          <span>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                        <div className="text-slate-450 text-[9px]">
                          {item.quantity} un x {formatCurrency(item.price)}
                          {item.observation && ` | OBS: ${item.observation}`}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total ledger inside simulated tape */}
                  <div className="flex flex-col gap-1.5 border-b border-dashed border-slate-300 pb-3">
                    <div className="flex justify-between">
                      <span>Subtotal Consumo:</span>
                      <span>{formatCurrency(billingSummary.subtotal)}</span>
                    </div>
                    {includeServiceTax && (
                      <div className="flex justify-between">
                        <span>Taxa de Garçom (10%):</span>
                        <span>{formatCurrency(billingSummary.taxaServico)}</span>
                      </div>
                    )}
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Desconto Aplicado:</span>
                        <span>-{formatCurrency(billingSummary.desconto)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-black text-slate-950 mt-1 pt-1.5 border-t border-dotted border-slate-250">
                      <span>TOTAL A PAGAR:</span>
                      <span>{formatCurrency(billingSummary.total)}</span>
                    </div>
                  </div>

                  {/* QR code fallback inside paper receipt for payment scan */}
                  {paymentMethod === 'pix' && checkoutStep === 'payment' && (
                    <div className="flex flex-col items-center gap-1 text-center py-2 border-b border-dashed border-slate-250">
                      <QrCode className="w-16 h-16 text-slate-800" />
                      <span className="text-[8px] text-slate-400">ESCANEIE O QR CODE PIX</span>
                    </div>
                  )}

                  {/* Thermal paper coupon footer message */}
                  <div className="text-center font-bold text-[9px] text-slate-500 pt-1">
                    <p className="uppercase">Obrigado pela preferência!</p>
                    <p className="font-normal text-[8px] text-slate-400 mt-1">FluxMenu Systems • www.fluxmenu.com.br</p>
                  </div>

                </div>

              </div>

              {/* Action options in modal */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => {
                    addToast("Visualização de impressão enviada ao driver térmico (Emulado)!", "success");
                    setShowReceiptModal(false);
                  }}
                  className="grow py-2.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Printer className="w-4 h-4" /> Imprimir Cupom
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                >
                  Fechar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
