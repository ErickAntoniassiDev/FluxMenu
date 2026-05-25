import { RestaurantId } from '../types';

export interface RestaurantTablesSeed {
  restaurantId: RestaurantId;
  tables: string[];
}

export const DEFAULT_TABLES: RestaurantTablesSeed[] = [
  {
    restaurantId: 'rest_gusto',
    tables: ['Mesa 01', 'Mesa 02', 'Mesa 03', 'Mesa 04', 'Mesa 05', 'Mesa 08', 'Mesa 12', 'Mesa 15', 'Mesa VIP']
  },
  {
    restaurantId: 'rest_bistro',
    tables: ['Mesa 01', 'Mesa 02', 'Mesa 06', 'Mesa 09', 'Mesa Varanda', 'Balcão 01']
  }
];
