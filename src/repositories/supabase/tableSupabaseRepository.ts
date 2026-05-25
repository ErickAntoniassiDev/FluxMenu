import { selectFromSupabase } from '../../lib/supabase/client';
import { RestaurantId } from '../../types';

export type RestaurantTablesResult = {
  restaurantId: RestaurantId;
  tables: string[];
};

type SupabaseRestaurantTableRow = {
  restaurant_id: string;
  label: string;
  active?: boolean | null;
  sort_order?: number | null;
};

export async function findAllRestaurantTables(): Promise<RestaurantTablesResult[]> {
  const rows = await selectFromSupabase<SupabaseRestaurantTableRow>('restaurant_tables', 'select=restaurant_id,label,active,sort_order&active=eq.true&order=sort_order.asc');
  const grouped = new Map<RestaurantId, string[]>();

  rows.forEach(row => {
    const tables = grouped.get(row.restaurant_id) ?? [];
    tables.push(row.label);
    grouped.set(row.restaurant_id, tables);
  });

  return Array.from(grouped.entries()).map(([restaurantId, tables]) => ({ restaurantId, tables }));
}
