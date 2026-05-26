import { SaaSFeature, SaaSLimit, SaaSPlanId } from '../types';

export type GateKind = 'feature' | 'limit';

export interface FeatureGateDefinition {
  key: SaaSFeature;
  kind: 'feature';
  label: string;
  description: string;
  minimumPlan: SaaSPlanId;
  blockedMessage: string;
}

export interface LimitGateDefinition {
  key: SaaSLimit;
  kind: 'limit';
  label: string;
  description: string;
  minimumPlan: SaaSPlanId;
  blockedMessage: string;
}

export type GateDefinition = FeatureGateDefinition | LimitGateDefinition;

export const FEATURE_GATES: Record<SaaSFeature, FeatureGateDefinition> = {
  analytics: {
    key: 'analytics',
    kind: 'feature',
    label: 'Analytics',
    description: 'Dashboards, histórico financeiro e métricas operacionais.',
    minimumPlan: 'pro',
    blockedMessage: 'Analytics está disponível a partir do plano Pro.'
  },
  ai: {
    key: 'ai',
    kind: 'feature',
    label: 'IA',
    description: 'Recursos assistidos por inteligência artificial.',
    minimumPlan: 'premium',
    blockedMessage: 'Recursos de IA estão disponíveis no plano Premium.'
  },
  multiple_units: {
    key: 'multiple_units',
    kind: 'feature',
    label: 'Múltiplas unidades',
    description: 'Operação de mais de um restaurante na mesma conta.',
    minimumPlan: 'premium',
    blockedMessage: 'Múltiplas unidades estão disponíveis no plano Premium.'
  },
  multi_user_rbac: {
    key: 'multi_user_rbac',
    kind: 'feature',
    label: 'Equipe e permissões',
    description: 'Usuários operacionais com papéis separados.',
    minimumPlan: 'pro',
    blockedMessage: 'Gestão de equipe está disponível a partir do plano Pro.'
  },
  remove_fluxmenu_branding: {
    key: 'remove_fluxmenu_branding',
    kind: 'feature',
    label: 'Remover marca FluxMenu',
    description: 'Remove assinatura visual FluxMenu do cardápio público.',
    minimumPlan: 'pro',
    blockedMessage: 'Remoção da marca FluxMenu está disponível a partir do plano Pro.'
  },
  advanced_customization: {
    key: 'advanced_customization',
    kind: 'feature',
    label: 'Personalização avançada',
    description: 'Banner, cores avançadas e horários personalizados.',
    minimumPlan: 'premium',
    blockedMessage: 'Personalização avançada está disponível no plano Premium.'
  },
  advanced_permissions: {
    key: 'advanced_permissions',
    kind: 'feature',
    label: 'Permissões avançadas',
    description: 'Controle granular de papéis operacionais.',
    minimumPlan: 'premium',
    blockedMessage: 'Permissões avançadas estão disponíveis no plano Premium.'
  }
};

export const LIMIT_GATES: Record<SaaSLimit, LimitGateDefinition> = {
  maxProducts: {
    key: 'maxProducts',
    kind: 'limit',
    label: 'Produtos ativos',
    description: 'Quantidade de itens ativos no cardápio.',
    minimumPlan: 'starter',
    blockedMessage: 'Limite de produtos ativos atingido para o plano atual.'
  },
  maxTables: {
    key: 'maxTables',
    kind: 'limit',
    label: 'Mesas ativas',
    description: 'Quantidade de mesas ativas com QR Code.',
    minimumPlan: 'starter',
    blockedMessage: 'Limite de mesas ativas atingido para o plano atual.'
  },
  maxStaffUsers: {
    key: 'maxStaffUsers',
    kind: 'limit',
    label: 'Usuários ativos',
    description: 'Quantidade de membros ativos na equipe do restaurante.',
    minimumPlan: 'starter',
    blockedMessage: 'Limite de usuários ativos atingido para o plano atual.'
  },
  maxOrdersPerMonth: {
    key: 'maxOrdersPerMonth',
    kind: 'limit',
    label: 'Pedidos por mês',
    description: 'Quantidade de pedidos criados no mês corrente.',
    minimumPlan: 'starter',
    blockedMessage: 'Limite mensal de pedidos atingido para o plano atual.'
  },
  maxRestaurants: {
    key: 'maxRestaurants',
    kind: 'limit',
    label: 'Restaurantes',
    description: 'Quantidade de restaurantes ativos vinculados ao owner.',
    minimumPlan: 'starter',
    blockedMessage: 'Limite de restaurantes atingido para o plano atual.'
  }
};
