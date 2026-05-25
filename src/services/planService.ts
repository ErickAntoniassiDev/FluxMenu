import { DEFAULT_PLAN_ID, SAAS_PLANS } from '../data/plans';
import { SaaSFeature, SaaSLimit, SaaSPlan, SaaSPlanId } from '../types';

export function getPlans(): SaaSPlan[] {
  return Object.values(SAAS_PLANS).map(plan => ({
    ...plan,
    features: { ...plan.features },
    limits: { ...plan.limits }
  }));
}

export function getPlan(planId: SaaSPlanId = DEFAULT_PLAN_ID): SaaSPlan {
  const plan = SAAS_PLANS[planId] ?? SAAS_PLANS[DEFAULT_PLAN_ID];
  return {
    ...plan,
    features: { ...plan.features },
    limits: { ...plan.limits }
  };
}

export function canUseFeature(planId: SaaSPlanId, feature: SaaSFeature): boolean {
  return !!SAAS_PLANS[planId]?.features[feature];
}

export function getPlanLimit(planId: SaaSPlanId, limit: SaaSLimit): number {
  return SAAS_PLANS[planId]?.limits[limit] ?? SAAS_PLANS[DEFAULT_PLAN_ID].limits[limit];
}

export function isUnlimitedLimit(value: number): boolean {
  return value < 0;
}
