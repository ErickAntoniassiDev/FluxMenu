import { UserRole, RolePermissionConfig } from '../types';

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissionConfig> = {
  owner: {
    allowedModes: ['client', 'kitchen', 'cashier', 'admin', 'split'],
    canEditProducts: true,
    canConfigureRestaurant: true,
    canManageTables: true,
    canProcessCheckout: true,
    canUpdateKDS: true,
    canCreateManualOrders: true,
    canOrderForAnyTable: true,
  },
  manager: {
    allowedModes: ['client', 'kitchen', 'cashier', 'admin', 'split'],
    canEditProducts: true,
    canConfigureRestaurant: true,
    canManageTables: true,
    canProcessCheckout: true,
    canUpdateKDS: true,
    canCreateManualOrders: true,
    canOrderForAnyTable: true,
  },
  kitchen: {
    allowedModes: ['kitchen'],
    canEditProducts: false,
    canConfigureRestaurant: false,
    canManageTables: false,
    canProcessCheckout: false,
    canUpdateKDS: true,
    canCreateManualOrders: false,
    canOrderForAnyTable: false,
  },
  cashier: {
    allowedModes: ['cashier'],
    canEditProducts: false,
    canConfigureRestaurant: false,
    canManageTables: false,
    canProcessCheckout: true,
    canUpdateKDS: false,
    canCreateManualOrders: false,
    canOrderForAnyTable: false,
  },
  waiter: {
    allowedModes: ['client'],
    canEditProducts: false,
    canConfigureRestaurant: false,
    canManageTables: false,
    canProcessCheckout: false,
    canUpdateKDS: false,
    canCreateManualOrders: true,
    canOrderForAnyTable: true,
  },
  customer: {
    allowedModes: ['client'],
    canEditProducts: false,
    canConfigureRestaurant: false,
    canManageTables: false,
    canProcessCheckout: false,
    canUpdateKDS: false,
    canCreateManualOrders: false,
    canOrderForAnyTable: false,
  },
};

export function hasModeAccess(role: UserRole, mode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split'): boolean {
  return ROLE_PERMISSIONS[role].allowedModes.includes(mode);
}

export function hasActionPermission(role: UserRole, action: keyof Omit<RolePermissionConfig, 'allowedModes'>): boolean {
  return !!ROLE_PERMISSIONS[role][action];
}
