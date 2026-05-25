import { insertSupabaseRows, selectFromSupabase, updateSupabaseRows } from '../../lib/supabase/client';
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
  category_id?: string | null;
  category?: string | null;
  category_slug?: string | null;
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

function toProduct(row: SupabaseProductRow, categoriesById: Map<string, SupabaseCategoryRow>): Product {
  const category = row.category_id ? categoriesById.get(row.category_id) : undefined;

  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description ?? '',
    price: Number(row.price),
    category: (category?.slug ?? row.category_slug ?? row.category ?? 'entradas') as ProductCategory,
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
  const [productRows, categoryRows] = await Promise.all([
    selectFromSupabase<SupabaseProductRow>('products', 'select=*&active=eq.true'),
    selectFromSupabase<SupabaseCategoryRow>('categories', 'select=id,restaurant_id,slug,name,active,sort_order&active=eq.true')
  ]);
  const categoriesById = new Map(categoryRows.map(category => [category.id, category]));
  return productRows.map(product => toProduct(product, categoriesById));
}

async function getCategoryIdForProduct(product: Product): Promise<string> {
  const rows = await selectFromSupabase<SupabaseCategoryRow>(
    'categories',
    'select=id,restaurant_id,slug,name,active,sort_order&restaurant_id=eq.' + encodeURIComponent(product.restaurantId) + '&slug=eq.' + encodeURIComponent(product.category) + '&active=eq.true&limit=1'
  );
  const category = rows[0];
  if (!category) throw new Error('Category not found for product update: ' + product.category);
  return category.id;
}

export async function updateProduct(product: Product): Promise<Product> {
  const categoryId = await getCategoryIdForProduct(product);
  const rows = await updateSupabaseRows<SupabaseProductRow>(
    'products',
    'id=eq.' + encodeURIComponent(product.id) + '&restaurant_id=eq.' + encodeURIComponent(product.restaurantId),
    {
      category_id: categoryId,
      name: product.name,
      description: product.description,
      price: product.price,
      image_url: product.image,
      prep_time_minutes: product.prepTimeMinutes,
      available: product.available ?? true
    }
  );

  const updated = rows[0];
  if (!updated) throw new Error('Product update returned no rows.');
  const categories = await selectFromSupabase<SupabaseCategoryRow>('categories', 'select=id,restaurant_id,slug,name,active,sort_order&active=eq.true');
  return toProduct(updated, new Map(categories.map(category => [category.id, category])));
}

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createCategory(restaurantId: string, name: string): Promise<CategoryOption> {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error('Category name is required.');
  const slug = toSlug(trimmedName);
  if (!slug) throw new Error('Category slug is invalid.');

  const rows = await insertSupabaseRows<SupabaseCategoryRow>('categories', {
    restaurant_id: restaurantId,
    slug,
    name: trimmedName,
    sort_order: 999,
    active: true
  });
  const created = rows[0];
  if (!created) throw new Error('Category insert returned no rows.');
  return toCategoryOption(created);
}

export async function updateCategory(category: CategoryOption): Promise<CategoryOption> {
  const trimmedName = category.label.trim();
  if (!trimmedName) throw new Error('Category name is required.');
  const slug = toSlug(String(category.id));

  const rows = await updateSupabaseRows<SupabaseCategoryRow>(
    'categories',
    'restaurant_id=eq.' + encodeURIComponent(category.restaurantId) + '&slug=eq.' + encodeURIComponent(String(category.id)),
    { name: trimmedName, slug, active: true }
  );
  const updated = rows[0];
  if (!updated) throw new Error('Category update returned no rows.');
  return toCategoryOption(updated);
}

export async function deactivateCategory(category: CategoryOption): Promise<CategoryOption> {
  const rows = await updateSupabaseRows<SupabaseCategoryRow>(
    'categories',
    'restaurant_id=eq.' + encodeURIComponent(category.restaurantId) + '&slug=eq.' + encodeURIComponent(String(category.id)),
    { active: false }
  );
  const updated = rows[0];
  if (!updated) return category;
  return toCategoryOption(updated);
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  if (!product.name.trim()) throw new Error('Product name is required.');
  if (!product.description.trim()) throw new Error('Product description is required.');
  if (product.price <= 0) throw new Error('Product price must be greater than zero.');
  if (product.prepTimeMinutes < 0) throw new Error('Product preparation time is invalid.');

  const categoryId = await getCategoryIdForProduct({ ...product, id: '' });
  const rows = await insertSupabaseRows<SupabaseProductRow>('products', {
    restaurant_id: product.restaurantId,
    category_id: categoryId,
    name: product.name.trim(),
    description: product.description.trim(),
    price: product.price,
    image_url: product.image,
    prep_time_minutes: product.prepTimeMinutes,
    available: product.available ?? true,
    active: true
  });
  const created = rows[0];
  if (!created) throw new Error('Product insert returned no rows.');
  const categories = await selectFromSupabase<SupabaseCategoryRow>('categories', 'select=id,restaurant_id,slug,name,active,sort_order&active=eq.true');
  return toProduct(created, new Map(categories.map(category => [category.id, category])));
}

export async function deactivateProduct(id: string, restaurantId: string): Promise<void> {
  await updateSupabaseRows<SupabaseProductRow>(
    'products',
    'id=eq.' + encodeURIComponent(id) + '&restaurant_id=eq.' + encodeURIComponent(restaurantId),
    { active: false, available: false }
  );
}
