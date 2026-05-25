import { RESTAURANT_PROFILE } from '../data';
import { RestaurantConfig } from '../types';

export function getRestaurantProfile(): RestaurantConfig {
  return { ...RESTAURANT_PROFILE };
}
