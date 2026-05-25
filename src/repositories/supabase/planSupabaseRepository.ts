import { selectFromSupabase } from '../../lib/supabase/client';
import { SaaSFeature, SaaSLimit, SaaSPlan, SaaSPlanId } from '../../types';

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
  status: 'trialing' | 'active' | 'past_due' | 'canceled';
};

export type RestaurantSubscription = {
  id: string;
  restaurantId: string;
  planId: SaaSPlanId;
  status: SupabaseSubscriptionRow['status'];
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
    status: row.status
  };
}

export async function findAllPlans(): Promise<SaaSPlan[]> {
  const rows = await selectFromSupabase<SupabasePlanRow>('plans', 'select=*&active=eq.true');
  return rows.map(toPlan);
}

export async function findAllSubscriptions(): Promise<RestaurantSubscription[]> {
  const rows = await selectFromSupabase<SupabaseSubscriptionRow>('subscriptions', 'select=id,restaurant_id,plan_id,status&status=in.(trialing,active,past_due)');
  return rows.map(toSubscription);
}
