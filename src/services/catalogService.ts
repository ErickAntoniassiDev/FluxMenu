import { MENU_PRODUCTS } from '../data';
import { MENU_FILTER_CATEGORIES, PRODUCT_CATEGORIES } from '../data/catalog';
import { CategoryOption, Product } from '../types';

export function getProducts(): Product[] {
  return MENU_PRODUCTS.map(product => ({ ...product, available: product.available ?? true }));
}

export function getMenuCategories(): CategoryOption[] {
  return MENU_FILTER_CATEGORIES.map(category => ({ ...category }));
}

export function getProductCategories(): CategoryOption[] {
  return PRODUCT_CATEGORIES.map(category => ({ ...category }));
}

export function updateProduct(products: Product[], updated: Product): Product[] {
  return products.map(product => product.id === updated.id ? updated : product);
}

export function addProduct(products: Product[], newProduct: Omit<Product, 'id'>): Product[] {
  const id = 'p_' + Date.now().toString();
  return [...products, { ...newProduct, id, available: true }];
}

export function deleteProduct(products: Product[], id: string): Product[] {
  return products.filter(product => product.id !== id);
}
