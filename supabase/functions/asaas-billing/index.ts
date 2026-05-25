import { adminClient, asaasFetch, BillingAction, corsHeaders, jsonResponse, requiredEnv, sanitizePlanId, todayPlusDays } from '../_shared/billing.ts';

type BillingRequest = {
  action: BillingAction;
  restaurantId: string;
  planId?: string;
  customer?: {
    name?: string;
    email?: string;
    cpfCnpj?: string;
    phone?: string;
  };
};

type PlanRow = { id: string; name: string; price_cents: number };
type RestaurantRow = { id: string; name: string; owner_profile_id: string | null };
type SubscriptionRow = {
  id: string;
  restaurant_id: string;
  plan_id: string;
  status: string;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
  checkout_url?: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
};

type AsaasCustomer = { id: string };
type AsaasSubscription = { id: string; status?: string; invoiceUrl?: string; bankSlipUrl?: string; nextDueDate?: string };

async function getUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Sessão obrigatória.');
  const supabase = adminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Sessão inválida.');
  return data.user.id;
}

async function assertBillingOwner(restaurantId: string, userId: string): Promise<void> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from('restaurant_members')
    .select('role,active')
    .eq('restaurant_id', restaurantId)
    .eq('profile_id', userId)
    .eq('active', true)
    .single();
  if (error || data?.role !== 'owner') throw new Error('Apenas owner pode alterar assinatura.');
}

async function getPlan(planId: string): Promise<PlanRow> {
  const { data, error } = await adminClient().from('plans').select('id,name,price_cents').eq('id', planId).eq('active', true).single();
  if (error || !data) throw new Error('Plano indisponível.');
  return data as PlanRow;
}

async function getRestaurant(restaurantId: string): Promise<RestaurantRow> {
  const { data, error } = await adminClient().from('restaurants').select('id,name,owner_profile_id').eq('id', restaurantId).eq('status', 'active').single();
  if (error || !data) throw new Error('Restaurante indisponível.');
  return data as RestaurantRow;
}

async function getSubscription(restaurantId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await adminClient()
    .from('subscriptions')
    .select('id,restaurant_id,plan_id,status,provider_customer_id,provider_subscription_id,checkout_url,trial_ends_at,current_period_end')
    .eq('restaurant_id', restaurantId)
    .in('status', ['trialing', 'active', 'past_due'])
    .maybeSingle();
  if (error) throw error;
  return data as SubscriptionRow | null;
}

async function createCustomer(input: BillingRequest, restaurant: RestaurantRow): Promise<AsaasCustomer> {
  const fallbackEmail = input.customer?.email ?? 'billing+' + restaurant.id + '@fluxmenu.local';
  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.customer?.name || restaurant.name,
      email: fallbackEmail,
      cpfCnpj: input.customer?.cpfCnpj || undefined,
      phone: input.customer?.phone || undefined,
      externalReference: restaurant.id
    })
  });
}

async function upsertLocalSubscription(restaurantId: string, plan: PlanRow, customerId: string, providerSub: AsaasSubscription, status: string, trialDays: number): Promise<SubscriptionRow> {
  const supabase = adminClient();
  const trialEndsAt = trialDays > 0 ? new Date(Date.now() + trialDays * 86400000).toISOString() : null;
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({
      restaurant_id: restaurantId,
      plan_id: plan.id,
      status,
      billing_status: status,
      provider: 'asaas',
      provider_customer_id: customerId,
      provider_subscription_id: providerSub.id,
      checkout_url: providerSub.invoiceUrl ?? providerSub.bankSlipUrl ?? null,
      current_period_start: new Date().toISOString(),
      current_period_end: providerSub.nextDueDate ? providerSub.nextDueDate : null,
      trial_ends_at: trialEndsAt,
      external_reference: restaurantId + ':' + plan.id,
      cancel_at_period_end: false,
      canceled_at: null
    }, { onConflict: 'restaurant_id' })
    .select('id,restaurant_id,plan_id,status,provider_customer_id,provider_subscription_id,checkout_url,trial_ends_at,current_period_end')
    .single();
  if (error || !data) throw error ?? new Error('Não foi possível salvar assinatura.');
  return data as SubscriptionRow;
}

