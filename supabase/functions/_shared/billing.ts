import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.2';

export type PlanId = 'starter' | 'pro' | 'premium';
export type BillingAction = 'create' | 'change_plan' | 'cancel' | 'status';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(name + ' is not configured');
  return value;
}

export function adminClient() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function asaasBaseUrl(): string {
  return Deno.env.get('ASAAS_BASE_URL') ?? 'https://api-sandbox.asaas.com/v3';
}

export class AsaasRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AsaasRequestError';
    this.status = status;
  }
}

export async function asaasFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(asaasBaseUrl().replace(/\/$/, '') + path, {
    ...init,
    headers: {
      access_token: requiredEnv('ASAAS_API_KEY'),
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    let message = 'Asaas request failed: ' + response.status;
    try {
      const payload = await response.json() as { errors?: Array<{ description?: string }>; message?: string };
      message = payload.errors?.map(error => error.description).filter(Boolean).join('; ') || payload.message || message;
    } catch {
      // Avoid logging response body with sensitive data.
    }
    throw new AsaasRequestError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function sanitizePlanId(planId: unknown): PlanId {
  if (planId === 'starter' || planId === 'pro' || planId === 'premium') return planId;
  throw new Error('Plano inválido.');
}

export function todayPlusDays(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function toSubscriptionStatus(providerStatus?: string | null): 'trialing' | 'active' | 'past_due' | 'canceled' {
  const status = String(providerStatus ?? '').toUpperCase();
  if (status === 'ACTIVE') return 'active';
  if (status === 'OVERDUE' || status === 'PENDING') return 'past_due';
  if (status === 'INACTIVE' || status === 'CANCELED' || status === 'DELETED') return 'canceled';
  return 'active';
}
