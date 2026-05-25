import { MENU_PRODUCTS } from '../data';
import { MENU_FILTER_CATEGORIES, PRODUCT_CATEGORIES } from '../data/catalog';
import { CategoryOption, Product, RestaurantId } from '../types';

export function getProducts(restaurantId: RestaurantId): Product[] {
  return MENU_PRODUCTS
    .filter(product => product.restaurantId === restaurantId)
    .map(product => ({ ...product, available: product.available ?? true }));
}

export function getProductsForRestaurant(products: Product[], restaurantId: RestaurantId): Product[] {
  return products.filter(product => product.restaurantId === restaurantId);
}

export function getMenuCategories(restaurantId: RestaurantId): CategoryOption[] {
  return MENU_FILTER_CATEGORIES
    .filter(category => category.restaurantId === restaurantId)
    .map(category => ({ ...category }));
}

export function getProductCategories(restaurantId: RestaurantId): CategoryOption[] {
  return PRODUCT_CATEGORIES
    .filter(category => category.restaurantId === restaurantId)
    .map(category => ({ ...category }));
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
