import { invokeSupabaseFunction } from '../lib/supabase/client';
import { BillingPayment, RestaurantId, RestaurantSubscriptionStatus, SaaSPlanId } from '../types';

type FunctionSubscription = {
  id: string;
  restaurant_id?: string;
  restaurantId?: string;
  plan_id?: SaaSPlanId;
  planId?: SaaSPlanId;
  status: RestaurantSubscriptionStatus['status'];
  billing_status?: RestaurantSubscriptionStatus['billingStatus'];
  checkout_url?: string | null;
  checkoutUrl?: string | null;
  trial_ends_at?: string | null;
  trialEndsAt?: string | null;
  current_period_end?: string | null;
  currentPeriodEnd?: string | null;
  cancel_at_period_end?: boolean;
};

type FunctionPayment = {
  id: string;
  status: string;
  value: number;
  due_date?: string | null;
  paid_at?: string | null;
  invoice_url?: string | null;
  provider_payment_id?: string;
  created_at?: string;
};

type BillingResponse = {
  subscription: FunctionSubscription | null;
  payments?: FunctionPayment[];
};

function toSubscription(row: FunctionSubscription | null): RestaurantSubscriptionStatus | null {
  if (!row) return null;
  return {
    id: row.id,
    restaurantId: row.restaurantId ?? row.restaurant_id ?? '',
    planId: row.planId ?? row.plan_id ?? 'starter',
    status: row.status,
    billingStatus: row.billing_status ?? row.status,
    checkoutUrl: row.checkoutUrl ?? row.checkout_url ?? null,
    trialEndsAt: row.trialEndsAt ?? row.trial_ends_at ?? null,
    currentPeriodEnd: row.currentPeriodEnd ?? row.current_period_end ?? null,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false
  };
}

function toPayment(row: FunctionPayment): BillingPayment {
  return {
    id: row.id,
    status: row.status,
    value: Number(row.value ?? 0),
    dueDate: row.due_date ?? null,
    paidAt: row.paid_at ?? null,
    invoiceUrl: row.invoice_url ?? null,
    providerPaymentId: row.provider_payment_id,
    createdAt: row.created_at
  };
}

export async function loadBillingStatus(restaurantId: RestaurantId): Promise<{ subscription: RestaurantSubscriptionStatus | null; payments: BillingPayment[] }> {
  const response = await invokeSupabaseFunction<BillingResponse>('asaas-billing', { action: 'status', restaurantId });
  return { subscription: toSubscription(response.subscription), payments: (response.payments ?? []).map(toPayment) };
}

export async function createSubscription(restaurantId: RestaurantId, planId: SaaSPlanId, customer?: { name?: string; email?: string; phone?: string; cpfCnpj?: string }): Promise<RestaurantSubscriptionStatus | null> {
  const response = await invokeSupabaseFunction<BillingResponse>('asaas-billing', { action: 'create', restaurantId, planId, customer: customer ?? {} });
  return toSubscription(response.subscription);
}

export async function changeSubscriptionPlan(restaurantId: RestaurantId, planId: SaaSPlanId): Promise<RestaurantSubscriptionStatus | null> {
  const response = await invokeSupabaseFunction<BillingResponse>('asaas-billing', { action: 'change_plan', restaurantId, planId });
  return toSubscription(response.subscription);
}

export async function cancelSubscription(restaurantId: RestaurantId): Promise<RestaurantSubscriptionStatus | null> {
  const response = await invokeSupabaseFunction<BillingResponse>('asaas-billing', { action: 'cancel', restaurantId });
  return toSubscription(response.subscription);
}
