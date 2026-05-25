import React, { useState } from 'react';
import { Lock, LogIn, Store, UserPlus } from 'lucide-react';
import { useApp } from '../../store/AppContext';

export const LoginScreen: React.FC = () => {
  const { authLoading, authError, login, registerRestaurant } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    if (!email.trim()) return setLocalError('Informe o email.');
    if (!password) return setLocalError('Informe a senha.');
    if (mode === 'register' && !restaurantName.trim()) return setLocalError('Informe o nome do restaurante.');

    try {
      if (mode === 'register') {
        await registerRestaurant(email.trim(), password, restaurantName.trim());
        window.location.hash = '#/admin';
      } else {
        await login(email.trim(), password);
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : mode === 'register' ? 'Não foi possível criar a conta.' : 'Não foi possível entrar.');
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
              {mode === 'register' ? 'Criar Restaurante' : 'Acesso Operacional'}
            </h1>
            <p className="text-[10px] text-slate-500 font-bold">
              {mode === 'register' ? 'Comece com o plano Starter.' : 'Entre para administrar o restaurante.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`h-8 rounded-lg text-[10px] font-black uppercase ${mode === 'login' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500'}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
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

        {mode === 'register' && (
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
          {authLoading ? (mode === 'register' ? 'Criando...' : 'Entrando...') : (mode === 'register' ? 'Criar e Acessar' : 'Entrar')}
        </button>
      </form>
    </div>
  );
};
