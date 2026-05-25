import { DEFAULT_RESTAURANT_ID, RESTAURANTS } from '../data/restaurants';
import { RESTAURANT_PROFILES } from '../data/seed';
import { Restaurant, RestaurantConfig, RestaurantId } from '../types';

export function findDefaultRestaurantId(): RestaurantId {
  return DEFAULT_RESTAURANT_ID;
}

export function findAllRestaurants(): Restaurant[] {
  return RESTAURANTS.map(restaurant => ({ ...restaurant }));
}

export function findAllRestaurantProfiles(): RestaurantConfig[] {
  return RESTAURANT_PROFILES.map(profile => ({ ...profile }));
}
