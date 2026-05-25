import { MENU_PRODUCTS } from '../data/seed';
import { MENU_FILTER_CATEGORIES, PRODUCT_CATEGORIES } from '../data/catalog';
import { CategoryOption, Product } from '../types';

export function findAllProducts(): Product[] {
  return MENU_PRODUCTS.map(product => ({ ...product }));
}

export function findAllMenuCategories(): CategoryOption[] {
  return MENU_FILTER_CATEGORIES.map(category => ({ ...category }));
}

export function findAllProductCategories(): CategoryOption[] {
  return PRODUCT_CATEGORIES.map(category => ({ ...category }));
}
