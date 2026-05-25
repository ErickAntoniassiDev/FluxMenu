import { createClient, type SupabaseClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const isDev = import.meta.env.DEV;
const authStorageKey = 'flux_supabase_auth_session';

export type SupabaseAuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: {
    id: string;
    email: string;
  };
};

type SupabaseAuthResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
  };
};

let currentAuthSession: SupabaseAuthSession | null = readStoredAuthSession();
let supabaseRealtimeClient: SupabaseClient | null = null;

function readStoredAuthSession(): SupabaseAuthSession | null {
  const raw = localStorage.getItem(authStorageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SupabaseAuthSession;
  } catch {
    localStorage.removeItem(authStorageKey);
    return null;
  }
}

function persistAuthSession(session: SupabaseAuthSession | null): void {
  currentAuthSession = session;
  if (!session) localStorage.removeItem(authStorageKey);
  else localStorage.setItem(authStorageKey, JSON.stringify(session));
  syncSupabaseRealtimeAuth();
}

function toAuthSession(response: SupabaseAuthResponse): SupabaseAuthSession {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: Date.now() + response.expires_in * 1000,
    user: {
      id: response.user.id,
      email: response.user.email ?? ''
    }
  };
}

function getAuthorizationToken(): string {
  return currentAuthSession?.accessToken ?? supabaseAnonKey ?? '';
}

export function getSupabaseBaseUrl(): string {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not configured.');
  }

  return supabaseUrl.replace(/\/$/, '');
}


export function getSupabaseRealtimeClient(): SupabaseClient {
  const baseUrl = getSupabaseBaseUrl();
  if (!supabaseRealtimeClient) {
    supabaseRealtimeClient = createClient(baseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } }
    });
  }

  if (currentAuthSession?.accessToken) {
    supabaseRealtimeClient.realtime.setAuth(currentAuthSession.accessToken);
  }

  return supabaseRealtimeClient;
}

export function syncSupabaseRealtimeAuth(): void {
  if (!supabaseRealtimeClient) return;
  supabaseRealtimeClient.realtime.setAuth(currentAuthSession?.accessToken ?? supabaseAnonKey);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getStoredAuthSession(): SupabaseAuthSession | null {
  return currentAuthSession;
}



export async function resendSignupConfirmation(email: string): Promise<void> {
  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(baseUrl + '/auth/v1/resend', {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type: 'signup', email })
  });

  if (!response.ok) {
    let message = 'Não foi possível reenviar o email de confirmação.';
    try {
      const payload = await response.json() as { error?: string; error_description?: string; msg?: string; message?: string };
      message = payload.error_description ?? payload.message ?? payload.msg ?? payload.error ?? message;
    } catch {
      // Keep the generic message when Supabase does not return a JSON error body.
    }
    throw new Error(message);
  }
}

export async function signUpWithPassword(email: string, password: string): Promise<SupabaseAuthSession | null> {
  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(baseUrl + '/auth/v1/signup', {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    let message = 'Não foi possível criar a conta.';
    try {
      const payload = await response.json() as { error?: string; error_description?: string; msg?: string; message?: string };
      message = payload.error_description ?? payload.message ?? payload.msg ?? payload.error ?? message;
    } catch {
      // Keep the generic message when Supabase does not return a JSON error body.
    }
    throw new Error(message);
  }

  const payload = await response.json() as Partial<SupabaseAuthResponse>;
  if (!payload.access_token || !payload.refresh_token || !payload.expires_in || !payload.user?.id) {
    return null;
  }

  const session = toAuthSession(payload as SupabaseAuthResponse);
  persistAuthSession(session);
  return session;
}

export async function signInWithPassword(email: string, password: string): Promise<SupabaseAuthSession> {
  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(baseUrl + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    let message = 'Login inválido ou não autorizado.';
    try {
      const payload = await response.json() as { error?: string; error_description?: string; msg?: string; message?: string };
      message = payload.error_description ?? payload.message ?? payload.msg ?? payload.error ?? message;
    } catch {
      // Keep the generic message when Supabase does not return a JSON error body.
    }
    throw new Error(message);
  }

  const session = toAuthSession(await response.json() as SupabaseAuthResponse);
  persistAuthSession(session);
  return session;
}

export async function refreshStoredAuthSession(): Promise<SupabaseAuthSession | null> {
  if (!currentAuthSession) return null;
  if (currentAuthSession.expiresAt > Date.now() + 30000) return currentAuthSession;

  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(baseUrl + '/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: currentAuthSession.refreshToken })
  });

  if (!response.ok) {
    persistAuthSession(null);
    return null;
  }

  const session = toAuthSession(await response.json() as SupabaseAuthResponse);
  persistAuthSession(session);
  return session;
}

