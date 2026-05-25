import { logDataSource, logSupabaseFallback } from '../lib/supabase/client';
import * as CatalogRepository from '../repositories/catalogRepository';
import * as CatalogSupabaseRepository from '../repositories/supabase/catalogSupabaseRepository';
import { CategoryOption, Product, RestaurantId } from '../types';

type DataSource = 'supabase' | 'fallback';

export interface CatalogLoadResult {
  products: Product[];
  source: DataSource;
}

let productCategoriesCache: CategoryOption[] | null = null;

function getProductCategorySource(): CategoryOption[] {
  return productCategoriesCache ?? CatalogRepository.findAllProductCategories();
}

function getMenuCategorySource(): CategoryOption[] {
  if (!productCategoriesCache) return CatalogRepository.findAllMenuCategories();

  const restaurantIds = Array.from(new Set(productCategoriesCache.map(category => category.restaurantId)));
  return restaurantIds.flatMap(restaurantId => [
    { id: 'todos' as const, label: 'Tudo', restaurantId },
    ...productCategoriesCache.filter(category => category.restaurantId === restaurantId)
  ]);
}

export function getProducts(restaurantId: RestaurantId): Product[] {
  return CatalogRepository.findAllProducts()
    .filter(product => product.restaurantId === restaurantId)
    .map(product => ({ ...product, available: product.available ?? true }));
}

export function getProductsForRestaurant(products: Product[], restaurantId: RestaurantId): Product[] {
  return products.filter(product => product.restaurantId === restaurantId);
}

export function getMenuCategories(restaurantId: RestaurantId): CategoryOption[] {
  return getMenuCategorySource()
    .filter(category => category.restaurantId === restaurantId)
    .map(category => ({ ...category }));
}

export function getProductCategories(restaurantId: RestaurantId): CategoryOption[] {
  return getProductCategorySource()
    .filter(category => category.restaurantId === restaurantId)
    .map(category => ({ ...category }));
}

export async function loadProductsWithFallback(): Promise<CatalogLoadResult> {
  try {
    const [products, categories] = await Promise.all([
      CatalogSupabaseRepository.findAllProducts(),
      CatalogSupabaseRepository.findAllProductCategories()
    ]);

    productCategoriesCache = categories;
    const mappedProducts = products.map(product => ({ ...product, available: product.available ?? true }));
    logDataSource('catalog', 'supabase', { products: mappedProducts.length, categories: categories.length });
    return { products: mappedProducts, source: 'supabase' };
  } catch (error) {
    logSupabaseFallback('catalog', error);
  }

  productCategoriesCache = null;
  const products = CatalogRepository.findAllProducts().map(product => ({ ...product, available: product.available ?? true }));
  logDataSource('catalog', 'fallback', { products: products.length });
  return { products, source: 'fallback' };
}

export async function getAllProductsWithFallback(): Promise<Product[]> {
  return (await loadProductsWithFallback()).products;
}

export async function getProductCategoriesWithFallback(restaurantId: RestaurantId): Promise<CategoryOption[]> {
  try {
    const categories = await CatalogSupabaseRepository.findAllProductCategories();
    productCategoriesCache = categories;
    logDataSource('categories', 'supabase', { categories: categories.length });
    return getProductCategories(restaurantId);
  } catch (error) {
    logSupabaseFallback('categories', error);
  }

  productCategoriesCache = null;
  logDataSource('categories', 'fallback');
  return getProductCategories(restaurantId);
}

export async function getMenuCategoriesWithFallback(restaurantId: RestaurantId): Promise<CategoryOption[]> {
  await getProductCategoriesWithFallback(restaurantId);
  return getMenuCategories(restaurantId);
}

export function updateProduct(products: Product[], updated: Product): Product[] {
  return products.map(product => product.id === updated.id && product.restaurantId === updated.restaurantId ? updated : product);
}

function validateProduct(product: Omit<Product, 'id'> | Product): void {
  if (!product.name.trim()) throw new Error('Nome do produto é obrigatório.');
  if (!product.description.trim()) throw new Error('Descrição do produto é obrigatória.');
  if (product.price <= 0) throw new Error('Preço precisa ser maior que zero.');
  if (product.prepTimeMinutes < 0) throw new Error('Tempo de preparo inválido.');
  if (!product.category) throw new Error('Categoria é obrigatória.');
}

export async function saveProduct(updated: Product): Promise<Product> {
  validateProduct(updated);
  const product = await CatalogSupabaseRepository.updateProduct(updated);
  logDataSource('product update', 'supabase', { productId: product.id, restaurantId: product.restaurantId });
  return product;
}

export async function createProductInSupabase(product: Omit<Product, 'id'>): Promise<Product> {
  validateProduct(product);
  const created = await CatalogSupabaseRepository.createProduct(product);
  logDataSource('product create', 'supabase', { productId: created.id, restaurantId: created.restaurantId });
  return created;
}

export async function deactivateProductInSupabase(id: string, restaurantId: RestaurantId): Promise<void> {
  await CatalogSupabaseRepository.deactivateProduct(id, restaurantId);
  logDataSource('product deactivate', 'supabase', { productId: id, restaurantId });
}

export async function createCategoryInSupabase(restaurantId: RestaurantId, name: string): Promise<CategoryOption> {
  if (!name.trim()) throw new Error('Nome da categoria é obrigatório.');
  const category = await CatalogSupabaseRepository.createCategory(restaurantId, name);
  productCategoriesCache = [...(productCategoriesCache ?? CatalogRepository.findAllProductCategories()), category];
  logDataSource('category create', 'supabase', { categoryId: category.id, restaurantId });
  return category;
}

export async function updateCategoryInSupabase(category: CategoryOption): Promise<CategoryOption> {
  if (!category.label.trim()) throw new Error('Nome da categoria é obrigatório.');
  const updated = await CatalogSupabaseRepository.updateCategory(category);
  productCategoriesCache = (productCategoriesCache ?? CatalogRepository.findAllProductCategories()).map(current =>
    current.restaurantId === updated.restaurantId && current.id === updated.id ? updated : current
  );
  logDataSource('category update', 'supabase', { categoryId: updated.id, restaurantId: updated.restaurantId });
  return updated;
}

export async function deactivateCategoryInSupabase(category: CategoryOption): Promise<CategoryOption> {
  const deactivated = await CatalogSupabaseRepository.deactivateCategory(category);
  productCategoriesCache = (productCategoriesCache ?? CatalogRepository.findAllProductCategories()).filter(current =>
    !(current.restaurantId === category.restaurantId && current.id === category.id)
  );
  logDataSource('category deactivate', 'supabase', { categoryId: category.id, restaurantId: category.restaurantId });
  return deactivated;
}

export function addProduct(products: Product[], newProduct: Omit<Product, 'id'>): Product[] {
  const id = 'p_' + Date.now().toString();
  return [...products, { ...newProduct, id, available: true }];
}

export function deleteProduct(products: Product[], id: string, restaurantId: RestaurantId): Product[] {
  return products.filter(product => !(product.id === id && product.restaurantId === restaurantId));
}

export function ensureProductRestaurantIds(products: Product[], restaurantId: RestaurantId): Product[] {
  return products.map(product => ({ ...product, restaurantId: product.restaurantId ?? restaurantId, available: product.available ?? true }));
}
