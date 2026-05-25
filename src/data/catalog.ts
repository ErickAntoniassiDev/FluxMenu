import { CategoryOption } from '../types';

export const PRODUCT_CATEGORIES: CategoryOption[] = [
  { id: 'entradas', label: 'Entradas' },
  { id: 'hamburgueres', label: 'Hambúrgueres' },
  { id: 'pizzas', label: 'Pizzas' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'sobremesas', label: 'Sobremesas' }
];

export const MENU_FILTER_CATEGORIES: CategoryOption[] = [
  { id: 'todos', label: 'Tudo' },
  ...PRODUCT_CATEGORIES
];