export async function signOutFromSupabase(): Promise<void> {
  if (currentAuthSession) {
    const baseUrl = getSupabaseBaseUrl();
    await fetch(baseUrl + '/auth/v1/logout', {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: 'Bearer ' + currentAuthSession.accessToken
      }
    }).catch(() => undefined);
  }
  persistAuthSession(null);
}

export function logDataSource(scope: string, source: 'supabase' | 'fallback', details?: unknown): void {
  if (!isDev) return;
  const message = '[FluxMenu data] ' + scope + ' loaded from ' + (source === 'supabase' ? 'Supabase' : 'local fallback') + '.';
  if (details) console.info(message, details);
  else console.info(message);
}

export function logSupabaseFallback(scope: string, error: unknown): void {
  if (!isDev) return;
  console.warn('[FluxMenu data] ' + scope + ' fell back to local data.', error);
}

export async function selectFromSupabase<T>(tableName: string, query = 'select=*'): Promise<T[]> {
  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(baseUrl + '/rest/v1/' + tableName + '?' + query, {
    method: 'GET',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: 'Bearer ' + getAuthorizationToken(),
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Supabase read failed for ' + tableName + ': ' + response.status + ' ' + response.statusText);
  }

  return response.json() as Promise<T[]>;
}

export async function updateSupabaseRows<T>(tableName: string, query: string, payload: Record<string, unknown>): Promise<T[]> {
  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(baseUrl + '/rest/v1/' + tableName + '?' + query, {
    method: 'PATCH',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: 'Bearer ' + getAuthorizationToken(),
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Supabase update failed for ' + tableName + ': ' + response.status + ' ' + response.statusText);
  }

  return response.json() as Promise<T[]>;
}

export async function uploadSupabaseAsset(bucketName: string, path: string, file: File): Promise<string> {
  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(baseUrl + '/storage/v1/object/' + bucketName + '/' + path, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: 'Bearer ' + getAuthorizationToken(),
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true'
    },
    body: file
  });

  if (!response.ok) {
    throw new Error('Supabase upload failed for ' + path + ': ' + response.status + ' ' + response.statusText);
  }

  return baseUrl + '/storage/v1/object/public/' + bucketName + '/' + path;
}

export async function insertSupabaseRows<T>(tableName: string, payload: Record<string, unknown>): Promise<T[]> {
  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(baseUrl + '/rest/v1/' + tableName, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: 'Bearer ' + getAuthorizationToken(),
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('Supabase insert failed for ' + tableName + ': ' + response.status + ' ' + response.statusText);
  }

  return response.json() as Promise<T[]>;
}


export async function callSupabaseRpc<T>(functionName: string, payload: Record<string, unknown>): Promise<T> {
  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(baseUrl + '/rest/v1/rpc/' + functionName, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: 'Bearer ' + getAuthorizationToken(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let details = response.status + ' ' + response.statusText;
    try {
      const body = await response.json() as { message?: string; details?: string; hint?: string };
      details = body.message ?? body.details ?? body.hint ?? details;
    } catch {
      // Keep HTTP details when Supabase does not return a JSON body.
    }
    throw new Error('Supabase RPC failed for ' + functionName + ': ' + details);
  }

  return response.json() as Promise<T>;
}

export async function invokeSupabaseFunction<T>(functionName: string, payload: Record<string, unknown>): Promise<T> {
  const baseUrl = getSupabaseBaseUrl();
  const response = await fetch(baseUrl + '/functions/v1/' + functionName, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: 'Bearer ' + getAuthorizationToken(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let message = 'Supabase function failed for ' + functionName + ': ' + response.status + ' ' + response.statusText;
    try {
      const body = await response.json() as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      // Keep HTTP details when the function does not return a JSON body.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
