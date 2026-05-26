import { adminClient, asaasBaseUrl, asaasFetch, AsaasRequestError, BillingAction, corsHeaders, jsonResponse, requiredEnv, sanitizePlanId, todayPlusDays, toSubscriptionStatus } from '../_shared/billing.ts';

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

type AsaasCustomer = { id: string; externalReference?: string | null; cpfCnpj?: string | null };
type AsaasSubscription = { id: string; status?: string; invoiceUrl?: string; bankSlipUrl?: string; nextDueDate?: string };

type BillingCustomerData = {
  restaurant_id: string;
  provider_customer_id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  cpf_cnpj?: string | null;
};

type ErrorCategory = 'validation' | 'asaas' | 'supabase' | 'unexpected';
type SupabaseErrorLike = { message?: string; code?: string; details?: string; hint?: string };

class BillingValidationError extends Error {
  status: number;
  category: ErrorCategory = 'validation';

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'BillingValidationError';
    this.status = status;
  }
}

class BillingSupabaseError extends Error {
  context: string;
  code?: string;
  details?: string;
  hint?: string;
  category: ErrorCategory = 'supabase';

  constructor(context: string, fallbackMessage: string, error: SupabaseErrorLike) {
    super(error.message || fallbackMessage);
    this.name = 'BillingSupabaseError';
    this.context = context;
    this.code = error.code;
    this.details = error.details;
    this.hint = error.hint;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function maskSensitiveString(value: string): string {
  if (/^Bearer\s+/i.test(value)) return 'Bearer [redacted]';
  const withoutTokens = value.replace(/access_token[=:][^&\s]+/gi, 'access_token=[redacted]');
  const digits = normalizeCpfCnpj(withoutTokens);
  if (digits.length === 11) return maskCpfCnpj(digits) ?? '[cpf redacted]';
  if (digits.length === 14) return maskCpfCnpj(digits) ?? '[cnpj redacted]';
  return withoutTokens
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, match => maskCpfCnpj(match) ?? '[cpf redacted]')
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, match => maskCpfCnpj(match) ?? '[cnpj redacted]');
}

function sanitizeForLog(value: unknown): unknown {
  if (typeof value === 'string') return maskSensitiveString(value);
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  if (!isRecord(value)) return value;

  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (/api.?key|secret|token|authorization|cpf|cnpj|document/i.test(key)) {
      if (typeof entry === 'string') return [key, maskSensitiveString(entry)];
      if (typeof entry === 'boolean' || typeof entry === 'number' || entry === null) return [key, entry];
      return [key, '[redacted]'];
    }
    return [key, sanitizeForLog(entry)];
  }));
}

function toSupabaseError(context: string, error: unknown, fallbackMessage: string): BillingSupabaseError {
  if (isRecord(error)) {
    return new BillingSupabaseError(context, fallbackMessage, {
      message: typeof error.message === 'string' ? error.message : undefined,
      code: typeof error.code === 'string' ? error.code : undefined,
      details: typeof error.details === 'string' ? error.details : undefined,
      hint: typeof error.hint === 'string' ? error.hint : undefined
    });
  }
  return new BillingSupabaseError(context, fallbackMessage, { message: fallbackMessage });
}

function throwSupabaseError(context: string, error: unknown, fallbackMessage: string): never {
  throw toSupabaseError(context, error, fallbackMessage);
}

function readPlanId(planId: unknown, fallback?: string): string {
  try {
    return sanitizePlanId(planId ?? fallback);
  } catch {
    throw new BillingValidationError('Plano inválido.');
  }
}

function logBillingInfo(message: string, details: Record<string, unknown>): void {
  console.info('[asaas-billing] ' + message, sanitizeForLog(details));
}

function errorCategory(error: unknown): ErrorCategory {
  if (error instanceof BillingValidationError) return 'validation';
  if (error instanceof AsaasRequestError) return 'asaas';
  if (error instanceof BillingSupabaseError) return 'supabase';
  return 'unexpected';
}

function errorStatus(error: unknown): number {
  if (error instanceof BillingValidationError) return error.status;
  if (error instanceof AsaasRequestError) return error.status >= 400 && error.status < 500 ? 400 : 502;
  if (error instanceof BillingSupabaseError) return 500;
  return 500;
}

