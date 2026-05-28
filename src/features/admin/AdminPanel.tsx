import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../../store/AppContext';
import { CategoryOption, OpeningHoursDay, Product, RestaurantConfig, RestaurantTable, UserRole } from '../../types';
import * as AnalyticsService from '../../services/analyticsService';
import * as TableService from '../../services/tableService';
import * as StaffService from '../../services/staffService';
import * as AssetService from '../../services/assetService';
import * as ProductImageService from '../../services/productImageService';
import * as BillingService from '../../services/billingService';
import { AnalyticsPeriod, DashboardMetrics } from '../../services/analyticsService';
import { UpgradeNotice } from '../shared/UpgradeNotice';
import { SAAS_PLANS } from '../../config/plans';
import { 
  DollarSign, 
  Receipt,
  Layers, 
  Eye, 
  EyeOff, 
  Tag, 
  Plus, 
  TrendingUp, 
  Store, 
  MapPin, 
  QrCode, 
  Trash2, 
  Settings, 
  UtensilsCrossed, 
  Check, 
  PlusCircle, 
  X,
  Clock,
  Copy,
  Download,
  Users,
  UserPlus,
  Palette,
  Image as ImageIcon,
  CreditCard,
  Save,
  Power
} from 'lucide-react';


function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const roleLabels: Record<UserRole, string> = {
  owner: 'Dono',
  manager: 'Gerente',
  kitchen: 'Cozinha',
  cashier: 'Caixa',
  waiter: 'Atendimento',
  customer: 'Cliente'
};

const invitationStatusLabels: Record<string, string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  revoked: 'Revogado'
};

const subscriptionStatusLabels: Record<string, string> = {
  trialing: 'Período gratuito',
  active: 'Ativa',
  past_due: 'Aguardando pagamento',
  canceled: 'Cancelada',
  incomplete: 'Pendente'
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  RECEIVED: 'Recebida',
  CONFIRMED: 'Confirmada',
  OVERDUE: 'Vencida',
  REFUNDED: 'Estornada',
  DELETED: 'Cancelada'
};

function statusLabel(status?: string | null): string {
  if (!status) return 'Sem assinatura';
  return subscriptionStatusLabels[status] ?? status;
}

function paymentStatusLabel(status?: string | null): string {
  if (!status) return '-';
  return paymentStatusLabels[status] ?? status;
}

function friendlyPaymentCode(value?: string | null): string {
  if (!value) return 'Cobrança';
  return 'Cobrança ' + value.slice(-8).toUpperCase();
}

