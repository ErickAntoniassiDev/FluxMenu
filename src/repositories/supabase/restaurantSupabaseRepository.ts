import { selectFromSupabase } from '../../lib/supabase/client';
import { Restaurant, RestaurantConfig } from '../../types';

type SupabaseRestaurantRow = {
  id: string;
  name: string;
  status?: string | null;
};

type SupabaseRestaurantSettingsRow = {
  restaurant_id: string;
  display_name?: string | null;
  rating_label?: string | null;
  delivery_estimate?: string | null;
  address?: string | null;
  instagram?: string | null;
  phone?: string | null;
};

function toRestaurant(row: SupabaseRestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name
  };
}

function toRestaurantConfig(row: SupabaseRestaurantSettingsRow): RestaurantConfig {
  return {
    restaurantId: row.restaurant_id,
    name: row.display_name ?? 'Restaurante',
    rating: row.rating_label ?? '4.9',
    deliveryEstimate: row.delivery_estimate ?? '15-25 min',
    address: row.address ?? '',
    instagram: row.instagram ?? '',
    phone: row.phone ?? ''
  };
}

export async function findAllRestaurants(): Promise<Restaurant[]> {
  const rows = await selectFromSupabase<SupabaseRestaurantRow>('restaurants', 'select=id,name,status&status=eq.active');
  return rows.map(toRestaurant);
}

export async function findAllRestaurantProfiles(): Promise<RestaurantConfig[]> {
  const rows = await selectFromSupabase<SupabaseRestaurantSettingsRow>('restaurant_settings', 'select=*');
  return rows.map(toRestaurantConfig);
}
