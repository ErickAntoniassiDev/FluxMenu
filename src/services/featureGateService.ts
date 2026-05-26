import { FEATURE_GATES, LIMIT_GATES } from '../config/featureGates';
import { SaaSFeature, SaaSLimit, SaaSPlan } from '../types';

export interface GateDecision {
  allowed: boolean;
  message: string | null;
  limit?: number;
  usage?: number;
  remaining?: number | null;
}

export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

export function canUseFeature(plan: SaaSPlan, billingEntitled: boolean, feature: SaaSFeature): GateDecision {
  const gate = FEATURE_GATES[feature];
  if (!billingEntitled) {
    return { allowed: false, message: 'Assinatura inativa. Regularize o plano para usar este recurso.' };
  }
  if (plan.features[feature]) return { allowed: true, message: null };
  return { allowed: false, message: gate.blockedMessage };
}

export function checkLimit(plan: SaaSPlan, limitKey: SaaSLimit, usage: number, increment = 1): GateDecision {
  const gate = LIMIT_GATES[limitKey];
  const limit = plan.limits[limitKey];
  if (isUnlimited(limit)) return { allowed: true, message: null, limit, usage, remaining: null };
  const remaining = Math.max(limit - usage, 0);
  if (usage + increment <= limit) return { allowed: true, message: null, limit, usage, remaining };
  return {
    allowed: false,
    message: `${gate.blockedMessage} Uso atual: ${usage}/${limit}.`,
    limit,
    usage,
    remaining
  };
}

export function getFeatureMessage(feature: SaaSFeature): string {
  return FEATURE_GATES[feature].blockedMessage;
}

export function getLimitMessage(limit: SaaSLimit): string {
  return LIMIT_GATES[limit].blockedMessage;
}