export const AdminPanel: React.FC = () => {
  const {
    activeRestaurantId,
    currentPlan,
    currentPlanId,
    currentSubscription,
    billingPayments,
    billingCustomer,
    refreshBilling,
    currentUser,
    canUseFeature,
    checkLimit,
    showUpgradeNotice,
    products,
    productCategories,
    updateProduct,
    addProduct,
    deleteProduct,
    addCategory,
    updateCategory,
    deleteCategory,
    orders,
    restaurantConfig,
    setRestaurantConfig,
    tables,
    addTable,
    updateTable,
    deleteTable,
    hasPermission
  } = useApp();

  const canUseAnalytics = canUseFeature('analytics');
  const canUseAI = canUseFeature('ai');
  const canUseAdvancedPermissions = canUseFeature('advanced_permissions');
  const canRemoveBranding = canUseFeature('remove_fluxmenu_branding');

  // Active sub-sections within the Admin
  const [activeTab, setActiveTab] = useState<'dashboard' | 'catalog' | 'tables' | 'staff' | 'subscription' | 'settings'>('dashboard');

  // Edit Product modals states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddFormOpen, setIsAddFormOpen] = useState<boolean>(false);

  // New product inputs
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState(0);
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<string>('entradas');
  const [newPrep, setNewPrep] = useState(15);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState('');
  const [editingProductOriginalImage, setEditingProductOriginalImage] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<CategoryOption | null>(null);
  const [adminLoading, setAdminLoading] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('today');
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // New tabular inputs
  const [newTableNameInput, setNewTableNameInput] = useState('');
  const [selectedQRTable, setSelectedQRTable] = useState<string>(tables[0] || 'Mesa 08');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [tableRecords, setTableRecords] = useState<RestaurantTable[]>([]);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffService.StaffMember[]>([]);
  const [staffInvitations, setStaffInvitations] = useState<StaffService.StaffInvitation[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSuccess, setStaffSuccess] = useState<string | null>(null);
  const [staffInviteLink, setStaffInviteLink] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('waiter');
  const [settingsDraft, setSettingsDraft] = useState<RestaurantConfig>(restaurantConfig);
  const [settingsLoading, setSettingsLoading] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState<string | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingCpfCnpj, setBillingCpfCnpj] = useState('');

  const canManageRestaurant = hasPermission('canConfigureRestaurant');
  const canManageTables = hasPermission('canManageTables');
  const canManageStaff = currentUser.role === 'owner' || currentUser.role === 'manager';
  const canViewBilling = currentUser.role === 'owner';
  const activeStaffCount = staffMembers.filter(member => member.active).length;
  const staffLimitDecision = checkLimit('maxStaffUsers', activeStaffCount, 1);
  const canInviteStaff = canManageStaff && canUseFeature('multi_user_rbac') && staffLimitDecision.allowed;
  const assignableRoles = StaffService.getAssignableRoles(currentUser.role);
  const weekDays = [
    ['monday', 'Segunda'],
    ['tuesday', 'Terça'],
    ['wednesday', 'Quarta'],
    ['thursday', 'Quinta'],
    ['friday', 'Sexta'],
    ['saturday', 'Sábado'],
    ['sunday', 'Domingo']
  ] as const;

  const legacyWeekDayKeys: Record<string, string> = {
    monday: 'mon',
    tuesday: 'tue',
    wednesday: 'wed',
    thursday: 'thu',
    friday: 'fri',
    saturday: 'sat',
    sunday: 'sun'
  };

  const emptyOpeningDay: OpeningHoursDay = { open: '', close: '', closed: true };

  const parseOpeningHourText = (value: string): OpeningHoursDay => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === 'fechado' || normalized === 'closed') return { ...emptyOpeningDay };
    const [open = '', close = ''] = normalized.split('-').map(part => part.trim());
    return { open, close, closed: false };
  };

  const getOpeningDay = (config: RestaurantConfig, day: string): OpeningHoursDay => {
    const hours = config.openingHours ?? {};
    const value = hours[day] ?? hours[legacyWeekDayKeys[day]];
    if (!value) return { ...emptyOpeningDay };
    if (typeof value === 'string') return parseOpeningHourText(value);
    return {
      open: value.open ?? '',
      close: value.close ?? '',
      closed: Boolean(value.closed)
    };
  };

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  const normalizeOpeningHours = (config: RestaurantConfig): Record<string, OpeningHoursDay> => {
    return Object.fromEntries(weekDays.map(([day]) => {
      const value = getOpeningDay(config, day);
      const open = value.open.trim();
      const close = value.close.trim();
      const closed = value.closed || (!open && !close);
      if (!closed && (!timePattern.test(open) || !timePattern.test(close))) {
        throw new Error('Horário inválido em ' + day + '. Use o formato 11:00-23:00 ou marque fechado.');
      }
      return [day, { open: closed ? '' : open, close: closed ? '' : close, closed }];
    }));
  };

  const updateOpeningDay = (day: string, partial: Partial<OpeningHoursDay>) => {
    setSettingsDraft(prev => {
      const current = getOpeningDay(prev, day);
      return {
        ...prev,
        openingHours: {
          ...(prev.openingHours ?? {}),
          [day]: { ...current, ...partial }
        }
      };
    });
  };

  useEffect(() => {
    setSettingsDraft(restaurantConfig);
  }, [restaurantConfig]);

  useEffect(() => {
    if (!canViewBilling && activeTab === 'subscription') setActiveTab('dashboard');
  }, [activeTab, canViewBilling]);

  const reloadTables = async () => {
    try {
      const records = await TableService.getTableRecordsForRestaurant(activeRestaurantId);
      setTableRecords(records);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Não foi possível carregar mesas.');
    }
  };

  const reloadStaff = async () => {
    if (!canManageStaff) return;
    setStaffLoading(true);
    setStaffError(null);
    setStaffSuccess(null);
    setStaffInviteLink(null);
    try {
      const [members, invitations] = await Promise.all([
        StaffService.loadStaff(activeRestaurantId),
        StaffService.loadInvitations(activeRestaurantId)
      ]);
      setStaffMembers(members);
      setStaffInvitations(invitations);
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : 'Não foi possível carregar funcionários.');
    } finally {
      setStaffLoading(false);
    }
  };

  useEffect(() => {
    void reloadTables();
  }, [activeRestaurantId]);

  useEffect(() => {
    if (currentUser.role === 'owner' || currentUser.role === 'manager') void refreshBilling().catch(error => setBillingError(error instanceof Error ? error.message : 'Não foi possível carregar assinatura.'));
  }, [activeRestaurantId, currentUser.role]);

  useEffect(() => {
    void reloadStaff();
  }, [activeRestaurantId, canManageStaff]);

  useEffect(() => {
    let cancelled = false;
    if (!canUseAnalytics || currentUser.role === 'kitchen') {
      setDashboardMetrics(null);
      return;
    }

    setDashboardLoading(true);
    setDashboardError(null);
    AnalyticsService.loadDashboardMetrics(activeRestaurantId, analyticsPeriod)
      .then(metrics => {
        if (!cancelled) setDashboardMetrics(metrics);
      })
      .catch(error => {
        if (!cancelled) setDashboardError(error instanceof Error ? error.message : 'Não foi possível carregar o dashboard.');
      })
      .finally(() => {
        if (!cancelled) setDashboardLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeRestaurantId, analyticsPeriod, canUseAnalytics, currentUser.role, orders]);

  const totalRevenue = dashboardMetrics?.revenue ?? 0;
  const activeOrdersVal = dashboardMetrics
    ? dashboardMetrics.pendingOrders
    : orders.filter(o => o.status !== 'entregue').length;
  const selectedTableSlug = toSlug(selectedQRTable);
  const restaurantSlug = restaurantConfig.slug ?? toSlug(restaurantConfig.name || activeRestaurantId);
  const publicTableUrl = `${window.location.origin}/r/${restaurantSlug}/${selectedTableSlug}`;

  useEffect(() => {
    if (tables.length > 0 && !tables.includes(selectedQRTable)) setSelectedQRTable(tables[0]);
  }, [selectedQRTable, tables]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedQRTable || !restaurantSlug) return;
    setQrError(null);
    QRCode.toDataURL(publicTableUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#020617', light: '#ffffff' },
      errorCorrectionLevel: 'M'
    })
      .then(dataUrl => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(error => {
        if (!cancelled) setQrError(error instanceof Error ? error.message : 'Não foi possível gerar o QR Code.');
      });
    return () => {
      cancelled = true;
    };
  }, [publicTableUrl, restaurantSlug, selectedQRTable]);

  const copyPublicTableUrl = async () => {
    await navigator.clipboard.writeText(publicTableUrl);
    setAdminError(null);
  };

  const downloadQrCode = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `fluxmenu-${restaurantSlug}-${selectedTableSlug}.png`;
    link.click();
  };

  // Handle Catalog Toggles
  const runAdminAction = async (loadingKey: string, action: () => Promise<void>) => {
    setAdminError(null);
    setAdminLoading(loadingKey);
    try {
      await action();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'Não foi possível concluir a operação.');
    } finally {
      setAdminLoading(null);
    }
  };

  useEffect(() => {
    return () => {
      if (newImagePreview.startsWith('blob:')) URL.revokeObjectURL(newImagePreview);
    };
  }, [newImagePreview]);

  const resetNewProductForm = () => {
    setNewName('');
    setNewPrice(0);
    setNewDesc('');
    setNewPrep(15);
    setNewImageFile(null);
    setNewImagePreview('');
  };

  const closeAddProductForm = () => {
    resetNewProductForm();
    setIsAddFormOpen(false);
  };

  const handleNewProductImageSelect = (file?: File | null) => {
    if (!file) return;
    setAdminError(null);
    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditingProductOriginalImage(product.image || '');
  };

  const closeEditProduct = () => {
    setEditingProduct(null);
    setEditingProductOriginalImage('');
  };

  const handleEditProductImageUpload = async (file?: File | null) => {
    if (!file || !editingProduct) return;
    await runAdminAction('edit-product-image', async () => {
      const imageUrl = await ProductImageService.uploadProductImage(activeRestaurantId, editingProduct.id, file);
      setEditingProduct(prev => prev ? { ...prev, image: imageUrl } : prev);
    });
  };

  const handleRemoveEditingProductImage = () => {
    if (!editingProduct) return;
    setEditingProduct({ ...editingProduct, image: '' });
  };

  const handleToggleAvailability = (prod: Product) => {
    void runAdminAction('product-' + prod.id, () => updateProduct({
      ...prod,
      available: prod.available === false ? true : false
    }));
  };

  const handleEditProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    await runAdminAction('edit-product', async () => {
      const previousImage = editingProductOriginalImage;
      const savedProduct = await updateProduct(editingProduct);
      if (!savedProduct) throw new Error('Produto não foi salvo.');
      if (previousImage && previousImage !== savedProduct.image) {
        await ProductImageService.deleteProductImageUrl(activeRestaurantId, savedProduct.id, previousImage).catch(() => undefined);
      }
      closeEditProduct();
    });
  };

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return setAdminError('Nome do produto é obrigatório.');
    if (!newDesc.trim()) return setAdminError('Descrição do produto é obrigatória.');
    if (!newCategory) return setAdminError('Categoria é obrigatória.');
    if (newPrice <= 0) return setAdminError('Preço precisa ser maior que zero.');
    await runAdminAction('add-product', async () => {
      const createdProduct = await addProduct({
        name: newName,
        price: Number(newPrice),
        description: newDesc,
        category: newCategory as any,
        prepTimeMinutes: Number(newPrep),
        image: '',
        available: true
      });
      if (!createdProduct) throw new Error('Produto não foi criado.');

      if (newImageFile) {
        const imageUrl = await ProductImageService.uploadProductImage(activeRestaurantId, createdProduct.id, newImageFile);
        const savedProduct = await updateProduct({ ...createdProduct, image: imageUrl });
        if (!savedProduct) throw new Error('Imagem enviada, mas não foi possível salvar o produto.');
      }

      resetNewProductForm();
      setIsAddFormOpen(false);
    });
  };

  const handleAddCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return setAdminError('Nome da categoria é obrigatório.');
    await runAdminAction('add-category', async () => {
      await addCategory(newCategoryName);
      setNewCategoryName('');
    });
  };

  const handleEditCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    await runAdminAction('edit-category', async () => {
      await updateCategory(editingCategory);
      setEditingCategory(null);
    });
  };

  const handleAddTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNameInput.trim()) return;
    await runAdminAction('add-table', async () => {
      await addTable(newTableNameInput.trim());
      await reloadTables();
      setNewTableNameInput('');
    });
  };

  const handleUpdateTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable?.id || !editingTable.label.trim()) return;
    await runAdminAction('edit-table-' + editingTable.id, async () => {
      await updateTable(editingTable.id!, editingTable.label.trim());
      await reloadTables();
      setEditingTable(null);
    });
  };

  const handleDeleteTable = async (table: RestaurantTable) => {
    await runAdminAction('delete-table-' + (table.id ?? table.label), async () => {
      await deleteTable(table.label, table.id);
      await reloadTables();
    });
  };

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return setStaffError('Informe o email do funcionário.');
    setStaffError(null);
    if (!canUseFeature('multi_user_rbac')) return setStaffError('Gestão de equipe está disponível a partir do plano Pro.');
    if (!staffLimitDecision.allowed) return setStaffError(staffLimitDecision.message ?? 'Limite de usuários atingido para o plano atual.');
    setStaffLoading(true);
    try {
      const result = await StaffService.inviteStaff(activeRestaurantId, inviteEmail, inviteRole, currentUser.role, currentUser.email);
      const manualLink = result.manualLink ?? null;
      setInviteEmail('');
      setInviteRole('waiter');
      await reloadStaff();
      setStaffSuccess(result.message);
      setStaffInviteLink(manualLink);
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : 'Não foi possível convidar funcionário.');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleStaffRoleChange = async (member: StaffService.StaffMember, role: UserRole) => {
    if (member.role === 'owner') return setStaffError('O dono da conta não pode ser alterado por esta tela.');
    setStaffLoading(true);
    setStaffError(null);
    try {
      await StaffService.updateStaffRole(activeRestaurantId, member.id, role, currentUser.role);
      await reloadStaff();
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : 'Não foi possível alterar permissão.');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleStaffActiveChange = async (member: StaffService.StaffMember, active: boolean) => {
    if (member.role === 'owner') return setStaffError('O dono da conta não pode ser desativado por esta tela.');
    setStaffLoading(true);
    setStaffError(null);
    try {
      await StaffService.setStaffActive(activeRestaurantId, member.id, active, currentUser.role, member.role);
      await reloadStaff();
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : 'Não foi possível atualizar funcionário.');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleStaffRemove = async (member: StaffService.StaffMember) => {
    if (member.role === 'owner') return setStaffError('O dono da conta não pode ser removido por esta tela.');
    const confirmed = window.confirm('Remover este funcionário da loja? Ele perderá o acesso imediatamente.');
    if (!confirmed) return;
    setStaffLoading(true);
    setStaffError(null);
    try {
      await StaffService.removeStaffMember(activeRestaurantId, member, currentUser.role);
      await reloadStaff();
      setStaffSuccess('Funcionário removido da loja.');
    } catch (error) {
      setStaffError(error instanceof Error ? error.message : 'Não foi possível remover funcionário.');
    } finally {
      setStaffLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsError(null);
    setSettingsSuccess(null);
    if (!settingsDraft.name.trim()) {
      setSettingsError('Nome oficial da loja é obrigatório.');
      return;
    }
    setSettingsLoading('settings');
    try {
      const normalizedOpeningHours = normalizeOpeningHours(settingsDraft);
      await setRestaurantConfig({ ...settingsDraft, openingHours: normalizedOpeningHours });
      setSettingsDraft(prev => ({ ...prev, openingHours: normalizedOpeningHours }));
      setSettingsSuccess('Configurações da loja salvas com sucesso.');
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Não foi possível salvar configurações.');
    } finally {
      setSettingsLoading(null);
    }
  };

  const handleAssetUpload = async (kind: 'logo' | 'banner', file: File | null) => {
    if (!file) return;
    setSettingsError(null);
    setSettingsSuccess(null);
    setSettingsLoading(kind);
    try {
      const url = await AssetService.uploadRestaurantAsset(activeRestaurantId, kind, file);
      setSettingsDraft(prev => ({ ...prev, [kind === 'logo' ? 'logoUrl' : 'bannerUrl']: url }));
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Não foi possível enviar imagem.');
    } finally {
      setSettingsLoading(null);
    }
  };

  const runBillingAction = async (loadingKey: string, action: () => Promise<void>) => {
    setBillingError(null);
    setBillingLoading(loadingKey);
    try {
      await action();
      await refreshBilling();
    } catch (error) {
      setBillingError(error instanceof Error ? error.message : 'Não foi possível atualizar assinatura.');
    } finally {
      setBillingLoading(null);
    }
  };


  const billingRoleAllowed = canViewBilling;
  const normalizedBillingCpfCnpj = billingCpfCnpj.replace(/\D/g, '');

  const requireBillingCpfCnpj = (): string | null => {
    if (billingCustomer.hasCpfCnpj && !normalizedBillingCpfCnpj) return null;
    if (normalizedBillingCpfCnpj.length === 11 || normalizedBillingCpfCnpj.length === 14) return normalizedBillingCpfCnpj;
    setBillingError('Informe um CPF ou CNPJ válido para criar a assinatura no Asaas.');
    return null;
  };

  const handleSelectPlan = (planId: 'starter' | 'pro' | 'premium') => {
    void runBillingAction('plan-' + planId, async () => {
      const cpfCnpj = currentSubscription?.status !== 'canceled' && currentSubscription ? (normalizedBillingCpfCnpj || undefined) : requireBillingCpfCnpj();
      if (cpfCnpj === null) return;
      if (currentSubscription) await BillingService.changeSubscriptionPlan(activeRestaurantId, planId, { name: currentUser.name, email: currentUser.email, cpfCnpj });
      else await BillingService.createSubscription(activeRestaurantId, planId, { name: currentUser.name, email: currentUser.email, cpfCnpj });
    });
  };

  const handleCancelSubscription = () => {
    void runBillingAction('cancel', async () => {
      await BillingService.cancelSubscription(activeRestaurantId);
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in" id="admin-panel-container">
      
      {/* Top dashboard summary header banner */}
      <div className="bg-white p-6 border-b border-slate-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center shrink-0">
        <div>
          <h2 className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="p-1 px-1.5 rounded-md bg-slate-950 text-white font-mono text-[9px] uppercase font-black">Portal</span>
            {canRemoveBranding ? 'Dashboard' : 'FluxMenu Dashboard'}
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
            Configurações Administrativas do Cardápio, Preços e Lojas
          </p>
        </div>

        {/* Core metrics cards - Cores Fortes */}
        {canUseAnalytics ? (
          <div className="flex gap-4 flex-wrap w-full md:w-auto">
            <div className="bg-emerald-600 p-3.5 rounded-xl border border-emerald-700 flex items-center gap-3 shrink-0 flex-1 md:flex-initial text-white shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-black text-emerald-100 block leading-none">Faturamento (Entregues)</span>
                <span className="text-xs font-black font-mono mt-1 block">
                  {totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 flex items-center gap-3 shrink-0 flex-1 md:flex-initial text-white shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-black text-slate-300 block leading-none">Pedidos em Produção</span>
                <span className="text-xs font-black font-mono mt-1 block">
                  {activeOrdersVal}
                </span>
              </div>
            </div>
          </div>
        ) : canViewBilling ? (
          <button onClick={() => showUpgradeNotice('Analytics')} className="w-full md:w-auto text-left cursor-pointer">
            <UpgradeNotice title="Analytics bloqueado" description="Métricas e relatórios estão disponíveis a partir do plano Pro." />
          </button>
        ) : (
          <div className="w-full md:w-auto">
            <UpgradeNotice title="Analytics indisponível" description="Métricas avançadas dependem do plano contratado pelo dono da conta." />
          </div>
        )}
      </div>

      {/* Primary Sub Tabs Row - Vermelho no Rosa */}
      <div className="bg-white px-6 border-b border-slate-100 flex gap-4 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`py-4 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
            activeTab === 'dashboard'
              ? 'border-red-600 text-red-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-dashboard"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Dashboard
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`py-4 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
            activeTab === 'catalog'
              ? 'border-red-600 text-red-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-catalog"
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          Gerenciar Cardápio
        </button>

        <button
          onClick={() => setActiveTab('tables')}
          className={`py-4 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
            activeTab === 'tables'
              ? 'border-red-600 text-red-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-tables"
        >
          <QrCode className="w-3.5 h-3.5" />
          Configurar Mesas
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`py-4 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
            activeTab === 'staff'
              ? 'border-red-600 text-red-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-staff"
        >
          <Users className="w-3.5 h-3.5" />
          Equipe
        </button>

        {canViewBilling && (
          <button
            onClick={() => setActiveTab('subscription')}
            className={`py-4 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
              activeTab === 'subscription'
                ? 'border-red-600 text-red-650'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="admin-tab-subscription"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Assinatura
          </button>
        )}

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-4 text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 relative border-b-2 cursor-pointer select-none ${
            activeTab === 'settings'
              ? 'border-red-600 text-red-650'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          id="admin-tab-settings"
        >
          <Settings className="w-3.5 h-3.5" />
          Cadastro da Loja
        </button>
      </div>

      {/* Main workspace section viewport */}
      <div className="flex-1 overflow-y-auto p-6">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {!canUseAnalytics ? (
              canViewBilling ? (
                <button onClick={() => showUpgradeNotice('Analytics')} className="w-full text-left cursor-pointer">
                  <UpgradeNotice title="Analytics bloqueado" description="Dashboard operacional e vendas reais estão disponíveis a partir do plano Pro." />
                </button>
              ) : (
                <div className="w-full">
                  <UpgradeNotice title="Analytics indisponível" description="Dashboard financeiro depende do plano contratado pelo dono da conta." />
                </div>
              )
            ) : currentUser.role === 'kitchen' ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 text-xs font-bold text-slate-500">
                Seu perfil não possui acesso a dados financeiros.
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/65">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Operação e Vendas</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Dados do restaurante ativo, com acesso isolado por perfil.</p>
                  </div>
                  <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    {[
                      ['today', 'Hoje'],
                      ['7d', '7 dias'],
                      ['30d', '30 dias']
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setAnalyticsPeriod(value as AnalyticsPeriod)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition ${
                          analyticsPeriod === value ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {dashboardLoading && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 text-xs font-black text-slate-500 uppercase">
                    Carregando dashboard...
                  </div>
                )}

                {dashboardError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs font-bold text-red-700">
                    {dashboardError}
                  </div>
                )}

                {!dashboardLoading && !dashboardError && dashboardMetrics && dashboardMetrics.totalOrders === 0 && dashboardMetrics.revenue === 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                    <h4 className="text-sm font-black text-slate-900 uppercase">Sem dados no período</h4>
                    <p className="text-xs text-slate-500 mt-1">Crie pedidos e feche mesas para alimentar este dashboard.</p>
                  </div>
                )}

                {dashboardMetrics && !dashboardError && (
                  <>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                      {[
                        ['Faturamento', dashboardMetrics.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), DollarSign, 'bg-emerald-600 border-emerald-700'],
                        ['Pedidos', dashboardMetrics.totalOrders.toString(), Receipt, 'bg-slate-950 border-slate-900'],
                        ['Ticket Médio', dashboardMetrics.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), Tag, 'bg-amber-600 border-amber-700'],
                        ['Mesas Abertas', dashboardMetrics.openTables.toString(), Layers, 'bg-red-600 border-red-700']
                      ].map(([label, value, Icon, color]) => (
                        <div key={String(label)} className={`${color} p-4 rounded-xl border text-white shadow-sm flex items-center gap-3`}>
                          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-[9px] uppercase font-black text-white/75 block">{label}</span>
                            <span className="text-sm font-black font-mono block truncate">{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200/65 p-5">
                        <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider mb-4">Produtos Mais Vendidos</h4>
                        {dashboardMetrics.topProducts.length === 0 ? (
                          <p className="text-xs text-slate-400 font-bold">Nenhum produto vendido no período.</p>
                        ) : (
                          <div className="space-y-3">
                            {dashboardMetrics.topProducts.map(product => (
                              <div key={product.productId} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                <div className="min-w-0">
                                  <span className="text-xs font-black text-slate-900 block truncate">{product.name}</span>
                                  <span className="text-[10px] text-slate-500 font-bold">{product.quantity} unidades vendidas</span>
                                </div>
                                <span className="text-xs font-black font-mono text-slate-950 shrink-0">
                                  {product.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200/65 p-5 space-y-3">
                        <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Status Operacional</h4>
                        {[
                          ['Em preparo', dashboardMetrics.preparingOrders],
                          ['Pagos', dashboardMetrics.paidOrders],
                          ['Pendentes', dashboardMetrics.pendingOrders],
                          ['Mesas cadastradas', dashboardMetrics.activeTables],
                          ['Produtos ativos', dashboardMetrics.activeProducts]
                        ].map(([label, value]) => (
                          <div key={String(label)} className="flex justify-between items-center text-xs border-b border-slate-100 pb-2 last:border-0">
                            <span className="font-bold text-slate-500">{label}</span>
                            <span className="font-black font-mono text-slate-950">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: CARDÁPIO */}
        {activeTab === 'catalog' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200/65">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Catálogo Geral</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Configure preços, mude status ativo/recolhido e adicione especialidades.</p>
              </div>

              {/* Vermelho no Rosa e Forte */}
              <button
                onClick={() => { resetNewProductForm(); setIsAddFormOpen(true); }}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition select-none tracking-wide"
                id="admin-btn-add-product"
              >
                <PlusCircle className="w-4 h-4" />
                Novidade
              </button>
            </div>

            {adminError && (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold">
                {adminError}
              </div>
            )}

            <div className="bg-white p-4 rounded-xl border border-slate-200/65 space-y-3">
              <div className="flex flex-col md:flex-row md:items-end gap-3 justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Categorias</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Organize os grupos que aparecem no cardápio.</p>
                </div>
                <form onSubmit={handleAddCategorySubmit} className="flex gap-2 w-full md:w-auto">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nova categoria"
                    className="flex-1 md:w-52 p-2 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-semibold bg-slate-50"
                  />
                  <button
                    type="submit"
                    disabled={adminLoading === 'add-category'}
                    className="px-3.5 bg-slate-950 hover:bg-slate-855 disabled:opacity-60 text-white font-black text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    {adminLoading === 'add-category' ? 'Salvando...' : 'Adicionar'}
                  </button>
                </form>
              </div>

              <div className="flex flex-wrap gap-2">
                {productCategories.map(category => (
                  <div key={category.id} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                    {editingCategory?.id === category.id ? (
                      <form onSubmit={handleEditCategorySubmit} className="flex items-center gap-1">
                        <input
                          value={editingCategory.label}
                          onChange={(e) => setEditingCategory({ ...editingCategory, label: e.target.value })}
                          className="w-32 p-1 border border-slate-200 rounded text-[10px] font-bold"
                          autoFocus
                        />
                        <button type="submit" disabled={adminLoading === 'edit-category'} className="p-1 text-emerald-700 hover:bg-emerald-50 rounded">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <button onClick={() => setEditingCategory(category)} className="text-[10px] font-black uppercase text-slate-800">
                          {category.label}
                        </button>
                        <button
                          onClick={() => void runAdminAction('delete-category-' + category.id, () => deleteCategory(category))}
                          disabled={adminLoading === 'delete-category-' + category.id}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                          title="Remover categoria"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* List products catalog in columns or clean row list */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto border border-slate-150 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="p-4">Foto / Produto</th>
                      <th className="p-4">Preço BRL</th>
                      <th className="p-4">Categoria</th>
                      <th className="p-4">Preparo</th>
                      <th className="p-4">Disponibilidade</th>
                      <th className="p-4 text-right">Controles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-705">
                    {products.map(prod => (
                      <tr key={prod.id} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="p-4 flex items-center gap-3">
                          {prod.image ? (
                            <img
                              src={prod.image}
                              alt={prod.name}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              decoding="async"
                              className="w-10 h-10 rounded-lg object-cover bg-slate-105 border border-slate-200 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 shadow-xs shrink-0 flex items-center justify-center text-slate-350">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                          <div>
                            <span className="font-extrabold text-slate-900 block">{prod.name}</span>
                            <span className="text-[10px] text-slate-450 leading-none truncate max-w-[200px] block mt-1 font-semibold">
                              {prod.description}
                            </span>
                          </div>
                        </td>

                        <td className="p-4 font-mono font-black text-slate-900">
                          {prod.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>

                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-900 text-white uppercase font-black tracking-widest text-[8px]">
                            {prod.category}
                          </span>
                        </td>

                        <td className="p-4 font-mono font-bold text-slate-600">
                          <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{prod.prepTimeMinutes} min</span>
                        </td>

                        <td className="p-4">
                          {/* Cores Fortes */}
                          <button
                            onClick={() => handleToggleAvailability(prod)}
                            disabled={adminLoading === 'product-' + prod.id}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition flex items-center gap-1 cursor-pointer select-none border disabled:opacity-60 ${
                              prod.available !== false
                                ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-xs'
                                : 'bg-slate-100 text-slate-400 border-slate-250 hover:bg-slate-200'
                            }`}
                            id={`toggle-available-${prod.id}`}
                          >
                            {prod.available !== false ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                Visível
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                Ocultado
                              </>
                            )}
                          </button>
                        </td>

                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => openEditProduct(prod)}
                            className="px-2.5 py-1 border border-slate-250 hover:border-slate-300 rounded text-[10px] font-bold text-slate-600 hover:text-slate-800 bg-white cursor-pointer transition select-none active:scale-95"
                            id={`edit-prod-btn-${prod.id}`}
                          >
                            Editar
                          </button>

                          {/* Vermelho no Rosa */}
                          <button
                            onClick={() => void runAdminAction('delete-product-' + prod.id, () => deleteProduct(prod.id))}
                            className="p-1 px-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded cursor-pointer transition select-none inline-block align-middle active:scale-90"
                            id={`delete-prod-btn-${prod.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONFIGURAR MESAS E QR CODE */}
        {activeTab === 'tables' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-4 lg:col-span-1">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Mesas</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Crie e organize as mesas usadas nos QR Codes.</p>
              </div>

              {adminError && <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold">{adminError}</div>}

              <form onSubmit={handleAddTableSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Exemplo: Mesa 10"
                  value={newTableNameInput}
                  onChange={(e) => setNewTableNameInput(e.target.value)}
                  maxLength={32}
                  disabled={!canManageTables}
                  className="flex-1 p-2 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 placeholder-slate-400 font-semibold bg-slate-50 disabled:opacity-60"
                  id="table-add-input"
                />
                <button
                  type="submit"
                  disabled={!canManageTables || adminLoading === 'add-table'}
                  className="px-3.5 bg-slate-950 hover:bg-slate-855 disabled:opacity-60 text-white font-black text-xs rounded-lg transition active:scale-95 flex items-center gap-1 cursor-pointer select-none"
                  id="table-add-btn-submit"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {adminLoading === 'add-table' ? '...' : '+'}
                </button>
              </form>

              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                {tableRecords.map(table => (
                  <div key={table.id ?? table.label} className="py-2.5 text-xs font-bold text-slate-850">
                    {editingTable?.id === table.id ? (
                      <form onSubmit={handleUpdateTableSubmit} className="flex items-center gap-2">
                        <input
                          value={editingTable.label}
                          onChange={(e) => setEditingTable({ ...editingTable, label: e.target.value })}
                          className="flex-1 p-2 border border-slate-200 rounded-lg text-xs font-bold"
                          autoFocus
                        />
                        <button type="submit" disabled={adminLoading === 'edit-table-' + table.id} className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg disabled:opacity-60">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => setEditingTable(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <button onClick={() => setEditingTable(table)} disabled={!canManageTables} className="uppercase text-slate-900 font-extrabold font-display disabled:cursor-not-allowed">
                          {table.label}
                        </button>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedQRTable(table.label)} className="text-slate-400 hover:text-slate-950 p-1 rounded hover:bg-slate-100 transition cursor-pointer" title="Gerar QR Code">
                            <QrCode className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => void handleDeleteTable(table)} disabled={!canManageTables || adminLoading === 'delete-table-' + (table.id ?? table.label)} className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition cursor-pointer disabled:opacity-40">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {tableRecords.length === 0 && <p className="py-4 text-xs text-slate-400 font-bold">Nenhuma mesa cadastrada.</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-4 lg:col-span-2">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">QR Code de Autoatendimento</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Link público preservado para clientes, sem exigir login.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase leading-none">Mesa alvo</label>
                    <select value={selectedQRTable} onChange={(e) => setSelectedQRTable(e.target.value)} className="w-full text-xs font-bold border border-slate-250 rounded-lg p-2.5 outline-hidden focus:border-red-650 cursor-pointer text-slate-800 bg-white" id="qr-table-select-target">
                      {tableRecords.filter(table => table.active !== false).map(t => <option key={t.id ?? t.label} value={t.label}>{t.label}</option>)}
                    </select>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-100 border text-[10.5px] leading-relaxed text-slate-500 space-y-2 font-semibold">
                    <p><strong>Link de acesso por QR:</strong></p>
                    <a href={publicTableUrl} target="_blank" rel="noopener noreferrer" className="text-[9.5px] block p-2 bg-white hover:bg-slate-50 rounded border select-all truncate font-mono text-red-650 font-black uppercase underline decoration-red-600/30 transition hover:text-red-750 cursor-pointer" title="Clique para abrir o cardápio desta mesa em uma nova aba">
                      {publicTableUrl}
                    </a>
                  </div>
                </div>

                <div className="p-6 bg-black rounded-2xl flex flex-col items-center text-center shadow-xl select-none border border-slate-800">
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-500 leading-none mb-1">FluxMenu • {restaurantConfig.name}</span>
                  <span className="text-xl font-black uppercase text-white font-display tracking-wide mb-3">{selectedQRTable}</span>
                  <div className="p-4 bg-white rounded-xl shadow-md flex items-center justify-center shrink-0">
                    {qrDataUrl ? <img src={qrDataUrl} alt={`QR Code ${selectedQRTable}`} className="w-28 h-28 object-contain" /> : <div className="w-28 h-28 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">Gerando</div>}
                  </div>
                  {qrError && <span className="text-[9.5px] text-red-400 leading-relaxed font-bold mt-3 max-w-[180px]">{qrError}</span>}
                  <span className="text-[9.5px] text-slate-400 leading-relaxed font-bold mt-3 max-w-[180px] break-all">{publicTableUrl}</span>
                  <div className="grid grid-cols-2 gap-2 w-full mt-4">
                    <button onClick={() => void copyPublicTableUrl()} className="h-9 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"><Copy className="w-3.5 h-3.5" />Copiar</button>
                    <button onClick={downloadQrCode} disabled={!qrDataUrl} className="h-9 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-[10px] font-black uppercase transition flex items-center justify-center gap-1.5 cursor-pointer"><Download className="w-3.5 h-3.5" />PNG</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: FUNCIONARIOS */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Funcionários e Permissões</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Controle quem acessa cozinha, caixa, atendimento e gestão.</p>
                </div>
                {staffLoading && <span className="text-[10px] font-black uppercase text-slate-400">Carregando...</span>}
              </div>

              {!canManageStaff && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">Seu perfil não pode gerenciar funcionários.</div>}
              {!canUseFeature('multi_user_rbac') && canManageStaff && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">{canViewBilling ? 'Gestão de equipe está disponível a partir do plano Pro.' : 'Gestão de equipe depende do plano contratado pelo dono da conta.'}</div>}
              {canUseFeature('multi_user_rbac') && canManageStaff && !staffLimitDecision.allowed && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">{canViewBilling ? staffLimitDecision.message : 'Limite de funcionários atingido. Peça ao dono da conta para revisar o plano.'}</div>}
              {staffError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">{staffError}</div>}
              {staffSuccess && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">{staffSuccess}</div>}
              {staffInviteLink && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold space-y-2"><p>Link do convite. Envie manualmente se o email não chegar em alguns minutos:</p><a href={staffInviteLink} target="_blank" rel="noopener noreferrer" className="block break-all rounded-lg bg-white border border-amber-200 p-2 text-[10px] text-slate-800 underline">{staffInviteLink}</a></div>}

              <form onSubmit={handleInviteStaff} className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-2">
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" placeholder="email@restaurante.com" disabled={!canInviteStaff || staffLoading} className="p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-semibold bg-slate-50 disabled:opacity-60" />
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as UserRole)} disabled={!canInviteStaff || staffLoading} className="p-2.5 border border-slate-200 rounded-lg text-xs font-bold bg-white disabled:opacity-60">
                  {assignableRoles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}
                </select>
                <button type="submit" disabled={!canInviteStaff || staffLoading || assignableRoles.length === 0} className="h-10 px-4 rounded-lg bg-slate-950 text-white text-xs font-black uppercase flex items-center justify-center gap-2 disabled:opacity-60">
                  <UserPlus className="w-3.5 h-3.5" /> Convidar
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/70 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <tr><th className="p-4">Usuário</th><th className="p-4">Permissão</th><th className="p-4">Status</th><th className="p-4 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffMembers.map(member => (
                      <tr key={member.id}>
                        <td className="p-4"><span className="font-black text-slate-900 block">{member.name}</span><span className="text-[10px] text-slate-400 font-bold">{member.email || member.profileId}</span></td>
                        <td className="p-4">
                          {member.role === 'owner' ? <span className="font-black uppercase text-red-650">Dono</span> : (
                            <select value={member.role} onChange={(e) => void handleStaffRoleChange(member, e.target.value as UserRole)} disabled={!canManageStaff || staffLoading || !assignableRoles.includes(member.role)} className="p-2 border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-60">
                              {assignableRoles.map(role => <option key={role} value={role}>{roleLabels[role]}</option>)}
                            </select>
                          )}
                        </td>
                        <td className="p-4"><span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${member.active ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{member.active ? 'ativo' : 'inativo'}</span></td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => void handleStaffActiveChange(member, !member.active)} disabled={!canManageStaff || member.role === 'owner' || (currentUser.role === 'manager' && member.role === 'manager') || staffLoading} className="px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black uppercase text-slate-600 hover:text-red-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                              <Power className="w-3.5 h-3.5 inline mr-1" /> {member.active ? 'Desativar' : 'Ativar'}
                            </button>
                            {member.role !== 'owner' && (
                              <button onClick={() => void handleStaffRemove(member)} disabled={!canManageStaff || (currentUser.role === 'manager' && member.role === 'manager') || staffLoading} className="px-3 py-1.5 rounded-lg border border-red-200 text-[10px] font-black uppercase text-red-700 hover:bg-red-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed">
                                Remover
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {staffMembers.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-xs text-slate-400 font-bold">Nenhum funcionário encontrado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-3">
              <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Convites</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {staffInvitations.map(invitation => (
                  <div key={invitation.id} className="border border-slate-200 rounded-xl p-3 bg-white shadow-xs flex flex-col gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-black text-slate-900 block truncate">{invitation.email}</span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-[9px] font-black uppercase">{roleLabels[invitation.role]}</span>
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${invitation.status === 'pending' ? 'bg-amber-50 text-amber-800 border border-amber-200' : invitation.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{invitationStatusLabels[invitation.status] ?? invitation.status}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {invitation.status === 'pending' && <button onClick={() => void StaffService.revokeInvitation(activeRestaurantId, invitation.id).then(reloadStaff).catch(error => setStaffError(error instanceof Error ? error.message : 'Não foi possível revogar convite.'))} className="h-8 w-max rounded-lg border border-red-200 px-3 text-[10px] font-black uppercase text-red-650 hover:bg-red-50 cursor-pointer">Revogar convite</button>}
                      {invitation.status !== 'pending' && <button onClick={() => void StaffService.clearInvitation(activeRestaurantId, invitation.id).then(reloadStaff).catch(error => setStaffError(error instanceof Error ? error.message : 'Não foi possível limpar convite.'))} className="h-8 w-max rounded-lg border border-slate-200 px-3 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 cursor-pointer">Limpar</button>}
                    </div>
                  </div>
                ))}
                {staffInvitations.length === 0 && <p className="text-xs text-slate-400 font-bold">Nenhum convite criado.</p>}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: ASSINATURA */}
        {canViewBilling && activeTab === 'subscription' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-slate-200/70 p-5 xl:col-span-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Assinatura</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Acompanhe plano, pagamento e histórico de cobranças.</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${currentSubscription?.status === 'past_due' ? 'bg-red-600 text-white' : currentSubscription?.status === 'canceled' ? 'bg-slate-200 text-slate-600' : 'bg-emerald-600 text-white'}`}>
                    {statusLabel(currentSubscription?.status)}
                  </span>
                </div>

                {billingError && <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">{billingError}</div>}
                {currentSubscription?.status === 'past_due' && <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">Pagamento pendente: o painel fica bloqueado até a confirmação automática.</div>}

                <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-slate-500">CPF/CNPJ para cobrança</label>
                  <input
                    value={billingCpfCnpj}
                    onChange={(e) => setBillingCpfCnpj(e.target.value)}
                    placeholder={billingCustomer.cpfCnpjMasked ?? 'Digite CPF ou CNPJ'}
                    disabled={!billingRoleAllowed || billingLoading !== null}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-bold text-slate-800 disabled:opacity-60"
                  />
                  <p className="text-[10px] text-slate-500 font-bold">{billingCustomer.hasCpfCnpj ? 'Documento fiscal salvo: ' + (billingCustomer.cpfCnpjMasked ?? 'cadastrado') + '. Preencha novamente apenas se quiser atualizar.' : 'Obrigatório para criar cobrança.'}</p>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.values(SAAS_PLANS).map(plan => {
                    const isCurrent = currentPlanId === plan.id;
                    return (
                      <div key={plan.id} className={`border rounded-xl p-4 ${isCurrent ? 'border-red-600 bg-red-50/40' : 'border-slate-200 bg-white'}`}>
                        <h5 className="text-sm font-black text-slate-900 uppercase">{plan.name}</h5>
                        <p className="text-xs font-black font-mono text-slate-700 mt-1">{plan.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês</p>
                        <button
                          onClick={() => handleSelectPlan(plan.id)}
                          disabled={!billingRoleAllowed || billingLoading !== null || (isCurrent && currentSubscription?.status !== 'canceled')}
                          className="mt-4 w-full h-9 rounded-lg bg-slate-950 text-white text-[10px] font-black uppercase disabled:opacity-50"
                        >
                          {billingLoading === 'plan-' + plan.id ? 'Processando...' : isCurrent ? 'Plano atual' : currentSubscription ? 'Alterar plano' : 'Assinar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Status</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="font-bold text-slate-500">Plano</span><span className="font-black text-slate-900">{currentPlan.name}</span></div>
                  {currentSubscription?.status === 'trialing' && <div className="flex justify-between border-b border-slate-100 pb-2"><span className="font-bold text-slate-500">Período grátis até</span><span className="font-black text-slate-900">{currentSubscription?.trialEndsAt?.slice(0, 10) ?? '-'}</span></div>}
                  <div className="flex justify-between border-b border-slate-100 pb-2"><span className="font-bold text-slate-500">Próximo vencimento</span><span className="font-black text-slate-900">{currentSubscription?.currentPeriodEnd?.slice(0, 10) ?? '-'}</span></div>
                </div>
                {currentSubscription?.checkoutUrl && <a href={currentSubscription.checkoutUrl} target="_blank" rel="noopener noreferrer" className="block h-9 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase text-center leading-9">Abrir cobrança</a>}
                <button onClick={handleCancelSubscription} disabled={!billingRoleAllowed || !currentSubscription || billingLoading !== null || currentSubscription.status === 'canceled'} className="w-full h-9 rounded-lg border border-red-200 text-red-600 text-[10px] font-black uppercase disabled:opacity-50">
                  {billingLoading === 'cancel' ? 'Cancelando...' : 'Cancelar assinatura'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/70 overflow-hidden">
              <div className="p-5 border-b border-slate-100"><h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Histórico de Cobrança</h4></div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 font-bold uppercase text-[9px] tracking-wider"><tr><th className="p-4">Cobrança</th><th className="p-4">Status</th><th className="p-4">Valor</th><th className="p-4">Vencimento</th><th className="p-4 text-right">Link</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {billingPayments.map(payment => <tr key={payment.id}><td className="p-4 font-bold text-slate-700">{friendlyPaymentCode(payment.providerPaymentId ?? payment.id)}</td><td className="p-4 font-black uppercase">{paymentStatusLabel(payment.status)}</td><td className="p-4 font-mono font-black">{payment.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="p-4 font-bold text-slate-500">{payment.dueDate ?? '-'}</td><td className="p-4 text-right">{payment.invoiceUrl ? <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-red-600 font-black uppercase text-[10px]">Abrir</a> : '-'}</td></tr>)}
                    {billingPayments.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-xs text-slate-400 font-bold">Nenhuma cobrança recebida ainda.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: RESTAURANT PROFILE CONFIGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl border border-slate-200/70 p-5 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Configurações Gerais da Loja</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Identidade, contato, imagens, cores e horários do cardápio público.</p>
              </div>
              <button onClick={() => void handleSaveSettings()} disabled={!canManageRestaurant || settingsLoading !== null} className="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-black uppercase flex items-center justify-center gap-2">
                <Save className="w-3.5 h-3.5" /> {settingsLoading === 'settings' ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

            {!canManageRestaurant && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">Seu perfil não pode editar a loja.</div>}
            {settingsError && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">{settingsError}</div>}
            {settingsSuccess && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">{settingsSuccess}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500">Nome público exibido</label><input value={settingsDraft.name} onChange={(e) => setSettingsDraft({ ...settingsDraft, name: e.target.value })} disabled={!canManageRestaurant} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-bold text-slate-800 disabled:opacity-60" /><p className="text-[10px] text-slate-450 font-semibold">O link público foi definido no cadastro. Para alterar o link, acione suporte.</p></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500">Telefone</label><input value={settingsDraft.phone ?? ''} onChange={(e) => setSettingsDraft({ ...settingsDraft, phone: e.target.value })} disabled={!canManageRestaurant} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-normal text-slate-705 disabled:opacity-60" /></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500">Endereço</label><input value={settingsDraft.address} onChange={(e) => setSettingsDraft({ ...settingsDraft, address: e.target.value })} disabled={!canManageRestaurant} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-normal text-slate-705 disabled:opacity-60" /></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500">Instagram</label><input value={settingsDraft.instagram} onChange={(e) => setSettingsDraft({ ...settingsDraft, instagram: e.target.value })} disabled={!canManageRestaurant} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-normal text-slate-705 disabled:opacity-60" /></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500">Tempo de entrega/preparo</label><input value={settingsDraft.deliveryEstimate} onChange={(e) => setSettingsDraft({ ...settingsDraft, deliveryEstimate: e.target.value })} disabled={!canManageRestaurant} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-normal text-slate-705 disabled:opacity-60" /></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500">Avaliação exibida</label><input value={settingsDraft.rating} onChange={(e) => setSettingsDraft({ ...settingsDraft, rating: e.target.value })} disabled={!canManageRestaurant} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 font-normal text-slate-705 disabled:opacity-60" /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-900"><ImageIcon className="w-4 h-4" />Logo</div>
                {settingsDraft.logoUrl ? <img src={settingsDraft.logoUrl} alt="Logo" className="w-20 h-20 object-cover rounded-xl border border-slate-200" /> : <div className="w-20 h-20 rounded-xl border border-dashed border-slate-250 bg-slate-50 flex items-center justify-center text-slate-350"><ImageIcon className="w-5 h-5" /></div>}
                <label className={`inline-flex h-9 w-max items-center justify-center rounded-lg px-3 text-[10px] font-black uppercase text-white ${!canManageRestaurant || settingsLoading === 'logo' ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-950 hover:bg-slate-800 cursor-pointer'}`}>
                  {settingsLoading === 'logo' ? 'Enviando logo...' : 'Enviar logo'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!canManageRestaurant || settingsLoading === 'logo'} onChange={(e) => void handleAssetUpload('logo', e.target.files?.[0] ?? null)} className="hidden" />
                </label>
                <p className="text-[10px] text-slate-400 font-semibold">Recomendado: 800x800 px. JPG, PNG ou WEBP.</p>
              </div>
              <div className="space-y-3 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-900"><ImageIcon className="w-4 h-4" />Banner</div>
                {settingsDraft.bannerUrl ? <img src={settingsDraft.bannerUrl} alt="Banner" className="w-full h-24 object-cover rounded-xl border border-slate-200" /> : <div className="w-full h-24 rounded-xl border border-dashed border-slate-250 bg-slate-50 flex items-center justify-center text-slate-350"><ImageIcon className="w-5 h-5" /></div>}
                <label className={`inline-flex h-9 w-max items-center justify-center rounded-lg px-3 text-[10px] font-black uppercase text-white ${!canManageRestaurant || settingsLoading === 'banner' ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-950 hover:bg-slate-800 cursor-pointer'}`}>
                  {settingsLoading === 'banner' ? 'Enviando banner...' : 'Enviar banner'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={!canManageRestaurant || settingsLoading === 'banner'} onChange={(e) => void handleAssetUpload('banner', e.target.files?.[0] ?? null)} className="hidden" />
                </label>
                <p className="text-[10px] text-slate-400 font-semibold">Recomendado: 1600x600 px. JPG, PNG ou WEBP.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Palette className="w-3.5 h-3.5" />Cor primária</label><input type="color" value={settingsDraft.primaryColor ?? '#dc2626'} onChange={(e) => setSettingsDraft({ ...settingsDraft, primaryColor: e.target.value })} disabled={!canManageRestaurant} className="w-full h-10 border border-slate-200 rounded-lg" /></div>
              <div className="space-y-1.5"><label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Palette className="w-3.5 h-3.5" />Cor secundária</label><input type="color" value={settingsDraft.secondaryColor ?? '#0f172a'} onChange={(e) => setSettingsDraft({ ...settingsDraft, secondaryColor: e.target.value })} disabled={!canManageRestaurant} className="w-full h-10 border border-slate-200 rounded-lg disabled:opacity-60" /></div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2"><Clock className="w-4 h-4" />Horários</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {weekDays.map(([key, label]) => {
                  const day = getOpeningDay(settingsDraft, key);
                  return (
                    <div key={key} className="space-y-2 rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] font-bold uppercase text-slate-500">{label}</label>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                          <input type="checkbox" checked={day.closed} disabled={!canManageRestaurant} onChange={(e) => updateOpeningDay(key, { closed: e.target.checked })} /> Fechado
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={day.open} onChange={(e) => updateOpeningDay(key, { open: e.target.value, closed: false })} placeholder="11:00" disabled={!canManageRestaurant || day.closed} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 disabled:opacity-60" />
                        <input value={day.close} onChange={(e) => updateOpeningDay(key, { close: e.target.value, closed: false })} placeholder="23:00" disabled={!canManageRestaurant || day.closed} className="w-full p-2.5 border border-slate-200 rounded-lg text-xs outline-hidden focus:border-red-600 disabled:opacity-60" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL EDIT ELEMENT FOR PRODUCTS CATALOG */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto" id="edit-prod-wrapper">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs" onClick={closeEditProduct} />
          <div className="flex min-h-full items-center justify-center p-4 animate-fade-in">
            <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <button
                onClick={closeEditProduct}
                className="absolute right-4 top-4 hover:bg-slate-100 text-slate-400 p-1.5 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4 border-b pb-2">
                Editar Detalhes do Prato
              </h4>

              <form onSubmit={handleEditProductSubmit} className="space-y-4 text-xs font-bold text-slate-755">
                <div className="space-y-1">
                  <label>Título do Prato / Bebida</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-black text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label>Preço Sugerido (BRL)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                      className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-bold text-slate-905 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label>Tempo Preparo (Min)</label>
                    <input
                      type="number"
                      required
                      value={editingProduct.prepTimeMinutes}
                      onChange={(e) => setEditingProduct({ ...editingProduct, prepTimeMinutes: Number(e.target.value) })}
                      className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-bold text-slate-905 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Categoria principal</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 text-slate-900"
                  >
                    {productCategories.map(category => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label>Imagem do produto</label>
                  <div
                    className="flex items-center gap-3 rounded-xl border border-dashed border-slate-250 bg-slate-50 p-3"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      void handleEditProductImageUpload(e.dataTransfer.files?.[0]);
                    }}
                  >
                    {editingProduct.image ? (
                      <img src={editingProduct.image} alt={editingProduct.name} className="h-16 w-16 rounded-lg object-cover border border-slate-200 bg-white" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-350">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <label className="inline-flex h-8 items-center rounded-lg bg-slate-950 px-3 text-[10px] font-black uppercase text-white cursor-pointer">
                          {adminLoading === 'edit-product-image' ? 'Enviando...' : 'Enviar imagem'}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={adminLoading === 'edit-product-image'}
                            className="hidden"
                            onChange={(e) => void handleEditProductImageUpload(e.target.files?.[0])}
                          />
                        </label>
                        {editingProduct.image && (
                          <button
                            type="button"
                            onClick={handleRemoveEditingProductImage}
                            className="h-8 rounded-lg border border-slate-250 px-3 text-[10px] font-black uppercase text-slate-600 hover:bg-white cursor-pointer"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] leading-tight text-slate-450 font-semibold">Recomendado: 1200x900 px. JPG, PNG ou WEBP. A imagem será comprimida antes do envio.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Ingredientes / Descrição comercial</label>
                  <textarea
                    required
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    rows={2}
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-normal text-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  disabled={adminLoading === 'edit-product'}
                  className="w-full h-11 bg-slate-950 disabled:opacity-60 hover:bg-slate-855 text-white rounded-xl text-xs font-black uppercase transition shrink-0 cursor-pointer"
                  id="edit-prod-submit-inner"
                >
                  {adminLoading === 'edit-product' ? 'Salvando...' : 'Confirmar Alterações'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADD ELEMENT FOR NEW CATALOG CARD */}
      {isAddFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" id="add-prod-wrapper-container">
          <div className="fixed inset-0 bg-black/45 backdrop-blur-xs animate-fade-in" onClick={closeAddProductForm} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={closeAddProductForm}
                className="absolute right-4 top-4 hover:bg-slate-100 text-slate-400 p-1.5 rounded-lg shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-4 border-b pb-2">
                Cadastrar Novo Item no Cardápio
              </h4>

              <form onSubmit={handleAddProductSubmit} className="space-y-4 text-xs font-bold text-slate-755">
                <div className="space-y-1">
                  <label>Nome do Prato / Bebida</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Moscow Mule da Casa"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-semibold"
                    id="add-prod-input-name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label>Preço sugerido (BRL)</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="38.50"
                      value={newPrice || ''}
                      onChange={(e) => setNewPrice(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-mono font-bold"
                      id="add-prod-input-price"
                    />
                  </div>

                  <div className="space-y-1">
                    <label>Preparo estimado (Min)</label>
                    <input
                      type="number"
                      required
                      placeholder="10"
                      value={newPrep || ''}
                      onChange={(e) => setNewPrep(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-mono"
                      id="add-prod-input-prep"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Categoria principal</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-bold font-black text-slate-900"
                    id="add-prod-select-category"
                  >
                    {productCategories.map(category => (
                      <option key={category.id} value={category.id}>{category.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label>Imagem do produto</label>
                  <div
                    className="rounded-xl border border-dashed border-slate-250 bg-slate-50 p-3"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleNewProductImageSelect(e.dataTransfer.files?.[0]);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {newImagePreview ? (
                        <img src={newImagePreview} alt="Prévia do produto" className="h-16 w-16 rounded-lg object-cover border border-slate-200 bg-white" />
                      ) : (
                        <div className="h-16 w-16 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-350">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex h-8 items-center rounded-lg bg-slate-950 px-3 text-[10px] font-black uppercase text-white cursor-pointer">
                            Selecionar imagem
                            <input
                              id="add-prod-input-image"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              onChange={(e) => handleNewProductImageSelect(e.target.files?.[0])}
                            />
                          </label>
                          {newImagePreview && (
                            <button
                              type="button"
                              onClick={() => { setNewImageFile(null); setNewImagePreview(''); }}
                              className="h-8 rounded-lg border border-slate-250 px-3 text-[10px] font-black uppercase text-slate-600 hover:bg-white cursor-pointer"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] leading-tight text-slate-450 font-semibold">Recomendado: 1200x900 px. JPG, PNG ou WEBP. A imagem será enviada após salvar o produto.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label>Ingredientes principais / Descrição comercial</label>
                  <textarea
                    required
                    placeholder="Descreva detalhes ou sabores..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 border border-slate-205 bg-slate-50 rounded-lg text-xs outline-hidden focus:border-red-650 font-normal text-slate-700"
                    id="add-prod-input-description"
                  />
                </div>

                {/* Vermelho no Rosa */}
                <button
                  type="submit"
                  disabled={adminLoading === 'add-product'}
                  className="w-full h-11 bg-red-600 disabled:opacity-60 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase transition shrink-0 cursor-pointer shadow-md"
                  id="add-prod-submit-form"
                >
                  {adminLoading === 'add-product' ? 'Salvando...' : 'Salvar Produto'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
