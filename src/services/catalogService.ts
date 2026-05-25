import * as CatalogRepository from '../repositories/catalogRepository';
import * as CatalogSupabaseRepository from '../repositories/supabase/catalogSupabaseRepository';
import { CategoryOption, Product, RestaurantId } from '../types';

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

export async function getAllProductsWithFallback(): Promise<Product[]> {
  try {
    const [products, categories] = await Promise.all([
      CatalogSupabaseRepository.findAllProducts(),
      CatalogSupabaseRepository.findAllProductCategories()
    ]);

    if (categories.length > 0) productCategoriesCache = categories;
    if (products.length > 0) return products.map(product => ({ ...product, available: product.available ?? true }));
  } catch (error) {
    console.warn('Supabase catalog read failed. Falling back to local data.', error);
  }

  productCategoriesCache = null;
  return CatalogRepository.findAllProducts().map(product => ({ ...product, available: product.available ?? true }));
}

export async function getProductCategoriesWithFallback(restaurantId: RestaurantId): Promise<CategoryOption[]> {
  try {
    const categories = await CatalogSupabaseRepository.findAllProductCategories();
    if (categories.length > 0) {
      productCategoriesCache = categories;
      return getProductCategories(restaurantId);
    }
  } catch (error) {
    console.warn('Supabase category read failed. Falling back to local data.', error);
  }

  productCategoriesCache = null;
  return getProductCategories(restaurantId);
}

export async function getMenuCategoriesWithFallback(restaurantId: RestaurantId): Promise<CategoryOption[]> {
  await getProductCategoriesWithFallback(restaurantId);
  return getMenuCategories(restaurantId);
}

export function updateProduct(products: Product[], updated: Product): Product[] {
  return products.map(product => product.id === updated.id && product.restaurantId === updated.restaurantId ? updated : product);
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
