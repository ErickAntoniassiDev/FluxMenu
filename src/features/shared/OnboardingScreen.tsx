import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LogOut, Plus, Store, Trash2 } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import * as AuthService from '../../services/authService';
import { RestaurantOnboardingSetup, SaaSPlanId } from '../../types';

const DEFAULT_CATEGORIES = ['Entradas', 'Principais', 'Bebidas', 'Sobremesas'];
const DEFAULT_TABLES = ['Mesa 01', 'Mesa 02', 'Mesa 03', 'Mesa 04', 'Balcao 01'];
const DEFAULT_PRODUCTS = [
  { name: 'Prato da casa', description: 'Item inicial para editar depois.', price: 39.9, categoryName: 'Principais', prepTimeMinutes: 20 },
  { name: 'Bebida da casa', description: 'Bebida inicial para o cardapio.', price: 9.9, categoryName: 'Bebidas', prepTimeMinutes: 5 }
];

const PLAN_OPTIONS: Array<{ id: SaaSPlanId; name: string; description: string }> = [
  { id: 'starter', name: 'Starter', description: 'Comece simples, com QR, pedidos, cozinha e caixa.' },
  { id: 'pro', name: 'Pro', description: 'Equipe, relatórios e operação mais completa.' },
  { id: 'premium', name: 'Premium', description: 'Personalização avançada e múltiplas unidades.' }
];

function splitLines(value: string): string[] {
  return value.split('\n').map(item => item.trim()).filter(Boolean);
}

