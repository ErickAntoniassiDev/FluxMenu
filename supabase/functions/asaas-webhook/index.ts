import { adminClient, corsHeaders, jsonResponse, requiredEnv, toSubscriptionStatus } from '../_shared/billing.ts';

type AsaasWebhook = {
  id?: string;
  event?: string;
  payment?: {
    id?: string;
    subscription?: string;
    customer?: string;
    status?: string;
    value?: number;
    netValue?: number;
    billingType?: string;
    dueDate?: string;
    paymentDate?: string;
    clientPaymentDate?: string;
    invoiceUrl?: string;
    bankSlipUrl?: string;
    externalReference?: string | null;
  };
  subscription?: {
    id?: string;
    status?: string;
    customer?: string;
    value?: number;
    nextDueDate?: string;
    externalReference?: string | null;
    deleted?: boolean;
  };
};

type SupabaseErrorLike = { message?: string; code?: string; details?: string; hint?: string };

class WebhookSupabaseError extends Error {
  context: string;
  code?: string;
  details?: string;
  hint?: string;

  constructor(context: string, error: SupabaseErrorLike) {
    super(error.message || 'Supabase webhook write failed.');
    this.name = 'WebhookSupabaseError';
    this.context = context;
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sanitizeForLog(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/^Bearer\s+.+$/i, 'Bearer [redacted]')
      .replace(/access_token[=:][^&\s]+/gi, 'access_token=[redacted]')
      .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf redacted]')
      .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[cnpj redacted]');
  }
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (/api.?key|secret|token|authorization|cpf|cnpj|document/i.test(key)) {
      if (typeof entry === 'boolean' || typeof entry === 'number' || entry === null) return [key, entry];
      return [key, '[redacted]'];
    }
    return [key, sanitizeForLog(entry)];
  }));
}

function throwSupabaseError(context: string, error: unknown): never {
  if (isRecord(error)) {
    throw new WebhookSupabaseError(context, {
      message: typeof error.message === 'string' ? error.message : undefined,
      code: typeof error.code === 'string' ? error.code : undefined,
      details: typeof error.details === 'string' ? error.details : undefined,
      hint: typeof error.hint === 'string' ? error.hint : undefined
    });
  }
  throw new WebhookSupabaseError(context, { message: 'Supabase webhook write failed.' });
}

function logWebhookError(error: unknown, payload: Partial<AsaasWebhook> | null): void {
  const base = {
    eventId: payload?.id ?? null,
    event: payload?.event ?? null,
    providerSubscriptionId: payload?.subscription?.id ?? payload?.payment?.subscription ?? null,
    providerPaymentId: payload?.payment?.id ?? null,
    restaurantId: restaurantIdFromReference(payload?.subscription?.externalReference ?? payload?.payment?.externalReference)
  };

  if (error instanceof WebhookSupabaseError) {
    console.error('[asaas-webhook] request failed', sanitizeForLog({
      ...base,
      category: 'supabase',
      context: error.context,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    }));
    return;
  }

  console.error('[asaas-webhook] request failed', sanitizeForLog({
    ...base,
    category: error instanceof Error && /autorizad|unauthor/i.test(error.message) ? 'validation' : 'unexpected',
    message: error instanceof Error ? error.message : 'unknown error',
    rawType: typeof error
  }));
}

function logWebhookInfo(message: string, details: Record<string, unknown>): void {
  console.info('[asaas-webhook] ' + message, sanitizeForLog(details));
}

function isAllowedIp(req: Request): boolean {
  const allowed = (Deno.env.get('ASAAS_WEBHOOK_ALLOWED_IPS') ?? '').split(',').map(ip => ip.trim()).filter(Boolean);
  if (allowed.length === 0) return true;
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  return Boolean((forwardedFor && allowed.includes(forwardedFor)) || (realIp && allowed.includes(realIp)));
}

function validateWebhook(req: Request): void {
  const expected = requiredEnv('ASAAS_WEBHOOK_TOKEN');
  const received = req.headers.get('asaas-access-token') ?? req.headers.get('asaas_access_token') ?? '';
  if (!received || received !== expected) throw new Error('Webhook não autorizado.');
  if (!isAllowedIp(req)) throw new Error('Origem de webhook não autorizada.');
}

function restaurantIdFromReference(reference?: string | null): string | null {
  if (!reference) return null;
  return reference.split(':')[0] || null;
}

async function findSubscription(payload: AsaasWebhook) {
  const providerSubscriptionId = payload.subscription?.id ?? payload.payment?.subscription;
  const externalReference = payload.subscription?.externalReference ?? payload.payment?.externalReference;
  const restaurantId = restaurantIdFromReference(externalReference);
  const supabase = adminClient();

  let query = supabase.from('subscriptions').select('id,restaurant_id,plan_id,provider_subscription_id,provider_customer_id').limit(1);
  if (providerSubscriptionId) query = query.eq('provider_subscription_id', providerSubscriptionId);
  else if (restaurantId) query = query.eq('restaurant_id', restaurantId);
  else return null;

  const { data, error } = await query.maybeSingle();
  if (error) throwSupabaseError('find subscription', error);
  return data as { id: string; restaurant_id: string; plan_id: string; provider_subscription_id?: string | null; provider_customer_id?: string | null } | null;
}

