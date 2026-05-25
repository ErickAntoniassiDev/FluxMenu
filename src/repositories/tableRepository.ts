import { DEFAULT_TABLES, RestaurantTablesSeed } from '../data/tables';

export function findAllRestaurantTables(): RestaurantTablesSeed[] {
  return DEFAULT_TABLES.map(group => ({
    restaurantId: group.restaurantId,
    tables: [...group.tables]
  }));
}
