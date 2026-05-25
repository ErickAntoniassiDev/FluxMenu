import { selectFromSupabase } from '../../lib/supabase/client';
import { SaaSFeature, SaaSLimit, SaaSPlan, SaaSPlanId, SubscriptionStatus } from '../../types';

type SupabasePlanRow = {
  id: SaaSPlanId;
  name: string;
  price_cents: number;
  currency: 'BRL';
  billing_period: 'monthly';
  features: Record<SaaSFeature, boolean>;
  limits: Record<SaaSLimit, number>;
  active?: boolean | null;
};

type SupabaseSubscriptionRow = {
  id: string;
  restaurant_id: string;
  plan_id: SaaSPlanId;
  status: SubscriptionStatus;
  billing_status?: SubscriptionStatus | null;
  checkout_url?: string | null;
  trial_ends_at?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
};

export type RestaurantSubscription = {
  id: string;
  restaurantId: string;
  planId: SaaSPlanId;
  status: SubscriptionStatus;
  billingStatus?: SubscriptionStatus;
  checkoutUrl?: string | null;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
};

function toPlan(row: SupabasePlanRow): SaaSPlan {
  return {
    id: row.id,
    name: row.name,
    price: row.price_cents / 100,
    currency: row.currency,
    billingPeriod: row.billing_period,
    features: { ...row.features },
    limits: { ...row.limits }
  };
}

function toSubscription(row: SupabaseSubscriptionRow): RestaurantSubscription {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    planId: row.plan_id,
    status: row.status,
    billingStatus: row.billing_status ?? row.status,
    checkoutUrl: row.checkout_url ?? null,
    trialEndsAt: row.trial_ends_at ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    cancelAtPeriodEnd: row.cancel_at_period_end ?? false
  };
}

export async function findAllPlans(): Promise<SaaSPlan[]> {
  const rows = await selectFromSupabase<SupabasePlanRow>('plans', 'select=*&active=eq.true');
  return rows.map(toPlan);
}

export async function findAllSubscriptions(): Promise<RestaurantSubscription[]> {
  const rows = await selectFromSupabase<SupabaseSubscriptionRow>('subscriptions', 'select=id,restaurant_id,plan_id,status,billing_status,checkout_url,trial_ends_at,current_period_end,cancel_at_period_end&status=in.(trialing,active,past_due)');
  return rows.map(toSubscription);
}
