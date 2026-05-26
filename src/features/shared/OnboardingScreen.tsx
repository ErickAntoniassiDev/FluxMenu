import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock, Copy, Image as ImageIcon, LogOut, Plus, Store, Trash2 } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import * as AuthService from '../../services/authService';
import * as AssetService from '../../services/assetService';
import * as BillingService from '../../services/billingService';
import * as RestaurantService from '../../services/restaurantService';
import { OpeningHoursDay, RestaurantConfig, RestaurantOnboardingSetup, RestaurantOperationType, SaaSPlanId } from '../../types';

const DEFAULT_CATEGORIES = ['Principais', 'Bebidas'];
const DEFAULT_PRODUCTS = [
  { name: 'Produto inicial', description: 'Edite este item depois no catálogo.', price: 1, categoryName: 'Principais', prepTimeMinutes: 15 }
];
const PLAN_OPTIONS: Array<{ id: SaaSPlanId; name: string; description: string; price: string }> = [
  { id: 'starter', name: 'Starter', price: 'R$ 99/mês', description: 'QR Code, pedidos, cozinha e caixa.' },
  { id: 'pro', name: 'Pro', price: 'R$ 199/mês', description: 'Equipe, relatórios e operação completa.' },
  { id: 'premium', name: 'Premium', price: 'R$ 399/mês', description: 'Personalização e múltiplas unidades.' }
];
const WEEK_DAYS: Array<[string, string]> = [
  ['monday', 'Segunda'], ['tuesday', 'Terça'], ['wednesday', 'Quarta'], ['thursday', 'Quinta'], ['friday', 'Sexta'], ['saturday', 'Sábado'], ['sunday', 'Domingo']
];
const EMPTY_DAY: OpeningHoursDay = { open: '', close: '', closed: true };

