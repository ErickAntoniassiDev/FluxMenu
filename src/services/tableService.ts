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
    if (import.meta.env.PROD) throw error;
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

export async function getTableRecordsForRestaurant(restaurantId: RestaurantId) {
  return TableSupabaseRepository.findTablesForRestaurant(restaurantId);
}

export async function createTableInSupabase(restaurantId: RestaurantId, label: string) {
  const table = await TableSupabaseRepository.createTable(restaurantId, label);
  logDataSource('restaurant_table create', 'supabase', { restaurantId, tableId: table.id });
  return table;
}

export async function updateTableInSupabase(restaurantId: RestaurantId, tableId: string, label: string) {
  const table = await TableSupabaseRepository.updateTable(restaurantId, tableId, label);
  logDataSource('restaurant_table update', 'supabase', { restaurantId, tableId });
  return table;
}

export async function setTableActiveInSupabase(restaurantId: RestaurantId, tableId: string, active: boolean) {
  const table = await TableSupabaseRepository.setTableActive(restaurantId, tableId, active);
  logDataSource('restaurant_table active update', 'supabase', { restaurantId, tableId, active });
  return table;
}
