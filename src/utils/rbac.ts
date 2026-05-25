import { UserRole, RolePermissionConfig, UserSession } from '../types';

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
    allowedModes: ['client', 'kitchen', 'cashier', 'admin'],
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
    allowedModes: ['client', 'kitchen'],
    canEditProducts: false,
    canConfigureRestaurant: false,
    canManageTables: false,
    canProcessCheckout: false,
    canUpdateKDS: true,
    canCreateManualOrders: false,
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

export const STAFF_USERS: UserSession[] = [
  { 
    id: 'usr_owner', 
    name: 'Carlos Santos (Dono)', 
    role: 'owner', 
    email: 'carlos.flux@restaurante.com', 
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format&fit=crop' 
  },
  { 
    id: 'usr_manager', 
    name: 'Mariana Silva (Gerente)', 
    role: 'manager', 
    email: 'mariana.silva@restaurante.com', 
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120&auto=format&fit=crop' 
  },
  { 
    id: 'usr_waiter', 
    name: 'Bruno Lima (Garçom)', 
    role: 'waiter', 
    email: 'bruno.lima@restaurante.com', 
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop' 
  },
  { 
    id: 'usr_kitchen', 
    name: 'Renan Torres (Cozinha)', 
    role: 'kitchen', 
    email: 'renan.torres@restaurante.com', 
    avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=120&auto=format&fit=crop' 
  },
  { 
    id: 'usr_cashier', 
    name: 'Thiago Costa (Caixa)', 
    role: 'cashier', 
    email: 'thiago.costa@restaurante.com', 
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=120&auto=format&fit=crop' 
  },
  { 
    id: 'usr_customer', 
    name: 'Cliente Autoatendimento', 
    role: 'customer', 
    email: 'cliente@mesa.com', 
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop' 
  }
];

export function hasModeAccess(role: UserRole, mode: 'client' | 'kitchen' | 'cashier' | 'admin' | 'split'): boolean {
  return ROLE_PERMISSIONS[role].allowedModes.includes(mode);
}

export function hasActionPermission(role: UserRole, action: keyof Omit<RolePermissionConfig, 'allowedModes'>): boolean {
  return !!ROLE_PERMISSIONS[role][action];
}