function toSlug(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function normalizeInstagram(value: string): string { return value.trim().replace(/^@+/, ''); }
function validPhone(value: string): boolean { return !value.trim() || value.replace(/\D/g, '').length >= 10; }
function validCpfCnpj(value: string): boolean { const digits = value.replace(/\D/g, ''); return digits.length === 11 || digits.length === 14; }
function tableCode(label: string): string { return toSlug(label) || 'mesa'; }
function createTable(index: number) { return { label: 'Mesa ' + index, slug: 'mesa-' + index, active: true }; }
function readStoredStep(email?: string): number { if (!email) return 0; return Number(localStorage.getItem('flux_onboarding_step_' + email) ?? 0) || 0; }
function storeStep(email: string | undefined, step: number): void { if (email) localStorage.setItem('flux_onboarding_step_' + email, String(step)); }

export const OnboardingScreen: React.FC = () => {
  const {
    authSession, authLoading, authError, createRestaurantForCurrentUser, logout, hasActiveRestaurant,
    activeRestaurantId, currentUser, currentSubscription, refreshBilling, restaurantConfig, setRestaurantConfig
  } = useApp();
  const pending = AuthService.getPendingOnboarding(authSession?.user.email);
  const [step, setStep] = useState(() => hasActiveRestaurant ? 5 : readStoredStep(authSession?.user.email));
  const [restaurantId, setRestaurantId] = useState(activeRestaurantId);
  const [officialName, setOfficialName] = useState(pending?.restaurantName ?? restaurantConfig.name ?? '');
  const [publicName, setPublicName] = useState(pending?.restaurantName ?? restaurantConfig.name ?? '');
  const [phone, setPhone] = useState(restaurantConfig.phone ?? '');
  const [address, setAddress] = useState(restaurantConfig.address ?? '');
  const [instagram, setInstagram] = useState(restaurantConfig.instagram ?? '');
  const [operationType, setOperationType] = useState<RestaurantOperationType>('salon');
  const [deliveryEstimate, setDeliveryEstimate] = useState(restaurantConfig.deliveryEstimate ?? '15-25 min');
  const [primaryColor, setPrimaryColor] = useState(restaurantConfig.primaryColor ?? '#dc2626');
  const [secondaryColor, setSecondaryColor] = useState(restaurantConfig.secondaryColor ?? '#0f172a');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState(restaurantConfig.logoUrl ?? '');
  const [bannerPreview, setBannerPreview] = useState(restaurantConfig.bannerUrl ?? '');
  const [tables, setTables] = useState(() => [createTable(1), createTable(2), createTable(3)]);
  const [bulkCount, setBulkCount] = useState(10);
  const [openingHours, setOpeningHours] = useState<Record<string, OpeningHoursDay>>(() => Object.fromEntries(WEEK_DAYS.map(([day]) => [day, { open: '11:00', close: '23:00', closed: false }])));
  const [planId, setPlanId] = useState<SaaSPlanId>('pro');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState(currentSubscription?.checkoutUrl ?? '');
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const publicSlug = useMemo(() => toSlug(officialName || publicName), [officialName, publicName]);
  const steps = ['Dados', 'Identidade', 'Mesas', 'Horários', 'Revisão', 'Assinatura'];
  const subscriptionActive = currentSubscription?.status === 'active' || currentSubscription?.status === 'trialing';

  useEffect(() => { storeStep(authSession?.user.email, step); }, [authSession?.user.email, step]);
  useEffect(() => { if (hasActiveRestaurant) { setStep(5); setRestaurantId(activeRestaurantId); } }, [activeRestaurantId, hasActiveRestaurant]);
  useEffect(() => { if (currentSubscription?.checkoutUrl) setCheckoutUrl(currentSubscription.checkoutUrl); }, [currentSubscription?.checkoutUrl]);

  const setLogo = (file: File | null) => { if (!file) return; setLogoFile(file); setLogoPreview(URL.createObjectURL(file)); };
  const setBanner = (file: File | null) => { if (!file) return; setBannerFile(file); setBannerPreview(URL.createObjectURL(file)); };
  const updateTable = (index: number, patch: Partial<{ label: string; slug: string; active: boolean }>) => setTables(prev => prev.map((table, current) => current === index ? { ...table, ...patch } : table));
  const addTable = () => setTables(prev => [...prev, createTable(prev.length + 1)]);
  const createManyTables = () => setTables(Array.from({ length: Math.max(1, bulkCount) }, (_, index) => createTable(index + 1)));
  const updateOpeningDay = (day: string, patch: Partial<OpeningHoursDay>) => setOpeningHours(prev => ({ ...prev, [day]: { ...(prev[day] ?? EMPTY_DAY), ...patch } }));
  const copyToAll = (source = 'monday') => setOpeningHours(prev => Object.fromEntries(WEEK_DAYS.map(([day]) => [day, { ...(prev[source] ?? EMPTY_DAY) }])));
  const copyWeekdays = () => setOpeningHours(prev => ({ ...prev, tuesday: { ...prev.monday }, wednesday: { ...prev.monday }, thursday: { ...prev.monday }, friday: { ...prev.monday } }));

  const validateStep = (target = step): string | null => {
    if (target === 0) {
      if (officialName.trim().length < 2) return 'Informe o nome oficial do restaurante.';
      if (!publicSlug) return 'Nome gera um link público inválido.';
      if (!validPhone(phone)) return 'Telefone inválido. Use DDD + número.';
    }
    if (target === 2) {
      const activeTables = tables.filter(table => table.active !== false);
      if (activeTables.length === 0) return 'Cadastre pelo menos uma mesa ativa.';
      const slugs = activeTables.map(table => table.slug.trim());
      if (new Set(slugs).size !== slugs.length) return 'Existem códigos de mesa duplicados.';
      if (activeTables.some(table => !table.label.trim() || !table.slug.trim())) return 'Mesa precisa de nome e código.';
    }
    if (target === 3) {
      const invalid = Object.values(openingHours).some((day: OpeningHoursDay) => !day.closed && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(day.close)));
      if (invalid) return 'Use horários no formato 11:00 ou marque o dia como fechado.';
    }
    return null;
  };
  const goNext = () => { const error = validateStep(); if (error) return setLocalError(error); setLocalError(null); setStep(prev => Math.min(prev + 1, 5)); };

  const createRestaurant = async () => {
    for (let current = 0; current <= 3; current += 1) { const error = validateStep(current); if (error) { setStep(current); setLocalError(error); return; } }
    setLoading('create'); setLocalError(null);
    try {
      const setup: RestaurantOnboardingSetup = {
        restaurantName: officialName.trim(), publicName: publicName.trim() || officialName.trim(), planId: 'starter',
        phone: phone.trim(), address: address.trim(), instagram: normalizeInstagram(instagram), operationType, deliveryEstimate: deliveryEstimate.trim(), primaryColor, secondaryColor, openingHours,
        tables: tables.filter(table => table.active !== false).map(table => ({ label: table.label.trim(), slug: table.slug.trim(), active: table.active })),
        categories: DEFAULT_CATEGORIES.map(name => ({ name })), products: DEFAULT_PRODUCTS
      };
      const created = await createRestaurantForCurrentUser(setup);
      setRestaurantId(created.restaurantId);
      const savedConfig: RestaurantConfig = { restaurantId: created.restaurantId, slug: created.restaurantSlug, name: setup.publicName, rating: '5.0', deliveryEstimate: setup.deliveryEstimate || '15-25 min', address: setup.address || '', instagram: setup.instagram || '', phone: setup.phone, primaryColor, secondaryColor, openingHours };
      if (logoFile) savedConfig.logoUrl = await AssetService.uploadRestaurantAsset(created.restaurantId, 'logo', logoFile);
      if (bannerFile) savedConfig.bannerUrl = await AssetService.uploadRestaurantAsset(created.restaurantId, 'banner', bannerFile);
      await RestaurantService.saveRestaurantConfig(savedConfig).catch(() => undefined);
      await setRestaurantConfig(savedConfig).catch(() => undefined);
      setStep(5);
    } catch (error) { setLocalError(error instanceof Error ? error.message : 'Não foi possível criar o restaurante.'); }
    finally { setLoading(null); }
  };

  const createSubscription = async () => {
    if (!restaurantId) return setLocalError('Restaurante ainda não foi criado.');
    if (!validCpfCnpj(cpfCnpj)) return setLocalError('Informe CPF ou CNPJ válido para assinatura.');
    setLoading('billing'); setLocalError(null);
    try {
      const subscription = await BillingService.createSubscription(restaurantId, planId, { name: currentUser.name, email: currentUser.email, phone, cpfCnpj: cpfCnpj.replace(/\D/g, '') });
      setCheckoutUrl(subscription?.checkoutUrl ?? '');
      await refreshBilling();
    } catch (error) { setLocalError(error instanceof Error ? error.message : 'Não foi possível criar assinatura.'); }
    finally { setLoading(null); }
  };

  const checkPayment = async () => { setLoading('check'); await refreshBilling().catch(error => setLocalError(error instanceof Error ? error.message : 'Não foi possível verificar assinatura.')); setLoading(null); };

  return (
    <div className="h-full w-full bg-slate-50 overflow-y-auto p-4 md:p-6">
      <div className="mx-auto max-w-5xl bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center"><Store className="w-4 h-4" /></div><div><h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Configurar Restaurante</h1><p className="text-[10px] text-slate-500 font-bold">Cadastro guiado, assinatura e liberação do painel.</p></div></div>
          <button type="button" onClick={() => void logout()} disabled={authLoading} className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-[10px] font-black uppercase flex items-center justify-center gap-2 disabled:opacity-60"><LogOut className="w-3.5 h-3.5" /> Sair</button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 p-3 bg-slate-50 border-b border-slate-100">{steps.map((label, index) => <button key={label} type="button" disabled={hasActiveRestaurant && index < 5} onClick={() => !hasActiveRestaurant && setStep(index)} className={`h-8 rounded-lg text-[9px] font-black uppercase disabled:opacity-50 ${step === index ? 'bg-slate-950 text-white' : index < step ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-400'}`}>{label}</button>)}</div>
        <div className="p-5 md:p-6 space-y-5">
          {(localError || authError) && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">{localError || authError}</div>}
          {step === 0 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1.5"><label className="text-xs font-bold text-slate-500">Nome oficial</label><input value={officialName} onChange={e => { setOfficialName(e.target.value); if (!publicName) setPublicName(e.target.value); }} className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold" autoFocus /></div><div className="space-y-1.5"><label className="text-xs font-bold text-slate-500">Nome público exibido</label><input value={publicName} onChange={e => setPublicName(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 text-sm" /></div><div className="md:col-span-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">Link público previsto: /r/{publicSlug || 'nome-do-restaurante'}. Esse identificador será usado nos QR Codes e não poderá ser alterado depois sem suporte.</div><input placeholder="Telefone" value={phone} onChange={e => setPhone(e.target.value)} className="p-3 rounded-xl border border-slate-200 text-sm" /><input placeholder="Instagram" value={instagram} onChange={e => setInstagram(e.target.value)} className="p-3 rounded-xl border border-slate-200 text-sm" /><input placeholder="Endereço" value={address} onChange={e => setAddress(e.target.value)} className="p-3 rounded-xl border border-slate-200 text-sm" /><input placeholder="Tempo médio ex: 15-25 min" value={deliveryEstimate} onChange={e => setDeliveryEstimate(e.target.value)} className="p-3 rounded-xl border border-slate-200 text-sm" /><select value={operationType} onChange={e => setOperationType(e.target.value as RestaurantOperationType)} className="md:col-span-2 p-3 rounded-xl border border-slate-200 text-sm bg-white"><option value="salon">Salão</option><option value="delivery">Delivery</option><option value="pickup">Retirada</option><option value="salon_delivery">Salão + delivery</option></select></div>}
          {step === 1 && <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-3 border border-slate-200 rounded-xl p-4"><span className="text-xs font-black uppercase text-slate-900">Logo</span>{logoPreview ? <img src={logoPreview} className="w-20 h-20 object-cover rounded-xl border" /> : <div className="w-20 h-20 rounded-xl bg-slate-50 border flex items-center justify-center text-slate-400"><ImageIcon className="w-5 h-5" /></div>}<label className="h-9 w-max px-3 rounded-lg bg-slate-950 text-white text-[10px] font-black uppercase flex items-center cursor-pointer">Enviar logo<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => setLogo(e.target.files?.[0] ?? null)} /></label></div><div className="space-y-3 border border-slate-200 rounded-xl p-4"><span className="text-xs font-black uppercase text-slate-900">Banner</span>{bannerPreview ? <img src={bannerPreview} className="w-full h-28 object-cover rounded-xl border" /> : <div className="w-full h-28 rounded-xl bg-slate-50 border flex items-center justify-center text-slate-400"><ImageIcon className="w-5 h-5" /></div>}<label className="h-9 w-max px-3 rounded-lg bg-slate-950 text-white text-[10px] font-black uppercase flex items-center cursor-pointer">Enviar banner<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => setBanner(e.target.files?.[0] ?? null)} /></label></div><label className="text-xs font-bold text-slate-500">Cor primária<input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="mt-1 w-full h-11 rounded-lg border" /></label><label className="text-xs font-bold text-slate-500">Cor secundária<input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="mt-1 w-full h-11 rounded-lg border" /></label></div>}
          {step === 2 && <div className="space-y-4"><div className="flex flex-wrap gap-2"><button onClick={addTable} className="h-10 px-4 rounded-xl bg-slate-950 text-white text-xs font-black uppercase flex items-center gap-2"><Plus className="w-4 h-4" />Adicionar mesa</button><input type="number" value={bulkCount} onChange={e => setBulkCount(Number(e.target.value))} className="h-10 w-24 rounded-xl border px-3 text-xs font-bold" /><button onClick={createManyTables} className="h-10 px-4 rounded-xl border text-xs font-black uppercase">Criar várias mesas</button></div><p className="text-xs text-slate-500 font-semibold">Cada mesa terá um QR Code próprio depois.</p><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{tables.map((table, index) => <div key={index} className="p-3 rounded-xl border border-slate-200 space-y-2"><div className="flex justify-between"><span className="text-[10px] font-black uppercase text-slate-400">Mesa {index + 1}</span><button onClick={() => setTables(prev => prev.filter((_, current) => current !== index))} className="text-red-600"><Trash2 className="w-4 h-4" /></button></div><input value={table.label} onChange={e => updateTable(index, { label: e.target.value, slug: tableCode(e.target.value) })} className="w-full p-2.5 rounded-lg border text-xs font-bold" /><input value={table.slug} onChange={e => updateTable(index, { slug: toSlug(e.target.value) })} className="w-full p-2.5 rounded-lg border text-xs font-mono" /><label className="text-xs font-bold text-slate-500 flex gap-2"><input type="checkbox" checked={table.active} onChange={e => updateTable(index, { active: e.target.checked })} />Ativa</label></div>)}</div></div>}
          {step === 3 && <div className="space-y-4"><div className="flex flex-wrap gap-2"><button onClick={() => copyToAll()} className="h-9 px-3 rounded-lg bg-slate-950 text-white text-[10px] font-black uppercase flex gap-1"><Copy className="w-3.5 h-3.5" />Copiar para todos</button><button onClick={copyWeekdays} className="h-9 px-3 rounded-lg border text-[10px] font-black uppercase">Copiar segunda a sexta</button></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{WEEK_DAYS.map(([day, label]) => { const value = openingHours[day] ?? EMPTY_DAY; return <div key={day} className="p-3 rounded-xl border space-y-2"><div className="flex justify-between"><span className="text-[10px] font-black uppercase text-slate-500">{label}</span><label className="text-[10px] font-bold text-slate-500"><input type="checkbox" checked={value.closed} onChange={e => updateOpeningDay(day, { closed: e.target.checked })} /> Fechado</label></div><div className="grid grid-cols-2 gap-2"><input disabled={value.closed} value={value.open} onChange={e => updateOpeningDay(day, { open: e.target.value, closed: false })} className="p-2.5 rounded-lg border text-xs" placeholder="11:00" /><input disabled={value.closed} value={value.close} onChange={e => updateOpeningDay(day, { close: e.target.value, closed: false })} className="p-2.5 rounded-lg border text-xs" placeholder="23:00" /></div></div>; })}</div></div>}
          {step === 4 && <div className="grid grid-cols-1 md:grid-cols-4 gap-3"><div className="p-4 rounded-xl border"><span className="text-[9px] font-black uppercase text-slate-400">Nome</span><p className="text-sm font-black text-slate-900">{publicName || officialName}</p></div><div className="p-4 rounded-xl border"><span className="text-[9px] font-black uppercase text-slate-400">Link</span><p className="text-sm font-black text-slate-900 break-all">/r/{publicSlug}</p></div><div className="p-4 rounded-xl border"><span className="text-[9px] font-black uppercase text-slate-400">Mesas</span><p className="text-sm font-black text-slate-900">{tables.filter(t => t.active).length}</p></div><div className="p-4 rounded-xl border"><span className="text-[9px] font-black uppercase text-slate-400">Assinatura</span><p className="text-sm font-black text-slate-900">Ainda não escolhida</p></div><div className="md:col-span-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">O painel só será liberado após criar a assinatura e o pagamento ser confirmado.</div></div>}
          {step === 5 && <div className="space-y-5"><div className="p-4 rounded-xl border border-slate-200 bg-slate-50"><h2 className="text-sm font-black uppercase text-slate-900">Assinatura</h2><p className="text-xs text-slate-500 font-semibold mt-1">Escolha um plano. Enquanto a assinatura estiver pendente, o painel fica bloqueado.</p>{currentSubscription && <p className="text-xs font-black uppercase mt-3 text-slate-700">Status atual: {currentSubscription.status}</p>}</div>{subscriptionActive ? <button onClick={() => { window.location.hash = '#/admin'; }} className="h-11 px-5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase">Entrar no admin</button> : <><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{PLAN_OPTIONS.map(plan => <button key={plan.id} onClick={() => setPlanId(plan.id)} className={`p-4 rounded-xl border text-left ${planId === plan.id ? 'border-red-600 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}><span className="text-xs font-black uppercase text-slate-900 block">{plan.name}</span><span className="text-sm font-black text-red-600 block mt-1">{plan.price}</span><span className="text-[10px] text-slate-500 font-semibold mt-1 block">{plan.description}</span>{planId === plan.id && <span className="text-[9px] font-black uppercase text-red-600 mt-3 flex items-center gap-1"><Check className="w-3 h-3" /> selecionado</span>}</button>)}</div><input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} placeholder="CPF ou CNPJ do responsável" className="w-full max-w-sm p-3 rounded-xl border text-sm" /><div className="flex flex-wrap gap-2"><button onClick={createSubscription} disabled={loading === 'billing'} className="h-11 px-5 rounded-xl bg-red-600 text-white text-xs font-black uppercase disabled:opacity-60">{loading === 'billing' ? 'Processando...' : 'Criar assinatura'}</button><button onClick={() => void checkPayment()} disabled={loading === 'check'} className="h-11 px-5 rounded-xl border text-xs font-black uppercase disabled:opacity-60">Verificar pagamento</button>{checkoutUrl && <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="h-11 px-5 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase flex items-center">Abrir cobrança</a>}</div><p className="text-xs text-slate-500 font-semibold">Assinatura pendente. Assim que o pagamento for confirmado, seu painel será liberado.</p></>}</div>}
        </div>
        <div className="p-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50"><button type="button" onClick={() => { setLocalError(null); setStep(prev => Math.max(prev - 1, 0)); }} disabled={step === 0 || step === 5 || authLoading || loading !== null} className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-black uppercase flex items-center gap-2 disabled:opacity-40"><ArrowLeft className="w-4 h-4" /> Voltar</button>{step < 4 ? <button type="button" onClick={goNext} disabled={authLoading || loading !== null} className="h-10 px-4 rounded-xl bg-slate-950 text-white text-xs font-black uppercase flex items-center gap-2 disabled:opacity-60">Continuar <ArrowRight className="w-4 h-4" /></button> : step === 4 ? <button type="button" onClick={() => void createRestaurant()} disabled={loading === 'create'} className="h-10 px-4 rounded-xl bg-red-600 text-white text-xs font-black uppercase flex items-center gap-2 disabled:opacity-60"><Store className="w-4 h-4" /> {loading === 'create' ? 'Criando...' : 'Continuar para assinatura'}</button> : <span className="text-[10px] text-slate-400 font-bold uppercase">Pagamento obrigatório para liberar acesso</span>}</div>
      </div>
    </div>
  );
};