async function handleCreate(input: BillingRequest): Promise<unknown> {
  const planId = sanitizePlanId(input.planId ?? 'starter');
  const [plan, restaurant, existing] = await Promise.all([getPlan(planId), getRestaurant(input.restaurantId), getSubscription(input.restaurantId)]);
  const trialDays = Number(Deno.env.get('ASAAS_TRIAL_DAYS') ?? '14');
  const customerId = existing?.provider_customer_id ?? (await createCustomer(input, restaurant)).id;
  const providerSub = await asaasFetch<AsaasSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: Deno.env.get('ASAAS_BILLING_TYPE') ?? 'UNDEFINED',
      value: plan.price_cents / 100,
      nextDueDate: todayPlusDays(trialDays),
      cycle: 'MONTHLY',
      description: 'FluxMenu ' + plan.name,
      externalReference: input.restaurantId + ':' + plan.id
    })
  });
  const local = await upsertLocalSubscription(input.restaurantId, plan, customerId, providerSub, trialDays > 0 ? 'trialing' : 'active', trialDays);
  return { subscription: local };
}

async function handleChangePlan(input: BillingRequest): Promise<unknown> {
  const planId = sanitizePlanId(input.planId);
  const [plan, existing] = await Promise.all([getPlan(planId), getSubscription(input.restaurantId)]);
  if (!existing?.provider_subscription_id || !existing.provider_customer_id) return handleCreate(input);
  const providerSub = await asaasFetch<AsaasSubscription>('/subscriptions/' + existing.provider_subscription_id, {
    method: 'PUT',
    body: JSON.stringify({
      value: plan.price_cents / 100,
      cycle: 'MONTHLY',
      description: 'FluxMenu ' + plan.name,
      externalReference: input.restaurantId + ':' + plan.id
    })
  });
  const local = await upsertLocalSubscription(input.restaurantId, plan, existing.provider_customer_id, { ...providerSub, id: existing.provider_subscription_id }, 'active', 0);
  return { subscription: local };
}

async function handleCancel(input: BillingRequest): Promise<unknown> {
  const existing = await getSubscription(input.restaurantId);
  if (existing?.provider_subscription_id) {
    await asaasFetch('/subscriptions/' + existing.provider_subscription_id, { method: 'DELETE' });
  }
  const { data, error } = await adminClient()
    .from('subscriptions')
    .update({ status: 'canceled', billing_status: 'canceled', canceled_at: new Date().toISOString(), cancel_at_period_end: false })
    .eq('restaurant_id', input.restaurantId)
    .select('id,restaurant_id,plan_id,status,provider_customer_id,provider_subscription_id,checkout_url,trial_ends_at,current_period_end')
    .maybeSingle();
  if (error) throw error;
  return { subscription: data };
}

async function handleStatus(input: BillingRequest): Promise<unknown> {
  const [subscription, payments] = await Promise.all([
    getSubscription(input.restaurantId),
    adminClient().from('billing_payments').select('id,status,value,due_date,paid_at,invoice_url,provider_payment_id,created_at').eq('restaurant_id', input.restaurantId).order('created_at', { ascending: false }).limit(20)
  ]);
  return { subscription, payments: payments.data ?? [] };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    requiredEnv('ASAAS_API_KEY');
    const input = await req.json() as BillingRequest;
    if (!input.restaurantId) throw new Error('restaurantId obrigatório.');
    const userId = await getUserId(req);
    await assertBillingOwner(input.restaurantId, userId);

    if (input.action === 'create') return jsonResponse(await handleCreate(input));
    if (input.action === 'change_plan') return jsonResponse(await handleChangePlan(input));
    if (input.action === 'cancel') return jsonResponse(await handleCancel(input));
    if (input.action === 'status') return jsonResponse(await handleStatus(input));
    return jsonResponse({ error: 'Ação inválida.' }, 400);
  } catch (error) {
    console.error('[asaas-billing]', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse({ error: error instanceof Error ? error.message : 'Falha na assinatura.' }, 400);
  }
});