export const OnboardingScreen: React.FC = () => {
  const { authSession, authLoading, authError, createRestaurantForCurrentUser, logout } = useApp();
  const pending = AuthService.getPendingOnboarding(authSession?.user.email);
  const [step, setStep] = useState(0);
  const [restaurantName, setRestaurantName] = useState(pending?.restaurantName ?? '');
  const [planId, setPlanId] = useState<SaaSPlanId>('starter');
  const [tablesText, setTablesText] = useState(DEFAULT_TABLES.join('\n'));
  const [categoriesText, setCategoriesText] = useState(DEFAULT_CATEGORIES.join('\n'));
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [localError, setLocalError] = useState<string | null>(null);

  const categories = useMemo(() => splitLines(categoriesText), [categoriesText]);
  const tables = useMemo(() => splitLines(tablesText), [tablesText]);

  const addProduct = () => {
    setProducts(prev => [...prev, { name: '', description: '', price: 0, categoryName: categories[0] ?? 'Principais', prepTimeMinutes: 15 }]);
  };

  const removeProduct = (index: number) => {
    setProducts(prev => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const validateStep = (targetStep = step): string | null => {
    if (targetStep === 0 && restaurantName.trim().length < 2) return 'Informe o nome do restaurante.';
    if (targetStep === 2 && tables.length === 0) return 'Cadastre pelo menos uma mesa.';
    if (targetStep === 3 && categories.length === 0) return 'Cadastre pelo menos uma categoria.';
    if (targetStep === 4) {
      const invalid = products.some(product => !product.name.trim() || product.price <= 0 || !product.categoryName.trim());
      if (invalid) return 'Preencha nome, categoria e preco dos produtos iniciais.';
    }
    return null;
  };

  const goNext = () => {
    const error = validateStep();
    if (error) return setLocalError(error);
    setLocalError(null);
    setStep(prev => Math.min(prev + 1, 5));
  };

  const handleSubmit = async () => {
    for (let currentStep = 0; currentStep <= 4; currentStep += 1) {
      const error = validateStep(currentStep);
      if (error) {
        setStep(currentStep);
        setLocalError(error);
        return;
      }
    }

    const setup: RestaurantOnboardingSetup = {
      restaurantName: restaurantName.trim(),
      planId,
      tables: tables.map(label => ({ label })),
      categories: categories.map(name => ({ name })),
      products: products
        .filter(product => product.name.trim())
        .map(product => ({
          name: product.name.trim(),
          description: product.description.trim() || 'Descricao inicial.',
          price: product.price,
          categoryName: product.categoryName.trim() || categories[0] || 'Principais',
          prepTimeMinutes: product.prepTimeMinutes || 15
        }))
    };

    try {
      await createRestaurantForCurrentUser(setup);
      window.location.hash = '#/admin';
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Nao foi possivel concluir o onboarding.');
    }
  };

  const steps = ['Loja', 'Plano', 'Mesas', 'Categorias', 'Produtos', 'Revisao'];

  return (
    <div className="h-full w-full bg-slate-50 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center"><Store className="w-4 h-4" /></div>
            <div>
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Configurar Restaurante</h1>
              <p className="text-[10px] text-slate-500 font-bold">Crie a loja com mesas, categorias e primeiros produtos.</p>
            </div>
          </div>
          <button type="button" onClick={() => void logout()} disabled={authLoading} className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-[10px] font-black uppercase flex items-center justify-center gap-2 disabled:opacity-60">
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 p-3 bg-slate-50 border-b border-slate-100">
          {steps.map((label, index) => <button key={label} type="button" onClick={() => setStep(index)} className={`h-8 rounded-lg text-[9px] font-black uppercase ${step === index ? 'bg-slate-950 text-white' : index < step ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-400'}`}>{label}</button>)}
        </div>

        <div className="p-5 md:p-6 space-y-5">
          {(localError || authError) && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">{localError || authError}</div>}

          {step === 0 && <div className="space-y-3 max-w-xl">
            <label className="text-xs font-bold text-slate-500">Nome do restaurante</label>
            <input value={restaurantName} onChange={(event) => setRestaurantName(event.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-red-600 font-bold" autoComplete="organization" autoFocus />
          </div>}

          {step === 1 && <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PLAN_OPTIONS.map(plan => <button key={plan.id} type="button" onClick={() => setPlanId(plan.id)} className={`p-4 rounded-xl border text-left ${planId === plan.id ? 'border-red-600 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <span className="text-xs font-black uppercase text-slate-900 block">{plan.name}</span>
              <span className="text-[10px] text-slate-500 font-semibold mt-1 block leading-relaxed">{plan.description}</span>
              {planId === plan.id && <span className="text-[9px] font-black uppercase text-red-600 mt-3 flex items-center gap-1"><Check className="w-3 h-3" /> selecionado</span>}
            </button>)}
            <p className="md:col-span-3 text-[10px] text-slate-500 font-bold">A assinatura real e upgrades continuam sendo feitos pela tela de Assinatura com Asaas. O cadastro inicial usa Starter com seguranca no backend.</p>
          </div>}

          {step === 2 && <div className="space-y-2 max-w-xl">
            <label className="text-xs font-bold text-slate-500">Mesas iniciais, uma por linha</label>
            <textarea value={tablesText} onChange={(event) => setTablesText(event.target.value)} rows={7} className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-red-600 font-mono" />
          </div>}

          {step === 3 && <div className="space-y-2 max-w-xl">
            <label className="text-xs font-bold text-slate-500">Categorias iniciais, uma por linha</label>
            <textarea value={categoriesText} onChange={(event) => setCategoriesText(event.target.value)} rows={6} className="w-full p-3 rounded-xl border border-slate-200 text-sm outline-hidden focus:border-red-600 font-mono" />
          </div>}

          {step === 4 && <div className="space-y-3">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xs font-black uppercase text-slate-900">Produtos iniciais</h2><button type="button" onClick={addProduct} className="h-9 px-3 rounded-lg bg-slate-950 text-white text-[10px] font-black uppercase flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Produto</button></div>
            <div className="space-y-3">
              {products.map((product, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_150px_120px_110px_auto] gap-2 p-3 rounded-xl border border-slate-200">
                <input placeholder="Nome" value={product.name} onChange={(event) => setProducts(prev => prev.map((item, currentIndex) => currentIndex === index ? { ...item, name: event.target.value } : item))} className="p-2.5 rounded-lg border border-slate-200 text-xs font-bold" />
                <select value={product.categoryName} onChange={(event) => setProducts(prev => prev.map((item, currentIndex) => currentIndex === index ? { ...item, categoryName: event.target.value } : item))} className="p-2.5 rounded-lg border border-slate-200 text-xs font-bold bg-white">{categories.map(category => <option key={category} value={category}>{category}</option>)}</select>
                <input type="number" step="0.01" placeholder="Preco" value={product.price || ''} onChange={(event) => setProducts(prev => prev.map((item, currentIndex) => currentIndex === index ? { ...item, price: Number(event.target.value) } : item))} className="p-2.5 rounded-lg border border-slate-200 text-xs font-mono font-bold" />
                <input type="number" placeholder="Min" value={product.prepTimeMinutes || ''} onChange={(event) => setProducts(prev => prev.map((item, currentIndex) => currentIndex === index ? { ...item, prepTimeMinutes: Number(event.target.value) } : item))} className="p-2.5 rounded-lg border border-slate-200 text-xs font-mono font-bold" />
                <button type="button" onClick={() => removeProduct(index)} className="h-10 px-3 rounded-lg border border-red-200 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                <input placeholder="Descricao" value={product.description} onChange={(event) => setProducts(prev => prev.map((item, currentIndex) => currentIndex === index ? { ...item, description: event.target.value } : item))} className="md:col-span-5 p-2.5 rounded-lg border border-slate-200 text-xs" />
              </div>)}
            </div>
          </div>}

          {step === 5 && <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl border border-slate-200"><span className="text-[9px] font-black uppercase text-slate-400">Restaurante</span><p className="text-sm font-black text-slate-900 mt-1">{restaurantName || '-'}</p></div>
            <div className="p-4 rounded-xl border border-slate-200"><span className="text-[9px] font-black uppercase text-slate-400">Plano</span><p className="text-sm font-black text-slate-900 mt-1">{planId}</p></div>
            <div className="p-4 rounded-xl border border-slate-200"><span className="text-[9px] font-black uppercase text-slate-400">Mesas</span><p className="text-sm font-black text-slate-900 mt-1">{tables.length}</p></div>
            <div className="p-4 rounded-xl border border-slate-200"><span className="text-[9px] font-black uppercase text-slate-400">Produtos</span><p className="text-sm font-black text-slate-900 mt-1">{products.filter(product => product.name.trim()).length}</p></div>
          </div>}
        </div>

        <div className="p-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
          <button type="button" onClick={() => { setLocalError(null); setStep(prev => Math.max(prev - 1, 0)); }} disabled={step === 0 || authLoading} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black uppercase flex items-center gap-2 disabled:opacity-40"><ArrowLeft className="w-4 h-4" /> Voltar</button>
          {step < 5 ? <button type="button" onClick={goNext} disabled={authLoading} className="h-10 px-4 rounded-xl bg-slate-950 text-white text-xs font-black uppercase flex items-center gap-2 disabled:opacity-60">Continuar <ArrowRight className="w-4 h-4" /></button> : <button type="button" onClick={() => void handleSubmit()} disabled={authLoading} className="h-10 px-4 rounded-xl bg-red-600 text-white text-xs font-black uppercase flex items-center gap-2 disabled:opacity-60"><Store className="w-4 h-4" /> {authLoading ? 'Criando...' : 'Criar restaurante'}</button>}
        </div>
      </div>
    </div>
  );
};
