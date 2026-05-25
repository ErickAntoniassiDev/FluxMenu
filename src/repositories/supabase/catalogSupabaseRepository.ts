import { selectFromSupabase } from '../../lib/supabase/client';
import { CategoryOption, MenuCategoryFilter, Product, ProductCategory } from '../../types';

type SupabaseCategoryRow = {
  id: string;
  restaurant_id: string;
  slug?: string | null;
  name: string;
  active?: boolean | null;
  sort_order?: number | null;
};

type SupabaseProductRow = {
  id: string;
  restaurant_id: string;
  category?: string | null;
  category_slug?: string | null;
  categories?: { slug?: string | null } | null;
  name: string;
  description?: string | null;
  price: number | string;
  image_url?: string | null;
  image?: string | null;
  prep_time_minutes?: number | null;
  available?: boolean | null;
  active?: boolean | null;
};

function toCategoryOption(row: SupabaseCategoryRow): CategoryOption {
  const id = (row.slug ?? row.id) as MenuCategoryFilter;
  return {
    id,
    label: row.name,
    restaurantId: row.restaurant_id
  };
}

function toProduct(row: SupabaseProductRow): Product {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description ?? '',
    price: Number(row.price),
    category: (row.categories?.slug ?? row.category_slug ?? row.category ?? 'entradas') as ProductCategory,
    image: row.image_url ?? row.image ?? '',
    prepTimeMinutes: row.prep_time_minutes ?? 15,
    available: row.available ?? true
  };
}

export async function findAllProductCategories(): Promise<CategoryOption[]> {
  const rows = await selectFromSupabase<SupabaseCategoryRow>('categories', 'select=*&active=eq.true&order=sort_order.asc');
  return rows.map(toCategoryOption);
}

export async function findAllProducts(): Promise<Product[]> {
  const rows = await selectFromSupabase<SupabaseProductRow>('products', 'select=*,categories(slug)&active=eq.true');
  return rows.map(toProduct);
}
