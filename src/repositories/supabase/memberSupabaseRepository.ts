import { selectFromSupabase } from '../../lib/supabase/client';
import { RestaurantId, UserRole } from '../../types';

export type RestaurantMember = {
  id: string;
  restaurantId: RestaurantId;
  profileId: string;
  role: UserRole;
  active: boolean;
};

type SupabaseRestaurantMemberRow = {
  id: string;
  restaurant_id: string;
  profile_id: string;
  role: UserRole;
  active: boolean;
};

function toMember(row: SupabaseRestaurantMemberRow): RestaurantMember {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    profileId: row.profile_id,
    role: row.role,
    active: row.active
  };
}

export async function findActiveMembershipsForCurrentUser(): Promise<RestaurantMember[]> {
  const rows = await selectFromSupabase<SupabaseRestaurantMemberRow>('restaurant_members', 'select=id,restaurant_id,profile_id,role,active&active=eq.true');
  return rows.map(toMember);
}
