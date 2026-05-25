import { logDataSource, logSupabaseFallback } from '../lib/supabase/client';
import * as RestaurantRepository from '../repositories/restaurantRepository';
import * as RestaurantSupabaseRepository from '../repositories/supabase/restaurantSupabaseRepository';
import { Restaurant, RestaurantConfig, RestaurantId } from '../types';

type DataSource = 'supabase' | 'fallback';

export interface RestaurantsLoadResult {
  restaurants: Restaurant[];
  profiles: RestaurantConfig[];
  source: DataSource;
}

let restaurantsCache: Restaurant[] | null = null;
let restaurantProfilesCache: RestaurantConfig[] | null = null;

export function getDefaultRestaurantId(): RestaurantId {
  return RestaurantRepository.findDefaultRestaurantId();
}

export function getRestaurantProfile(restaurantId: RestaurantId): RestaurantConfig {
  const profiles = restaurantProfilesCache ?? RestaurantRepository.findAllRestaurantProfiles();
  return { ...(profiles.find(profile => profile.restaurantId === restaurantId) ?? profiles[0]) };
}

export function getRestaurantProfiles(): RestaurantConfig[] {
  return (restaurantProfilesCache ?? RestaurantRepository.findAllRestaurantProfiles()).map(profile => ({ ...profile }));
}

export async function loadRestaurantsWithFallback(): Promise<RestaurantsLoadResult> {
  try {
    const [restaurants, profiles] = await Promise.all([
      RestaurantSupabaseRepository.findAllRestaurants(),
      RestaurantSupabaseRepository.findAllRestaurantProfiles()
    ]);

    if (restaurants.length > 0) {
      restaurantsCache = restaurants;
      restaurantProfilesCache = profiles.length > 0 ? profiles : restaurants.map(restaurant => ({
        restaurantId: restaurant.id,
        name: restaurant.name,
        rating: '4.9',
        deliveryEstimate: '15-25 min',
        address: '',
        instagram: ''
      }));
      logDataSource('restaurants', 'supabase', { restaurants: restaurantsCache.length, settings: restaurantProfilesCache.length });
      return { restaurants: getRestaurants(), profiles: getRestaurantProfiles(), source: 'supabase' };
    }
  } catch (error) {
    logSupabaseFallback('restaurants', error);
  }

  restaurantsCache = null;
  restaurantProfilesCache = null;
  const restaurants = getRestaurants();
  const profiles = getRestaurantProfiles();
  logDataSource('restaurants', 'fallback', { restaurants: restaurants.length, settings: profiles.length });
  return { restaurants, profiles, source: 'fallback' };
}

export async function getRestaurantProfilesWithFallback(): Promise<RestaurantConfig[]> {
  return (await loadRestaurantsWithFallback()).profiles;
}

export function getRestaurantConfigForActive(configs: RestaurantConfig[], restaurantId: RestaurantId): RestaurantConfig {
  return configs.find(config => config.restaurantId === restaurantId) ?? getRestaurantProfile(restaurantId);
}

export function updateRestaurantConfig(configs: RestaurantConfig[], updated: RestaurantConfig): RestaurantConfig[] {
  const exists = configs.some(config => config.restaurantId === updated.restaurantId);
  if (!exists) return [...configs, updated];
  return configs.map(config => config.restaurantId === updated.restaurantId ? updated : config);
}

export function getRestaurants(): Restaurant[] {
  return (restaurantsCache ?? RestaurantRepository.findAllRestaurants()).map(restaurant => ({ ...restaurant }));
}

export async function getRestaurantsWithFallback(): Promise<Restaurant[]> {
  return (await loadRestaurantsWithFallback()).restaurants;
}
