import { DEFAULT_PLAN_ID, SAAS_PLANS } from '../config/plans';
import { SaaSPlan, SaaSPlanId } from '../types';

export function findDefaultPlanId(): SaaSPlanId {
  return DEFAULT_PLAN_ID;
}

export function findAllPlans(): SaaSPlan[] {
  return Object.values(SAAS_PLANS).map(plan => ({
    ...plan,
    features: { ...plan.features },
    limits: { ...plan.limits }
  }));
}

export function findPlanById(planId: SaaSPlanId): SaaSPlan | undefined {
  const plan = SAAS_PLANS[planId];
  if (!plan) return undefined;
  return {
    ...plan,
    features: { ...plan.features },
    limits: { ...plan.limits }
  };
}