function clientErrorMessage(error: unknown): string {
  if (error instanceof BillingValidationError) return error.message;
  if (error instanceof AsaasRequestError) return error.message || 'Não foi possível concluir a cobrança no Asaas.';
  if (error instanceof BillingSupabaseError) return 'Não foi possível salvar os dados de cobrança. Tente novamente.';
  return 'Falha inesperada na assinatura. Tente novamente.';
}

function logBillingError(error: unknown, input: Partial<BillingRequest> | null): void {
  const base = {
    category: errorCategory(error),
    action: input?.action ?? null,
    restaurantId: input?.restaurantId ?? null,
    hasRestaurantId: Boolean(input?.restaurantId),
    planId: input?.planId ?? null,
    hasPlanId: Boolean(input?.planId),
    hasCustomer: Boolean(input?.customer),
    customerHasCpfCnpj: isValidCpfCnpj(input?.customer?.cpfCnpj),
    customerCpfCnpjMasked: maskCpfCnpj(input?.customer?.cpfCnpj)
  };

  if (error instanceof AsaasRequestError) {
    console.error('[asaas-billing] request failed', sanitizeForLog({
      ...base,
      status: error.status,
      endpoint: error.endpoint,
      message: error.message,
      responseBody: error.responseBody
    }));
    return;
  }

  if (error instanceof BillingSupabaseError) {
    console.error('[asaas-billing] request failed', sanitizeForLog({
      ...base,
      context: error.context,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    }));
    return;
  }

  console.error('[asaas-billing] request failed', sanitizeForLog({
    ...base,
    message: error instanceof Error ? error.message : 'unknown error',
    rawType: typeof error
  }));
}

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
  if (error) throwSupabaseError('load billing_customer_data', error, 'Não foi possível carregar dados fiscais.');
  return data as BillingCustomerData | null;
}

async function upsertBillingCustomerData(restaurantId: string, payload: Partial<BillingCustomerData>): Promise<BillingCustomerData> {
  const { data, error } = await adminClient()
    .from('billing_customer_data')
    .upsert({ restaurant_id: restaurantId, provider: 'asaas', ...payload, updated_at: new Date().toISOString() }, { onConflict: 'restaurant_id' })
    .select('restaurant_id,provider_customer_id,name,email,phone,cpf_cnpj')
    .single();
  if (error) throwSupabaseError('upsert billing_customer_data', error, 'Não foi possível salvar dados fiscais.');
  if (!data) throw new BillingValidationError('Não foi possível salvar dados fiscais.');
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
    throw new BillingValidationError('Informe um CPF ou CNPJ válido para criar a assinatura no Asaas.');
  }
}

async function getUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) throw new BillingValidationError('Sessão obrigatória.', 401);
  const supabase = adminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error) throwSupabaseError('validate auth session', error, 'Não foi possível validar sessão.');
  if (!data.user) throw new BillingValidationError('Sessão inválida.', 401);
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
    .maybeSingle();
  if (error) throwSupabaseError('validate restaurant_members role', error, 'Não foi possível validar permissões.');
  if (!['owner', 'manager'].includes(String(data?.role))) throw new BillingValidationError('Apenas owner ou manager pode alterar assinatura.', 403);
}

async function getPlan(planId: string): Promise<PlanRow> {
  const { data, error } = await adminClient().from('plans').select('id,name,price_cents').eq('id', planId).eq('active', true).single();
  if (error) throwSupabaseError('load plan', error, 'Não foi possível carregar plano.');
  if (!data) throw new BillingValidationError('Plano indisponível.');
  return data as PlanRow;
}

async function getRestaurant(restaurantId: string): Promise<RestaurantRow> {
  const { data, error } = await adminClient().from('restaurants').select('id,name,owner_profile_id').eq('id', restaurantId).eq('status', 'active').single();
  if (error) throwSupabaseError('load restaurant', error, 'Não foi possível carregar restaurante.');
  if (!data) throw new BillingValidationError('Restaurante indisponível.');
  return data as RestaurantRow;
}

async function getSubscription(restaurantId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await adminClient()
    .from('subscriptions')
    .select('id,restaurant_id,plan_id,status,provider_customer_id,provider_subscription_id,checkout_url,trial_ends_at,current_period_end')
    .eq('restaurant_id', restaurantId)
    .in('status', ['trialing', 'active', 'past_due'])
    .maybeSingle();
  if (error) throwSupabaseError('load current subscription', error, 'Não foi possível carregar assinatura.');
  return data as SubscriptionRow | null;
}

