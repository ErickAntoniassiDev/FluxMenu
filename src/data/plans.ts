import { SaaSPlan, SaaSPlanId } from '../types';

export const SAAS_PLANS: Record<SaaSPlanId, SaaSPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 99,
    currency: 'BRL',
    billingPeriod: 'monthly',
    features: {
      analytics: false,
      ai: false,
      multiple_units: false,
      multi_user_rbac: false,
      remove_fluxmenu_branding: false,
      advanced_customization: false,
      advanced_permissions: false
    },
    limits: {
      maxProducts: -1,
      maxTables: -1,
      maxStaffUsers: 1,
      maxOrdersPerMonth: -1,
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
      analytics: true,
      ai: false,
      multiple_units: false,
      multi_user_rbac: true,
      remove_fluxmenu_branding: true,
      advanced_customization: false,
      advanced_permissions: false
    },
    limits: {
      maxProducts: -1,
      maxTables: -1,
      maxStaffUsers: 15,
      maxOrdersPerMonth: -1,
      maxRestaurants: 1
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 399,
    currency: 'BRL',
    billingPeriod: 'monthly',
    features: {
      analytics: true,
      ai: true,
      multiple_units: true,
      multi_user_rbac: true,
      remove_fluxmenu_branding: true,
      advanced_customization: true,
      advanced_permissions: true
    },
    limits: {
      maxProducts: -1,
      maxTables: -1,
      maxStaffUsers: -1,
      maxOrdersPerMonth: -1,
      maxRestaurants: 10
    }
  }
};

export const DEFAULT_PLAN_ID: SaaSPlanId = 'starter';
