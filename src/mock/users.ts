import { UserSession } from '../types';

export const STAFF_USERS: UserSession[] = [
  {
    id: 'usr_owner',
    restaurantId: 'rest_gusto',
    name: 'Carlos Santos (Dono)',
    role: 'owner',
    email: 'carlos.flux@restaurante.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format&fit=crop'
  },
  {
    id: 'usr_manager',
    restaurantId: 'rest_gusto',
    name: 'Mariana Silva (Gerente)',
    role: 'manager',
    email: 'mariana.silva@restaurante.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120&auto=format&fit=crop'
  },
  {
    id: 'usr_waiter',
    restaurantId: 'rest_gusto',
    name: 'Bruno Lima (Garçom)',
    role: 'waiter',
    email: 'bruno.lima@restaurante.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop'
  },
  {
    id: 'usr_kitchen',
    restaurantId: 'rest_gusto',
    name: 'Renan Torres (Cozinha)',
    role: 'kitchen',
    email: 'renan.torres@restaurante.com',
    avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?q=80&w=120&auto=format&fit=crop'
  },
  {
    id: 'usr_cashier',
    restaurantId: 'rest_gusto',
    name: 'Thiago Costa (Caixa)',
    role: 'cashier',
    email: 'thiago.costa@restaurante.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=120&auto=format&fit=crop'
  },
  {
    id: 'usr_customer',
    restaurantId: 'rest_gusto',
    name: 'Cliente Autoatendimento',
    role: 'customer',
    email: 'cliente@mesa.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop'
  },
  {
    id: 'usr_bistro_owner',
    restaurantId: 'rest_bistro',
    name: 'Helena Rocha (Dona)',
    role: 'owner',
    email: 'helena@bistroaurora.com',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=120&auto=format&fit=crop'
  },
  {
    id: 'usr_bistro_kitchen',
    restaurantId: 'rest_bistro',
    name: 'Mateus Neri (Cozinha)',
    role: 'kitchen',
    email: 'mateus@bistroaurora.com',
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=120&auto=format&fit=crop'
  },
  {
    id: 'usr_bistro_cashier',
    restaurantId: 'rest_bistro',
    name: 'Paula Reis (Caixa)',
    role: 'cashier',
    email: 'paula@bistroaurora.com',
    avatar: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=120&auto=format&fit=crop'
  }
];
