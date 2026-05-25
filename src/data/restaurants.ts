import { Restaurant } from '../types';

export const DEFAULT_RESTAURANT_ID = 'rest_gusto';

export const RESTAURANTS: Restaurant[] = [
  { id: 'rest_gusto', name: 'Gusto & Charcoal', slug: 'gusto-charcoal' },
  { id: 'rest_bistro', name: 'Bistro Aurora', slug: 'bistro-aurora' }
];

export function getDefaultRestaurantId(): string {
  return DEFAULT_RESTAURANT_ID;
}
