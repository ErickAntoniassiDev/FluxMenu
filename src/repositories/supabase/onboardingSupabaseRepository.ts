import { callSupabaseRpc } from '../../lib/supabase/client';
import { RestaurantId, RestaurantOnboardingSetup, SaaSPlanId, UserRole } from '../../types';

export type OnboardingResult = {
  restaurantId: RestaurantId;
  restaurantName: string;
  restaurantSlug: string;
  planId: SaaSPlanId;
  memberRole: UserRole;
};

type SupabaseOnboardingResult = {
  restaurant_id: string;
  restaurant_name: string;
  restaurant_slug: string;
  plan_id: SaaSPlanId;
  member_role: UserRole;
};

export async function createRestaurantOnboarding(restaurantName: string, planId: SaaSPlanId = 'starter', setup?: RestaurantOnboardingSetup): Promise<OnboardingResult> {
  const result = await callSupabaseRpc<SupabaseOnboardingResult>('create_restaurant_onboarding', {
    p_restaurant_name: restaurantName,
    p_plan_id: planId,
    p_setup: setup ? {
      tables: setup.tables,
      categories: setup.categories,
      products: setup.products
    } : null
  });

  return {
    restaurantId: result.restaurant_id,
    restaurantName: result.restaurant_name,
    restaurantSlug: result.restaurant_slug,
    planId: result.plan_id,
    memberRole: result.member_role
  };
}
