import { Restaurant } from '../types';

export const DEFAULT_RESTAURANT_ID = 'rest_gusto';

export const RESTAURANTS: Restaurant[] = [
  { id: 'rest_gusto', name: 'Gusto & Charcoal' },
  { id: 'rest_bistro', name: 'Bistro Aurora' }
];

export function getDefaultRestaurantId(): string {
  return DEFAULT_RESTAURANT_ID;
}
