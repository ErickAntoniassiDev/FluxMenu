import { logDataSource, logSupabaseFallback } from '../lib/supabase/client';
import * as PlanRepository from '../repositories/planRepository';
import * as PlanSupabaseRepository from '../repositories/supabase/planSupabaseRepository';
import { SaaSFeature, SaaSLimit, SaaSPlan, SaaSPlanId, RestaurantId } from '../types';

type DataSource = 'supabase' | 'fallback';

export interface PlansLoadResult {
  plans: SaaSPlan[];
  subscriptions: PlanSupabaseRepository.RestaurantSubscription[];
  source: DataSource;
}

let plansCache: SaaSPlan[] | null = null;
let subscriptionsCache: PlanSupabaseRepository.RestaurantSubscription[] | null = null;

function getPlanSource(): SaaSPlan[] {
  return plansCache ?? PlanRepository.findAllPlans();
}

export function getDefaultPlanId(): SaaSPlanId {
  return PlanRepository.findDefaultPlanId();
}

export function getPlans(): SaaSPlan[] {
  return getPlanSource().map(plan => ({
    ...plan,
    features: { ...plan.features },
    limits: { ...plan.limits }
  }));
}

export function getPlan(planId: SaaSPlanId = getDefaultPlanId()): SaaSPlan {
  const plans = getPlanSource();
  const plan = plans.find(current => current.id === planId) ?? plans.find(current => current.id === getDefaultPlanId()) ?? PlanRepository.findPlanById(getDefaultPlanId())!;
  return {
    ...plan,
    features: { ...plan.features },
    limits: { ...plan.limits }
  };
}

export async function loadPlansWithFallback(): Promise<PlansLoadResult> {
  try {
    const [plans, subscriptions] = await Promise.all([
      PlanSupabaseRepository.findAllPlans(),
      PlanSupabaseRepository.findAllSubscriptions()
    ]);

    if (plans.length > 0) {
      plansCache = plans;
      subscriptionsCache = subscriptions;
      logDataSource('plans/subscriptions', 'supabase', { plans: plans.length, subscriptions: subscriptions.length });
      return { plans: getPlans(), subscriptions: subscriptions.map(subscription => ({ ...subscription })), source: 'supabase' };
    }
  } catch (error) {
    logSupabaseFallback('plans/subscriptions', error);
  }

  plansCache = null;
  subscriptionsCache = null;
  const plans = getPlans();
  logDataSource('plans/subscriptions', 'fallback', { plans: plans.length, subscriptions: 0 });
  return { plans, subscriptions: [], source: 'fallback' };
}

export async function getPlansWithFallback(): Promise<SaaSPlan[]> {
  return (await loadPlansWithFallback()).plans;
}

export async function getSubscriptionsWithFallback(): Promise<PlanSupabaseRepository.RestaurantSubscription[]> {
  return (await loadPlansWithFallback()).subscriptions;
}

export function getPlanIdForRestaurant(restaurantId: RestaurantId, fallbackPlanId: SaaSPlanId = getDefaultPlanId()): SaaSPlanId {
  return subscriptionsCache?.find(subscription => subscription.restaurantId === restaurantId)?.planId ?? fallbackPlanId;
}

export function canUseFeature(planId: SaaSPlanId, feature: SaaSFeature): boolean {
  return !!getPlan(planId).features[feature];
}

export function getPlanLimit(planId: SaaSPlanId, limit: SaaSLimit): number {
  return getPlan(planId).limits[limit] ?? getPlan(getDefaultPlanId()).limits[limit];
}

export function isUnlimitedLimit(value: number): boolean {
  return value < 0;
}
