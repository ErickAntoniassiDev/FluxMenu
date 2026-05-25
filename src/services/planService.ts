import * as PlanRepository from '../repositories/planRepository';
import { SaaSFeature, SaaSLimit, SaaSPlan, SaaSPlanId } from '../types';

export function getDefaultPlanId(): SaaSPlanId {
  return PlanRepository.findDefaultPlanId();
}

export function getPlans(): SaaSPlan[] {
  return PlanRepository.findAllPlans();
}

export function getPlan(planId: SaaSPlanId = getDefaultPlanId()): SaaSPlan {
  return PlanRepository.findPlanById(planId) ?? PlanRepository.findPlanById(getDefaultPlanId())!;
}

export function canUseFeature(planId: SaaSPlanId, feature: SaaSFeature): boolean {
  return !!PlanRepository.findPlanById(planId)?.features[feature];
}

export function getPlanLimit(planId: SaaSPlanId, limit: SaaSLimit): number {
  return PlanRepository.findPlanById(planId)?.limits[limit] ?? getPlan(getDefaultPlanId()).limits[limit];
}

export function isUnlimitedLimit(value: number): boolean {
  return value < 0;
}
