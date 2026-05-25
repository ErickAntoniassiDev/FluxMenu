import { logDataSource, logSupabaseFallback } from '../lib/supabase/client';
import * as TableRepository from '../repositories/tableRepository';
import * as TableSupabaseRepository from '../repositories/supabase/tableSupabaseRepository';
import { RestaurantId } from '../types';

type DataSource = 'supabase' | 'fallback';
type TablesByRestaurant = Record<RestaurantId, string[]>;

export interface TablesLoadResult {
  tablesByRestaurant: TablesByRestaurant;
  source: DataSource;
}

let tablesCache: TablesByRestaurant | null = null;

function getLocalTablesByRestaurant(): TablesByRestaurant {
  return TableRepository.findAllRestaurantTables().reduce<TablesByRestaurant>((acc, group) => {
    acc[group.restaurantId] = [...group.tables];
    return acc;
  }, {});
}

export function getTables(restaurantId: RestaurantId): string[] {
  const source = tablesCache ?? getLocalTablesByRestaurant();
  return [...(source[restaurantId] ?? [])];
}

export async function loadTablesWithFallback(): Promise<TablesLoadResult> {
  try {
    const groups = await TableSupabaseRepository.findAllRestaurantTables();
    tablesCache = groups.reduce<TablesByRestaurant>((acc, group) => {
      acc[group.restaurantId] = [...group.tables];
      return acc;
    }, {});
    logDataSource('restaurant_tables', 'supabase', { restaurants: Object.keys(tablesCache).length });
    return { tablesByRestaurant: { ...tablesCache }, source: 'supabase' };
  } catch (error) {
    logSupabaseFallback('restaurant_tables', error);
  }

  tablesCache = null;
  const tablesByRestaurant = getLocalTablesByRestaurant();
  logDataSource('restaurant_tables', 'fallback', { restaurants: Object.keys(tablesByRestaurant).length });
  return { tablesByRestaurant, source: 'fallback' };
}

export async function getTablesByRestaurantWithFallback(): Promise<TablesByRestaurant> {
  return (await loadTablesWithFallback()).tablesByRestaurant;
}

export function addTable(tables: string[], table: string): string[] {
  return [...tables, table].sort();
}

export function deleteTable(tables: string[], table: string): string[] {
  return tables.filter(current => current !== table);
}
