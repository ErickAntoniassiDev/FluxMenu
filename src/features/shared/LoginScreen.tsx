import React, { useState } from 'react';
import { Lock, LogIn, Store, UserPlus } from 'lucide-react';
import { useApp } from '../../store/AppContext';

function isInviteLoginRoute(): boolean {
  const hash = window.location.hash;
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : window.location.search.replace(/^\?/, '');
  return new URLSearchParams(query).get('staffInvite') === '1';
}

export const LoginScreen: React.FC = () => {
  const { authLoading, authError, login, registerRestaurant, registerInvitedStaff, resendConfirmationEmail } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [localSuccess, setLocalSuccess] = useState<string | null>(null);
  const pendingInviteToken = localStorage.getItem('flux_pending_staff_invite_token');
  const isStaffInviteFlow = Boolean(pendingInviteToken && isInviteLoginRoute());

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    setLocalSuccess(null);
    if (!email.trim()) return setLocalError('Informe o email.');
    if (!password) return setLocalError('Informe a senha.');
    if (mode === 'register' && !isStaffInviteFlow && !restaurantName.trim()) return setLocalError('Informe o nome do restaurante.');

    try {
      if (mode === 'register') {
        if (isStaffInviteFlow) {
          await registerInvitedStaff(email.trim(), password);
          window.location.hash = '#/accept-invite?token=' + encodeURIComponent(pendingInviteToken ?? '');
          return;
        }
        await registerRestaurant(email.trim(), password, restaurantName.trim());
        window.location.hash = '#/onboarding';
      } else {
        await login(email.trim(), password);
        if (isStaffInviteFlow) {
          window.location.hash = '#/accept-invite?token=' + encodeURIComponent(pendingInviteToken ?? '');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : mode === 'register' ? 'Não foi possível criar a conta.' : 'Não foi possível entrar.';
      if (message.includes('Confirme o email')) setLocalSuccess(message);
      else setLocalError(message);
    }
  };


  const handleResendConfirmation = async () => {
    setLocalError(null);
    setLocalSuccess(null);
    if (!email.trim()) return setLocalError('Informe o email para reenviar a confirmação.');
    try {
      await resendConfirmationEmail(email.trim());
      setLocalSuccess('Email de confirmação reenviado. Verifique sua caixa de entrada.');
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Não foi possível reenviar a confirmação.');
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center">
            {mode === 'register' ? <Store className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">
              {mode === 'register' ? (isStaffInviteFlow ? 'Criar acesso de funcionário' : 'Criar Restaurante') : 'Acesso Operacional'}
            </h1>
            <p className="text-[10px] text-slate-500 font-bold">
              {mode === 'register' ? (isStaffInviteFlow ? 'Use o mesmo email que recebeu o convite.' : 'Configure sua loja e escolha um plano.') : 'Entre para acessar sua área permitida.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setLocalError(null); setLocalSuccess(null); }}
            className={`h-8 rounded-lg text-[10px] font-black uppercase ${mode === 'login' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setLocalError(null); setLocalSuccess(null); }}
            className={`h-8 rounded-lg text-[10px] font-black uppercase ${mode === 'register' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}
          >
            Criar conta
          </button>
        </div>

        {(localError || authError) && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            {localError || authError}
          </div>
        )}

        {localSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            {localSuccess}
          </div>
        )}

        {mode === 'register' && !isStaffInviteFlow && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">Nome do restaurante</label>
            <input
              type="text"
              value={restaurantName}
              onChange={(event) => setRestaurantName(event.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 text-sm outline-hidden focus:border-red-600"
              autoComplete="organization"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm outline-hidden focus:border-red-600"
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm outline-hidden focus:border-red-600"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
        </div>

        <button
          type="submit"
          disabled={authLoading}
          className="w-full h-11 rounded-xl bg-slate-950 text-white text-xs font-black uppercase flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {mode === 'register' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          {authLoading ? (mode === 'register' ? 'Criando...' : 'Entrando...') : (mode === 'register' ? (isStaffInviteFlow ? 'Criar acesso' : 'Criar e acessar') : 'Entrar')}
        </button>

        {isStaffInviteFlow && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold text-amber-800">
            Você está aceitando um convite. Se ainda não tem senha, clique em Criar conta e use o email convidado.
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleResendConfirmation()}
          disabled={authLoading}
          className="w-full text-[10px] font-black uppercase text-slate-500 hover:text-red-600 disabled:opacity-60"
        >
          Reenviar email de confirmação
        </button>
      </form>
    </div>
  );
};
