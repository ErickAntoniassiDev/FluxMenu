import { insertSupabaseRows, selectFromSupabase, updateSupabaseRows } from '../../lib/supabase/client';
import { RestaurantId, RestaurantTable } from '../../types';

export type RestaurantTablesResult = {
  restaurantId: RestaurantId;
  tables: string[];
};

type SupabaseRestaurantTableRow = {
  id?: string;
  restaurant_id: string;
  label: string;
  slug: string;
  active?: boolean | null;
  sort_order?: number | null;
};

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTable(row: SupabaseRestaurantTableRow): RestaurantTable {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    label: row.label,
    slug: row.slug,
    active: row.active !== false
  };
}

function assertRestaurant(restaurantId: RestaurantId): void {
  if (!restaurantId) throw new Error('Restaurante obrigatório para concluir esta ação.');
}

export async function findAllRestaurantTables(): Promise<RestaurantTablesResult[]> {
  const rows = await selectFromSupabase<SupabaseRestaurantTableRow>('restaurant_tables', 'select=id,restaurant_id,label,slug,active,sort_order&active=eq.true&order=sort_order.asc');
  const grouped = new Map<RestaurantId, string[]>();

  rows.forEach(row => {
    const tables = grouped.get(row.restaurant_id) ?? [];
    tables.push(row.label);
    grouped.set(row.restaurant_id, tables);
  });

  return Array.from(grouped.entries()).map(([restaurantId, tables]) => ({ restaurantId, tables }));
}

export async function findTablesForRestaurant(restaurantId: RestaurantId): Promise<RestaurantTable[]> {
  assertRestaurant(restaurantId);
  const rows = await selectFromSupabase<SupabaseRestaurantTableRow>(
    'restaurant_tables',
    'select=id,restaurant_id,label,slug,active,sort_order&restaurant_id=eq.' + encodeURIComponent(restaurantId) + '&order=sort_order.asc'
  );
  return rows.map(toTable);
}

export async function createTable(restaurantId: RestaurantId, label: string): Promise<RestaurantTable> {
  assertRestaurant(restaurantId);
  const normalizedLabel = label.trim();
  if (!normalizedLabel) throw new Error('Nome da mesa obrigatório.');
  const rows = await insertSupabaseRows<SupabaseRestaurantTableRow>('restaurant_tables', {
    restaurant_id: restaurantId,
    label: normalizedLabel,
    slug: toSlug(normalizedLabel),
    active: true
  });
  if (!rows[0]) throw new Error('Não foi possível criar a mesa.');
  return toTable(rows[0]);
}

export async function updateTable(restaurantId: RestaurantId, tableId: string, label: string): Promise<RestaurantTable> {
  assertRestaurant(restaurantId);
  const normalizedLabel = label.trim();
  if (!normalizedLabel) throw new Error('Nome da mesa obrigatório.');
  const rows = await updateSupabaseRows<SupabaseRestaurantTableRow>(
    'restaurant_tables',
    'id=eq.' + encodeURIComponent(tableId) + '&restaurant_id=eq.' + encodeURIComponent(restaurantId),
    { label: normalizedLabel, slug: toSlug(normalizedLabel) }
  );
  if (!rows[0]) throw new Error('Mesa não encontrada ou sem permissão.');
  return toTable(rows[0]);
}

export async function setTableActive(restaurantId: RestaurantId, tableId: string, active: boolean): Promise<RestaurantTable> {
  assertRestaurant(restaurantId);
  const rows = await updateSupabaseRows<SupabaseRestaurantTableRow>(
    'restaurant_tables',
    'id=eq.' + encodeURIComponent(tableId) + '&restaurant_id=eq.' + encodeURIComponent(restaurantId),
    { active }
  );
  if (!rows[0]) throw new Error('Mesa não encontrada ou sem permissão.');
  return toTable(rows[0]);
}
