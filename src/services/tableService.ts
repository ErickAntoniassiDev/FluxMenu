import { DEFAULT_TABLES } from '../data/tables';
import { RestaurantId } from '../types';

export function getTables(restaurantId: RestaurantId): string[] {
  return [...(DEFAULT_TABLES.find(group => group.restaurantId === restaurantId)?.tables ?? [])];
}

export function addTable(tables: string[], table: string): string[] {
  return [...tables, table].sort();
}

export function deleteTable(tables: string[], table: string): string[] {
  return tables.filter(current => current !== table);
}
