import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import * as StaffService from '../../services/staffService';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

function getRouteForRole(role: string): string {
  if (role === 'manager' || role === 'owner') return '/admin';
  if (role === 'kitchen') return '/cozinha';
  if (role === 'cashier') return '/caixa';
  return '/pedidos';
}

function goToHashRoute(route: string): void {
  window.location.assign(window.location.origin + '/#' + route);
}

function readInviteToken(): string {
  const searchToken = new URLSearchParams(window.location.search).get('token');
  if (searchToken) return searchToken;
  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');
  if (queryIndex >= 0) return new URLSearchParams(hash.slice(queryIndex + 1)).get('token') ?? '';
  return '';
}

export const AcceptInviteScreen: React.FC = () => {
  const { authLoading, isAuthenticated, refreshAuthContext } = useApp();
  const token = useMemo(() => readInviteToken() || localStorage.getItem('flux_pending_staff_invite_token') || '', []);
  const [status, setStatus] = useState<'idle' | 'accepting' | 'accepted' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [acceptedRoute, setAcceptedRoute] = useState('/pedidos');
  const acceptStartedRef = useRef(false);

  useEffect(() => {
    if (token && !isAuthenticated) localStorage.setItem('flux_pending_staff_invite_token', token);
    if (authLoading || !isAuthenticated || !token || status !== 'idle' || acceptStartedRef.current) return;

    acceptStartedRef.current = true;
    setStatus('accepting');

    withTimeout(
      StaffService.acceptStaffInvitation(token),
      15000,
      'O aceite demorou mais que o esperado. Atualize a página ou tente entrar novamente.'
    )
      .then(accepted => {
        localStorage.removeItem('flux_pending_staff_invite_token');
        setAcceptedRoute(getRouteForRole(accepted.role));
        setMessage('Convite aceito. Você agora tem acesso ao restaurante ' + accepted.restaurantName + '.');
        setStatus('accepted');
        void withTimeout(
          refreshAuthContext(),
          10000,
          'Convite aceito, mas a sessão ainda não atualizou. Entre novamente se o painel não abrir.'
        ).catch(error => {
          setMessage('Convite aceito. Se o painel não abrir, saia e entre novamente com este email. ' + (error instanceof Error ? error.message : ''));
        });
      })
      .catch(error => {
        setMessage(error instanceof Error ? error.message : 'Não foi possível aceitar o convite.');
        setStatus('error');
        void refreshAuthContext().catch(() => undefined);
      });
  }, [authLoading, isAuthenticated, refreshAuthContext, status, token]);

  return (
    <div className="h-full w-full bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center space-y-5">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center">
          {status === 'accepted' ? <CheckCircle className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
        </div>

        <div>
          <h1 className="text-sm font-black uppercase tracking-tight text-slate-950">Convite de funcionário</h1>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
            {token ? 'Entre com o mesmo email que recebeu o convite. Se ainda não criou senha, use Criar conta.' : 'Este link de convite está incompleto.'}
          </p>
        </div>

        {!token && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">Convite inválido. Peça um novo convite ao restaurante.</div>}
        {message && <div className={`rounded-xl border p-3 text-xs font-bold ${status === 'accepted' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>{message}</div>}
        {authLoading && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-500">Carregando sessão...</div>}
        {!authLoading && token && !isAuthenticated && (
          <button onClick={() => { localStorage.setItem('flux_pending_staff_invite_token', token); goToHashRoute('/login?staffInvite=1'); }} className="h-11 w-full rounded-xl bg-slate-950 text-white text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer">
            <LogIn className="h-4 w-4" /> Entrar ou criar conta
          </button>
        )}
        {status === 'accepting' && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-500">Aceitando convite... Se demorar mais de alguns segundos, a tela mostrará o erro real.</div>}
        {status === 'error' && token && (
          <button onClick={() => { acceptStartedRef.current = false; setStatus('idle'); setMessage(''); }} className="h-11 w-full rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black uppercase cursor-pointer">
            Tentar novamente
          </button>
        )}
        {status === 'accepted' && (
          <button onClick={() => goToHashRoute(acceptedRoute)} className="h-11 w-full rounded-xl bg-emerald-600 text-white text-xs font-black uppercase flex items-center justify-center gap-2 cursor-pointer">
            <ShieldCheck className="h-4 w-4" /> Ir para minha área
          </button>
        )}
      </div>
    </div>
  );
};