async function findCustomerByExternalReference(restaurantId: string): Promise<AsaasCustomer | null> {
  const result = await asaasFetch<{ data?: AsaasCustomer[] }>('/customers?externalReference=' + encodeURIComponent(restaurantId) + '&limit=1');
  return result.data?.[0] ?? null;
}

async function ensureCustomer(customer: BillingCustomerData, restaurant: RestaurantRow, currentCustomerId?: string | null): Promise<string> {
  assertFiscalData(customer);
  if (currentCustomerId) {
    await updateCustomer(currentCustomerId, customer, restaurant);
    return currentCustomerId;
  }

  const existing = await findCustomerByExternalReference(restaurant.id);
  if (existing?.id) {
    await updateCustomer(existing.id, customer, restaurant);
    return existing.id;
  }

  return (await createCustomer(customer, restaurant)).id;
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
  const payload = {
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
  };

  const existing = await getSubscription(restaurantId);
  const query = existing?.id
    ? supabase.from('subscriptions').update(payload).eq('id', existing.id)
    : supabase.from('subscriptions').insert(payload);

  const { data, error } = await query
    .select('id,restaurant_id,plan_id,status,provider_customer_id,provider_subscription_id,checkout_url,trial_ends_at,current_period_end')
    .single();
  if (error) throwSupabaseError('upsert subscription', error, 'Não foi possível salvar assinatura.');
  if (!data) throw new BillingValidationError('Não foi possível salvar assinatura.');
  return data as SubscriptionRow;
}

async function handleCreate(input: BillingRequest): Promise<unknown> {
  const planId = readPlanId(input.planId, 'starter');
  const [plan, restaurant, existing, savedCustomer] = await Promise.all([getPlan(planId), getRestaurant(input.restaurantId), getSubscription(input.restaurantId), getBillingCustomerData(input.restaurantId)]);
  const trialDays = Number(Deno.env.get('ASAAS_TRIAL_DAYS') ?? '14');
  const customerData = mergeCustomerInput(input, savedCustomer, restaurant);
  logBillingInfo('create diagnostics', {
    action: input.action,
    restaurantId: input.restaurantId,
    planId,
    asaasBaseUrl: asaasBaseUrl(),
    hasBillingCustomerData: Boolean(savedCustomer),
    hasProviderCustomerId: Boolean(savedCustomer?.provider_customer_id || existing?.provider_customer_id),
    hasProviderSubscriptionId: Boolean(existing?.provider_subscription_id),
    willSendCpfCnpj: isValidCpfCnpj(customerData.cpf_cnpj),
    cpfCnpjMasked: maskCpfCnpj(customerData.cpf_cnpj)
  });

  if (existing?.provider_subscription_id) {
    if (existing.plan_id === plan.id) return { subscription: existing };
    return handleChangePlan({ ...input, action: 'change_plan', planId });
  }

  const customerId = await ensureCustomer(customerData, restaurant, existing?.provider_customer_id ?? savedCustomer?.provider_customer_id ?? null);
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
  const providerStatus = trialDays > 0 ? 'trialing' : toSubscriptionStatus(providerSub.status);
  const local = await upsertLocalSubscription(input.restaurantId, plan, customerId, providerSub, providerStatus, trialDays);
  logBillingInfo('create completed', {
    action: input.action,
    restaurantId: input.restaurantId,
    planId,
    hasProviderCustomerId: Boolean(customerId),
    hasProviderSubscriptionId: Boolean(providerSub.id)
  });
  return { subscription: local };
}

async function handleChangePlan(input: BillingRequest): Promise<unknown> {
  const planId = readPlanId(input.planId);
  const [plan, existing] = await Promise.all([getPlan(planId), getSubscription(input.restaurantId)]);
  logBillingInfo('change_plan diagnostics', {
    action: input.action,
    restaurantId: input.restaurantId,
    planId,
    asaasBaseUrl: asaasBaseUrl(),
    hasExistingSubscription: Boolean(existing),
    hasProviderCustomerId: Boolean(existing?.provider_customer_id),
    hasProviderSubscriptionId: Boolean(existing?.provider_subscription_id),
    willCreateInstead: !existing?.provider_subscription_id || !existing.provider_customer_id
  });
  if (existing?.provider_subscription_id && existing.plan_id === plan.id) return { subscription: existing };
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
  const local = await upsertLocalSubscription(input.restaurantId, plan, existing.provider_customer_id, { ...providerSub, id: existing.provider_subscription_id }, toSubscriptionStatus(providerSub.status), 0);
  return { subscription: local };
}

