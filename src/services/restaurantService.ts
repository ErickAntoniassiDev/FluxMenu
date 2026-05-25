import * as RestaurantRepository from '../repositories/restaurantRepository';
import * as RestaurantSupabaseRepository from '../repositories/supabase/restaurantSupabaseRepository';
import { Restaurant, RestaurantConfig, RestaurantId } from '../types';

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

export async function getRestaurantProfilesWithFallback(): Promise<RestaurantConfig[]> {
  try {
    const profiles = await RestaurantSupabaseRepository.findAllRestaurantProfiles();
    if (profiles.length > 0) {
      restaurantProfilesCache = profiles;
      return getRestaurantProfiles();
    }
  } catch (error) {
    console.warn('Supabase restaurant settings read failed. Falling back to local data.', error);
  }

  restaurantProfilesCache = null;
  return getRestaurantProfiles();
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
  try {
    const restaurants = await RestaurantSupabaseRepository.findAllRestaurants();
    if (restaurants.length > 0) {
      restaurantsCache = restaurants;
      return getRestaurants();
    }
  } catch (error) {
    console.warn('Supabase restaurants read failed. Falling back to local data.', error);
  }

  restaurantsCache = null;
  return getRestaurants();
}
