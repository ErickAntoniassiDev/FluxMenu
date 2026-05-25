import React, { useState } from 'react';
import { Store, LogOut } from 'lucide-react';
import { useApp } from '../../store/AppContext';

export const OnboardingScreen: React.FC = () => {
  const { authLoading, authError, createRestaurantForCurrentUser, logout } = useApp();
  const [restaurantName, setRestaurantName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    if (!restaurantName.trim()) return setLocalError('Informe o nome do restaurante.');

    try {
      await createRestaurantForCurrentUser(restaurantName.trim());
      window.location.hash = '#/admin';
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Não foi possível concluir o onboarding.');
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-50 p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Criar Restaurante</h1>
            <p className="text-[10px] text-slate-500 font-bold">Conclua o cadastro da sua primeira loja.</p>
          </div>
        </div>

        {(localError || authError) && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            {localError || authError}
          </div>
        )}

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

        <button
          type="submit"
          disabled={authLoading}
          className="w-full h-11 rounded-xl bg-slate-950 text-white text-xs font-black uppercase flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Store className="w-4 h-4" />
          {authLoading ? 'Criando...' : 'Criar loja'}
        </button>

        <button
          type="button"
          onClick={() => void logout()}
          disabled={authLoading}
          className="w-full h-9 rounded-xl border border-slate-200 bg-white text-slate-600 text-[10px] font-black uppercase flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </form>
    </div>
  );
};
