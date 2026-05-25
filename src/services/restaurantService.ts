import { RESTAURANT_PROFILES } from '../data';
import { RESTAURANTS } from '../data/restaurants';
import { RestaurantConfig, RestaurantId } from '../types';

export function getRestaurantProfile(restaurantId: RestaurantId): RestaurantConfig {
  return { ...(RESTAURANT_PROFILES.find(profile => profile.restaurantId === restaurantId) ?? RESTAURANT_PROFILES[0]) };
}

export function getRestaurantProfiles(): RestaurantConfig[] {
  return RESTAURANT_PROFILES.map(profile => ({ ...profile }));
}

export function getRestaurantConfigForActive(configs: RestaurantConfig[], restaurantId: RestaurantId): RestaurantConfig {
  return configs.find(config => config.restaurantId === restaurantId) ?? getRestaurantProfile(restaurantId);
}

export function updateRestaurantConfig(configs: RestaurantConfig[], updated: RestaurantConfig): RestaurantConfig[] {
  const exists = configs.some(config => config.restaurantId === updated.restaurantId);
  if (!exists) return [...configs, updated];
  return configs.map(config => config.restaurantId === updated.restaurantId ? updated : config);
}

export function getRestaurants() {
  return RESTAURANTS.map(restaurant => ({ ...restaurant }));
}