async function processSubscriptionEvent(payload: AsaasWebhook, localSubscription: Awaited<ReturnType<typeof findSubscription>>) {
  if (!payload.subscription || !localSubscription) return;
  const status = payload.event === 'SUBSCRIPTION_DELETED' || payload.event === 'SUBSCRIPTION_INACTIVATED' || payload.subscription.deleted
    ? 'canceled'
    : toSubscriptionStatus(payload.subscription.status);

  const updateResult = await adminClient()
    .from('subscriptions')
    .update({
      status,
      billing_status: status,
      provider_subscription_id: payload.subscription.id ?? localSubscription.provider_subscription_id,
      provider_customer_id: payload.subscription.customer ?? localSubscription.provider_customer_id,
      current_period_end: payload.subscription.nextDueDate ?? null,
      canceled_at: status === 'canceled' ? new Date().toISOString() : null
    })
    .eq('id', localSubscription.id);
  if (updateResult.error) throwSupabaseError('update subscription from subscription event', updateResult.error);
}

async function processPaymentEvent(payload: AsaasWebhook, localSubscription: Awaited<ReturnType<typeof findSubscription>>) {
  if (!payload.payment || !localSubscription?.restaurant_id || !payload.payment.id) return;
  const event = payload.event ?? '';
  const paymentStatus = payload.payment.status ?? event.replace(/^PAYMENT_/, '').toLowerCase();
  const subscriptionStatus = event === 'PAYMENT_OVERDUE' ? 'past_due'
    : event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED' ? 'active'
    : null;

  const paymentUpsert = await adminClient()
    .from('billing_payments')
    .upsert({
      restaurant_id: localSubscription.restaurant_id,
      subscription_id: localSubscription.id,
      provider: 'asaas',
      provider_payment_id: payload.payment.id,
      provider_subscription_id: payload.payment.subscription ?? localSubscription.provider_subscription_id,
      event_id: payload.id ?? null,
      status: paymentStatus,
      billing_type: payload.payment.billingType ?? null,
      value: payload.payment.value ?? 0,
      net_value: payload.payment.netValue ?? null,
      due_date: payload.payment.dueDate ?? null,
      paid_at: payload.payment.paymentDate ?? payload.payment.clientPaymentDate ?? null,
      invoice_url: payload.payment.invoiceUrl ?? payload.payment.bankSlipUrl ?? null,
      raw_event: payload
    }, { onConflict: 'provider,provider_payment_id' });
  if (paymentUpsert.error) throwSupabaseError('upsert billing payment from payment event', paymentUpsert.error);

  const subscriptionUpdate = subscriptionStatus
    ? await adminClient()
      .from('subscriptions')
      .update({ status: subscriptionStatus, billing_status: subscriptionStatus, last_payment_status: paymentStatus })
      .eq('id', localSubscription.id)
    : await adminClient().from('subscriptions').update({ last_payment_status: paymentStatus }).eq('id', localSubscription.id);
  if (subscriptionUpdate.error) throwSupabaseError('update subscription from payment event', subscriptionUpdate.error);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  let payload: Partial<AsaasWebhook> | null = null;

  try {
    validateWebhook(req);
    payload = await req.json() as AsaasWebhook;
    if (!payload.id || !payload.event) throw new Error('Evento inválido.');

    logWebhookInfo('payload received', {
      eventId: payload.id,
      event: payload.event,
      providerSubscriptionId: payload.subscription?.id ?? payload.payment?.subscription ?? null,
      providerPaymentId: payload.payment?.id ?? null,
      restaurantId: restaurantIdFromReference(payload.subscription?.externalReference ?? payload.payment?.externalReference)
    });

    const duplicateCheck = await adminClient()
      .from('billing_events')
      .select('id')
      .eq('provider', 'asaas')
      .eq('provider_event_id', payload.id)
      .maybeSingle();
    if (duplicateCheck.error) throwSupabaseError('check duplicate billing event', duplicateCheck.error);
    if (duplicateCheck.data) return jsonResponse({ received: true, duplicate: true });

    const localSubscription = await findSubscription(payload as AsaasWebhook);
    const restaurantId = localSubscription?.restaurant_id ?? restaurantIdFromReference(payload.subscription?.externalReference ?? payload.payment?.externalReference);

    if (!localSubscription) {
      logWebhookInfo('event without local subscription', {
        eventId: payload.id,
        event: payload.event,
        providerSubscriptionId: payload.subscription?.id ?? payload.payment?.subscription ?? null,
        providerPaymentId: payload.payment?.id ?? null,
        restaurantId
      });
    }

    if (payload.event.startsWith('SUBSCRIPTION_')) await processSubscriptionEvent(payload as AsaasWebhook, localSubscription);
    if (payload.event.startsWith('PAYMENT_')) await processPaymentEvent(payload as AsaasWebhook, localSubscription);

    const eventInsert = await adminClient().from('billing_events').insert({
      provider: 'asaas',
      provider_event_id: payload.id,
      event_type: payload.event,
      provider_subscription_id: payload.subscription?.id ?? payload.payment?.subscription ?? null,
      provider_payment_id: payload.payment?.id ?? null,
      restaurant_id: restaurantId,
      raw_event: payload
    });

    if (eventInsert.error?.code === '23505') return jsonResponse({ received: true, duplicate: true });
    if (eventInsert.error) throwSupabaseError('insert billing event', eventInsert.error);

    return jsonResponse({ received: true });
  } catch (error) {
    logWebhookError(error, payload);
    return jsonResponse({ error: 'Webhook rejected' }, 401);
  }
});
