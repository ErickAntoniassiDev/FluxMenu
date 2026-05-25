import React, { useState } from 'react';
import { Lock, LogIn } from 'lucide-react';
import { useApp } from '../../store/AppContext';

export const LoginScreen: React.FC = () => {
  const { authLoading, authError, login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    if (!email.trim()) return setLocalError('Informe o email.');
    if (!password) return setLocalError('Informe a senha.');
    try {
      await login(email.trim(), password);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Não foi possível entrar.');
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Acesso Operacional</h1>
            <p className="text-[10px] text-slate-500 font-bold">Entre para administrar o restaurante.</p>
          </div>
        </div>

        {(localError || authError) && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            {localError || authError}
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
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={authLoading}
          className="w-full h-11 rounded-xl bg-slate-950 text-white text-xs font-black uppercase flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <LogIn className="w-4 h-4" />
          {authLoading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};
