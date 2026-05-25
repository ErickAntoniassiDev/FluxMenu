import { SaaSPlan, SaaSPlanId } from '../types';

export const SAAS_PLANS: Record<SaaSPlanId, SaaSPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 99,
    currency: 'BRL',
    billingPeriod: 'monthly',
    features: {
      digital_menu: true,
      kds: true,
      cashier: false,
      admin_catalog: true,
      qr_tables: true,
      payment_history: false,
      manual_orders: false,
      advanced_reports: false,
      multi_user_rbac: false,
      priority_support: false
    },
    limits: {
      maxProducts: 60,
      maxTables: 12,
      maxStaffUsers: 3,
      maxOrdersPerMonth: 800,
      paymentHistoryDays: 7,
      maxRestaurants: 1
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 199,
    currency: 'BRL',
    billingPeriod: 'monthly',
    features: {
      digital_menu: true,
      kds: true,
      cashier: true,
      admin_catalog: true,
      qr_tables: true,
      payment_history: true,
      manual_orders: true,
      advanced_reports: false,
      multi_user_rbac: true,
      priority_support: false
    },
    limits: {
      maxProducts: 250,
      maxTables: 50,
      maxStaffUsers: 15,
      maxOrdersPerMonth: 5000,
      paymentHistoryDays: 90,
      maxRestaurants: 3
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 399,
    currency: 'BRL',
    billingPeriod: 'monthly',
    features: {
      digital_menu: true,
      kds: true,
      cashier: true,
      admin_catalog: true,
      qr_tables: true,
      payment_history: true,
      manual_orders: true,
      advanced_reports: true,
      multi_user_rbac: true,
      priority_support: true
    },
    limits: {
      maxProducts: -1,
      maxTables: -1,
      maxStaffUsers: -1,
      maxOrdersPerMonth: -1,
      paymentHistoryDays: -1,
      maxRestaurants: 10
    }
  }
};

export const DEFAULT_PLAN_ID: SaaSPlanId = 'starter';
