import { adminClient, asaasFetch, AsaasRequestError, BillingAction, corsHeaders, jsonResponse, requiredEnv, sanitizePlanId, todayPlusDays } from '../_shared/billing.ts';

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

type BillingCustomerData = {
  restaurant_id: string;
  provider_customer_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  cpf_cnpj?: string | null;
};

function normalizeCpfCnpj(value?: string | null): string {
  return String(value ?? '').replace(/\D/g, '');
}

function isValidCpfCnpj(value?: string | null): boolean {
  const digits = normalizeCpfCnpj(value);
  return digits.length === 11 || digits.length === 14;
}

function maskCpfCnpj(value?: string | null): string | null {
  const digits = normalizeCpfCnpj(value);
  if (digits.length === 11) return digits.slice(0, 3) + '.***.***-' + digits.slice(-2);
  if (digits.length === 14) return digits.slice(0, 2) + '.***.***/****-' + digits.slice(-2);
  return null;
}

async function getBillingCustomerData(restaurantId: string): Promise<BillingCustomerData | null> {
  const { data, error } = await adminClient()
    .from('billing_customer_data')
    .select('restaurant_id,provider_customer_id,name,email,phone,cpf_cnpj')
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  if (error) throw error;
  return data as BillingCustomerData | null;
}

async function upsertBillingCustomerData(restaurantId: string, payload: Partial<BillingCustomerData>): Promise<BillingCustomerData> {
  const { data, error } = await adminClient()
    .from('billing_customer_data')
    .upsert({ restaurant_id: restaurantId, provider: 'asaas', ...payload, updated_at: new Date().toISOString() }, { onConflict: 'restaurant_id' })
    .select('restaurant_id,provider_customer_id,name,email,phone,cpf_cnpj')
    .single();
  if (error || !data) throw error ?? new Error('Não foi possível salvar dados fiscais.');
  return data as BillingCustomerData;
}

function mergeCustomerInput(input: BillingRequest, saved: BillingCustomerData | null, restaurant: RestaurantRow): BillingCustomerData {
  const cpfCnpj = normalizeCpfCnpj(input.customer?.cpfCnpj) || normalizeCpfCnpj(saved?.cpf_cnpj);
  return {
    restaurant_id: restaurant.id,
    provider_customer_id: saved?.provider_customer_id ?? undefined,
    name: input.customer?.name || saved?.name || restaurant.name,
    email: input.customer?.email || saved?.email || 'billing+' + restaurant.id + '@fluxmenu.local',
    phone: input.customer?.phone || saved?.phone || null,
    cpf_cnpj: cpfCnpj || null
  };
}

function assertFiscalData(customer: BillingCustomerData): void {
  if (!isValidCpfCnpj(customer.cpf_cnpj)) {
    throw new Error('Informe um CPF ou CNPJ válido para criar a assinatura no Asaas.');
  }
}

async function getUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Sessão obrigatória.');
  const supabase = adminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Sessão inválida.');
  return data.user.id;
}

async function assertBillingManager(restaurantId: string, userId: string): Promise<void> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from('restaurant_members')
    .select('role,active')
    .eq('restaurant_id', restaurantId)
    .eq('profile_id', userId)
    .eq('active', true)
    .single();
  if (error || !['owner', 'manager'].includes(String(data?.role))) throw new Error('Apenas owner ou manager pode alterar assinatura.');
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

async function createCustomer(customer: BillingCustomerData, restaurant: RestaurantRow): Promise<AsaasCustomer> {
  assertFiscalData(customer);
  return asaasFetch<AsaasCustomer>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: customer.name || restaurant.name,
      email: customer.email || 'billing+' + restaurant.id + '@fluxmenu.local',
      cpfCnpj: normalizeCpfCnpj(customer.cpf_cnpj),
      phone: customer.phone || undefined,
      externalReference: restaurant.id
    })
  });
}

async function updateCustomer(customerId: string, customer: BillingCustomerData, restaurant: RestaurantRow): Promise<void> {
  assertFiscalData(customer);
  await asaasFetch('/customers/' + customerId, {
    method: 'PUT',
    body: JSON.stringify({
      name: customer.name || restaurant.name,
      email: customer.email || 'billing+' + restaurant.id + '@fluxmenu.local',
      cpfCnpj: normalizeCpfCnpj(customer.cpf_cnpj),
      phone: customer.phone || undefined,
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
  const [plan, restaurant, existing, savedCustomer] = await Promise.all([getPlan(planId), getRestaurant(input.restaurantId), getSubscription(input.restaurantId), getBillingCustomerData(input.restaurantId)]);
  const trialDays = Number(Deno.env.get('ASAAS_TRIAL_DAYS') ?? '14');
  const customerData = mergeCustomerInput(input, savedCustomer, restaurant);
  assertFiscalData(customerData);
  let customerId = existing?.provider_customer_id ?? savedCustomer?.provider_customer_id ?? null;
  if (customerId) await updateCustomer(customerId, customerData, restaurant);
  else customerId = (await createCustomer(customerData, restaurant)).id;
  await upsertBillingCustomerData(input.restaurantId, { ...customerData, provider_customer_id: customerId });
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
    try {
      await asaasFetch('/subscriptions/' + existing.provider_subscription_id, { method: 'DELETE' });
    } catch (error) {
      if (!(error instanceof AsaasRequestError) || error.status !== 404) throw error;
    }
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
  const [subscription, payments, customer] = await Promise.all([
    getSubscription(input.restaurantId),
    adminClient().from('billing_payments').select('id,status,value,due_date,paid_at,invoice_url,provider_payment_id,created_at').eq('restaurant_id', input.restaurantId).order('created_at', { ascending: false }).limit(20),
    getBillingCustomerData(input.restaurantId)
  ]);
  return { subscription, payments: payments.data ?? [], customer: { hasCpfCnpj: isValidCpfCnpj(customer?.cpf_cnpj), cpfCnpjMasked: maskCpfCnpj(customer?.cpf_cnpj) } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    requiredEnv('ASAAS_API_KEY');
    const input = await req.json() as BillingRequest;
    if (!input.restaurantId) throw new Error('restaurantId obrigatório.');
    const userId = await getUserId(req);
    await assertBillingManager(input.restaurantId, userId);

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
