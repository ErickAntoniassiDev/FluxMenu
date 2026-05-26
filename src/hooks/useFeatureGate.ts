import { useApp } from '../store/AppContext';
export function useFeatureGate() {
  const { canUseFeature, checkLimit, requireFeature, requireLimit, currentPlan, currentSubscription } = useApp();

  return {
    currentPlan,
    currentSubscription,
    canUseFeature,
    checkLimit,
    requireFeature,
    requireLimit
  };
}
