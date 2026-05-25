import { CategoryOption, ProductCategory, RestaurantId } from '../types';
import { RESTAURANTS } from './restaurants';

const CATEGORY_DEFINITIONS: Array<{ id: ProductCategory; label: string }> = [
  { id: 'entradas', label: 'Entradas' },
  { id: 'hamburgueres', label: 'Hambúrgueres' },
  { id: 'pizzas', label: 'Pizzas' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'sobremesas', label: 'Sobremesas' }
];

export const PRODUCT_CATEGORIES: CategoryOption[] = RESTAURANTS.flatMap(restaurant =>
  CATEGORY_DEFINITIONS.map(category => ({ ...category, restaurantId: restaurant.id }))
);

export const MENU_FILTER_CATEGORIES: CategoryOption[] = RESTAURANTS.flatMap(restaurant => [
  { id: 'todos' as const, label: 'Tudo', restaurantId: restaurant.id },
  ...CATEGORY_DEFINITIONS.map(category => ({ ...category, restaurantId: restaurant.id }))
]);

export function getDefaultCategoriesForRestaurant(restaurantId: RestaurantId): CategoryOption[] {
  return PRODUCT_CATEGORIES.filter(category => category.restaurantId === restaurantId);
}