async function handleCancel(input: BillingRequest): Promise<unknown> {
  const existing = await getSubscription(input.restaurantId);
  logBillingInfo('cancel diagnostics', {
    action: input.action,
    restaurantId: input.restaurantId,
    asaasBaseUrl: asaasBaseUrl(),
    hasExistingSubscription: Boolean(existing),
    hasProviderCustomerId: Boolean(existing?.provider_customer_id),
    hasProviderSubscriptionId: Boolean(existing?.provider_subscription_id)
  });
  if (existing?.provider_subscription_id) {
    try {
      await asaasFetch('/subscriptions/' + existing.provider_subscription_id, { method: 'DELETE' });
    } catch (error) {
      if (!(error instanceof AsaasRequestError) || error.status !== 404) throw error;
    }
  }
  if (!existing?.id) return { subscription: null };
  const { data, error } = await adminClient()
    .from('subscriptions')
    .update({ status: 'canceled', billing_status: 'canceled', canceled_at: new Date().toISOString(), cancel_at_period_end: false })
    .eq('id', existing.id)
    .eq('restaurant_id', input.restaurantId)
    .select('id,restaurant_id,plan_id,status,provider_customer_id,provider_subscription_id,checkout_url,trial_ends_at,current_period_end')
    .maybeSingle();
  if (error) throwSupabaseError('cancel local subscription', error, 'Não foi possível cancelar assinatura local.');
  return { subscription: data };
}

async function handleStatus(input: BillingRequest): Promise<unknown> {
  const [subscription, payments, customer] = await Promise.all([
    getSubscription(input.restaurantId),
    adminClient().from('billing_payments').select('id,status,value,due_date,paid_at,invoice_url,provider_payment_id,created_at').eq('restaurant_id', input.restaurantId).order('created_at', { ascending: false }).limit(20),
    getBillingCustomerData(input.restaurantId)
  ]);
  if (payments.error) throwSupabaseError('load billing_payments', payments.error, 'Não foi possível carregar histórico de cobrança.');
  return { subscription, payments: payments.data ?? [], customer: { hasCpfCnpj: isValidCpfCnpj(customer?.cpf_cnpj), cpfCnpjMasked: maskCpfCnpj(customer?.cpf_cnpj) } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed', category: 'validation' }, 405);

  let input: Partial<BillingRequest> | null = null;

  try {
    requiredEnv('ASAAS_API_KEY');
    input = await req.json() as BillingRequest;
    logBillingInfo('payload received', {
      action: input.action ?? null,
      restaurantId: input.restaurantId ?? null,
      hasRestaurantId: Boolean(input.restaurantId),
      planId: input.planId ?? null,
      hasPlanId: Boolean(input.planId),
      hasCustomer: Boolean(input.customer),
      customerHasCpfCnpj: isValidCpfCnpj(input.customer?.cpfCnpj),
      customerCpfCnpjMasked: maskCpfCnpj(input.customer?.cpfCnpj),
      asaasBaseUrl: asaasBaseUrl()
    });
    if (!input.restaurantId) throw new BillingValidationError('restaurantId obrigatório.');
    const userId = await getUserId(req);
    await assertBillingManager(input.restaurantId, userId);

    if (input.action === 'create') return jsonResponse(await handleCreate(input as BillingRequest));
    if (input.action === 'change_plan') return jsonResponse(await handleChangePlan(input as BillingRequest));
    if (input.action === 'cancel') return jsonResponse(await handleCancel(input as BillingRequest));
    if (input.action === 'status') return jsonResponse(await handleStatus(input as BillingRequest));
    return jsonResponse({ error: 'Ação inválida.', category: 'validation' }, 400);
  } catch (error) {
    logBillingError(error, input);
    return jsonResponse({ error: clientErrorMessage(error), category: errorCategory(error) }, errorStatus(error));
  }
});
