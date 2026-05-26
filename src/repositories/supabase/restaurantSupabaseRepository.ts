import { selectFromSupabase, updateSupabaseRows } from '../../lib/supabase/client';
import { OpeningHoursConfig, Restaurant, RestaurantConfig } from '../../types';

type SupabaseRestaurantRow = {
  id: string;
  name: string;
  slug?: string | null;
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
  logo_url?: string | null;
  banner_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  opening_hours?: OpeningHoursConfig | null;
  restaurant?: { slug?: string | null; name?: string | null } | null;
};

function toRestaurant(row: SupabaseRestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? undefined
  };
}

function toRestaurantConfig(row: SupabaseRestaurantSettingsRow): RestaurantConfig {
  return {
    restaurantId: row.restaurant_id,
    name: row.display_name ?? row.restaurant?.name ?? 'Restaurante',
    rating: row.rating_label ?? '4.9',
    deliveryEstimate: row.delivery_estimate ?? '15-25 min',
    address: row.address ?? '',
    instagram: row.instagram ?? '',
    phone: row.phone ?? '',
    logoUrl: row.logo_url ?? undefined,
    bannerUrl: row.banner_url ?? undefined,
    primaryColor: row.primary_color ?? '#dc2626',
    secondaryColor: row.secondary_color ?? '#0f172a',
    openingHours: row.opening_hours ?? undefined,
    slug: row.restaurant?.slug ?? undefined
  };
}

function toSettingsPayload(config: RestaurantConfig): Record<string, unknown> {
  return {
    display_name: config.name.trim(),
    rating_label: config.rating?.trim() || null,
    delivery_estimate: config.deliveryEstimate?.trim() || null,
    address: config.address?.trim() || null,
    instagram: config.instagram?.trim() || null,
    phone: config.phone?.trim() || null,
    logo_url: config.logoUrl?.trim() || null,
    banner_url: config.bannerUrl?.trim() || null,
    primary_color: config.primaryColor?.trim() || null,
    secondary_color: config.secondaryColor?.trim() || null,
    opening_hours: config.openingHours ?? null
  };
}

export async function findAllRestaurants(): Promise<Restaurant[]> {
  const rows = await selectFromSupabase<SupabaseRestaurantRow>('restaurants', 'select=id,name,slug,status&status=eq.active');
  return rows.map(toRestaurant);
}

export async function findAllRestaurantProfiles(): Promise<RestaurantConfig[]> {
  const rows = await selectFromSupabase<SupabaseRestaurantSettingsRow>('restaurant_settings', 'select=*,restaurant:restaurants(slug,name)');
  return rows.map(toRestaurantConfig);
}

export async function updateRestaurantProfile(config: RestaurantConfig): Promise<RestaurantConfig> {
  const rows = await updateSupabaseRows<SupabaseRestaurantSettingsRow>(
    'restaurant_settings',
    'restaurant_id=eq.' + encodeURIComponent(config.restaurantId) + '&select=*,restaurant:restaurants(slug,name)',
    toSettingsPayload(config)
  );

  if (!rows[0]) throw new Error('Configuração do restaurante não encontrada ou sem permissão.');
  return toRestaurantConfig(rows[0]);
}
