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
  if (error) throw error;
  return data as { id: string; restaurant_id: string; plan_id: string; provider_subscription_id?: string | null; provider_customer_id?: string | null } | null;
}

async function processSubscriptionEvent(payload: AsaasWebhook, localSubscription: Awaited<ReturnType<typeof findSubscription>>) {
  if (!payload.subscription || !localSubscription) return;
  const status = payload.event === 'SUBSCRIPTION_DELETED' || payload.event === 'SUBSCRIPTION_INACTIVATED' || payload.subscription.deleted
    ? 'canceled'
    : toSubscriptionStatus(payload.subscription.status);

  await adminClient()
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
}

async function processPaymentEvent(payload: AsaasWebhook, localSubscription: Awaited<ReturnType<typeof findSubscription>>) {
  if (!payload.payment || !localSubscription?.restaurant_id || !payload.payment.id) return;
  const event = payload.event ?? '';
  const paymentStatus = payload.payment.status ?? event.replace(/^PAYMENT_/, '').toLowerCase();
  const subscriptionStatus = event === 'PAYMENT_OVERDUE' ? 'past_due'
    : event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED' ? 'active'
    : null;

  await adminClient()
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

  if (subscriptionStatus) {
    await adminClient()
      .from('subscriptions')
      .update({ status: subscriptionStatus, billing_status: subscriptionStatus, last_payment_status: paymentStatus })
      .eq('id', localSubscription.id);
  } else {
    await adminClient().from('subscriptions').update({ last_payment_status: paymentStatus }).eq('id', localSubscription.id);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    validateWebhook(req);
    const payload = await req.json() as AsaasWebhook;
    if (!payload.id || !payload.event) throw new Error('Evento inválido.');

    const localSubscription = await findSubscription(payload);
    const restaurantId = localSubscription?.restaurant_id ?? restaurantIdFromReference(payload.subscription?.externalReference ?? payload.payment?.externalReference);

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
    if (eventInsert.error) throw eventInsert.error;

    if (payload.event.startsWith('SUBSCRIPTION_')) await processSubscriptionEvent(payload, localSubscription);
    if (payload.event.startsWith('PAYMENT_')) await processPaymentEvent(payload, localSubscription);

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('[asaas-webhook]', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse({ error: 'Webhook rejected' }, 401);
  }
});
