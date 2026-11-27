import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  Product, 
  Sale, 
  StockMovement, 
  Customer, 
  Supplier, 
  CashierShift, 
  CartItem, 
  ActiveTab, 
  PaymentMethod,
  PaymentDetails,
  PaymentSettings,
  MovementType,
  Category,
  SubscriptionState,
  CompanyAccount,
  SellerProfile,
  ExtendedTrialClient,
  BankProvider,
  UnitType
} from '../types';
import { sounds, formatCurrency, calculateNextDay5Expiry, formatDay5Date } from '../utils/pixHelper';
import confetti from 'canvas-confetti';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_SALES, 
  INITIAL_MOVEMENTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_SUPPLIERS,
  INITIAL_SHIFT,
  DEMO_PRODUCTS
} from '../data/mockDisposables';
import { syncStoreToServer } from '../utils/shareHelper';
import { CLIENT_APP_VERSION } from '../config/version';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface AppContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  customers: Customer[];
  suppliers: Supplier[];
  currentShift: CashierShift;
  cart: CartItem[];
  cartDiscount: number;
  selectedCustomerId: string;
  paymentSettings: PaymentSettings;
  updatePaymentSettings: (settings: Partial<PaymentSettings>) => void;
  sellers: SellerProfile[];
  activeSeller: SellerProfile;
  activeSellerId: string;
  setActiveSellerId: (id: string) => void;
  addSeller: (seller: Omit<SellerProfile, 'id'>) => SellerProfile;
  updateSeller: (id: string, data: Partial<SellerProfile>) => void;
  deleteSeller: (id: string) => boolean;
  isSellerWhatsappModalOpen: boolean;
  setIsSellerWhatsappModalOpen: (open: boolean) => void;
  
  // Cart Actions
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  setCartDiscount: (discount: number) => void;
  setSelectedCustomerId: (customerId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartTotal: number;
  cartItemCount: number;

  // Checkout Action
  completeSale: (paymentMethod: PaymentMethod, details?: PaymentDetails) => Sale | null;
  cancelSale: (saleId: string, reason?: string) => boolean;

  // Product & Inventory Actions
  addProduct: (productData: Omit<Product, 'id' | 'updatedAt'>) => Product;
  updateProduct: (id: string, productData: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addStockMovement: (
    productId: string, 
    type: MovementType, 
    quantity: number, 
    options?: { reason?: string; documentRef?: string; unitCost?: number; user?: string }
  ) => boolean;
  quickStockAdjustment: (productId: string, newStock: number, reason: string) => boolean;
  refreshStoreCatalog: () => Promise<boolean>;

  // Customer Actions
  addCustomer: (customerData: Omit<Customer, 'id' | 'totalPurchased'>) => Customer;
  updateCustomer: (id: string, customerData: Partial<Customer>) => void;

  // Supplier Actions
  addSupplier: (supplierData: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (id: string, supplierData: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  // Cashier Actions
  openCashier: (initialCash: number, operator: string) => void;
  closeCashier: (actualCash: number, notes?: string) => void;
  addCashMovement: (type: 'SUPRIMENTO' | 'SANGRIA', amount: number, reason: string) => void;

  // Modals & UI State
  receiptModalSale: Sale | null;
  setReceiptModalSale: (sale: Sale | null) => void;
  productModalProduct: Product | null | 'new';
  setProductModalProduct: (prod: Product | null | 'new') => void;
  stockModalProduct: Product | null;
  setStockModalProduct: (prod: Product | null) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: Category | 'ALL';
  setSelectedCategory: (cat: Category | 'ALL') => void;

  // Notification Toast
  toasts: Toast[];
  showToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  removeToast: (id: string) => void;

  // Reset & Client Handoff Actions
  resetAllData: () => void;
  clearAllForNewClient: () => void;
  loadDemoData: () => void;

  // Trial & Subscription (2 Days Free Trial -> R$ 94,98 • Vencimento Todo Dia 05)
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  setAdminMode: () => void;
  setClientTestMode: () => void;
  adminConfig: { name: string; email: string; role: string };
  subscription: SubscriptionState;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isSubscribed: boolean;
  isMasterAdmin: boolean;
  trialDaysRemaining: number;
  trialHoursRemaining: number;
  trialMinutesRemaining: number;
  isAccessAllowed: boolean;
  isBlockedDueToDay5: boolean;
  isDueWarningActive: boolean;
  daysUntilDue: number;
  nextDueDateFormatted: string;
  nextDueDateDay5: string;
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (open: boolean) => void;
  activateSubscription: (code?: string, paymentRef?: string) => boolean;
  resetTrial: () => void;
  simulateTrialExpired: () => void;
  simulateTrialDay: (daysFromStart: number) => void;
  simulateDay5Warning: () => void;
  simulateDay5Blocked: () => void;
  blockUnpaidUser: () => void;
  isTestBlockMode: boolean;
  exitTestBlockMode: (masterPassword?: string) => boolean;
  renewSubscription: () => void;
  // Extended Trial Clients (Liberar +2 Dias de Teste por Nome e Celular)
  extendedTrialClients: ExtendedTrialClient[];
  addExtendedTrialClient: (clientName: string, clientPhone: string, days?: number, notes?: string) => ExtendedTrialClient;
  removeExtendedTrialClient: (id: string) => void;
  extendTrialForCurrentDevice: (days?: number, clientName?: string, clientPhone?: string) => void;
  checkAndApplyClientTrialExtension: (nameOrPhone: string) => boolean;

  // Multi-Company & Infinite Users Workspaces
  companyName: string;
  setCompanyName: (name: string) => void;
  currentCompany: CompanyAccount;
  companies: CompanyAccount[];
  hasRegisteredCompany: boolean;
  registerMerchantWorkspace: (data: {
    companyName: string;
    phone: string;
    password: string;
    ownerName?: string;
    logoEmoji?: string;
  }) => CompanyAccount;
  createCompany: (companyData: { name: string; ownerName?: string; phone?: string; category?: string; logoEmoji?: string; password?: string }) => CompanyAccount;
  switchCompany: (companyId: string) => void;
  updateCurrentCompany: (data: Partial<CompanyAccount>) => void;
  deleteCompany: (companyId: string) => boolean;
  isCompanyModalOpen: boolean;
  setIsCompanyModalOpen: (open: boolean) => void;
  checkAndApplyAdminCredentials: (userOrName?: string, phoneOrKey?: string, masterPassword?: string, options?: { silent?: boolean }) => boolean;
  isAdminPasswordModalOpen: boolean;
  setIsAdminPasswordModalOpen: (open: boolean) => void;
  openAdminPasswordModal: () => void;

  // Confidential Company Management Area (Restricted by Password - Cost Price & Suppliers Hidden from Clients)
  isCompanyAreaUnlocked: boolean;
  setIsCompanyAreaUnlocked: (val: boolean) => void;
  companyPassword: string;
  hasCustomCompanyPassword: boolean;
  setCompanyPassword: (pass: string) => void;
  unlockCompanyArea: (pass: string) => boolean;
  verifyCompanyPasswordAsync: (pass: string, options?: { unlock?: boolean }) => Promise<boolean>;
  lockCompanyArea: () => void;
  isCompanyPasswordModalOpen: boolean;
  setIsCompanyPasswordModalOpen: (open: boolean) => void;
  openCompanyAreaUnlock: (redirectTab?: ActiveTab) => void;

  // Company Sharing & Promotion Modal (Divulgação no WhatsApp, Redes & Link)
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  shareModalCompany: CompanyAccount | null;
  openShareModal: (company?: CompanyAccount) => void;
  closeShareModal: () => void;

  // App Installed Update Modal & Real-Time 1-Click Update
  appVersion: string;
  isUpdateModalOpen: boolean;
  setIsUpdateModalOpen: (open: boolean) => void;
  openUpdateModal: () => void;
  closeUpdateModal: () => void;
  triggerOneClickUpdate: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'descart_clean_products_v1',
  SALES: 'descart_clean_sales_v1',
  MOVEMENTS: 'descart_clean_movements_v1',
  CUSTOMERS: 'descart_clean_customers_v1',
  SUPPLIERS: 'descart_clean_suppliers_v1',
  SHIFT: 'descart_clean_shift_v1',
  PAYMENT_SETTINGS: 'descart_clean_payment_settings_v1',
  SUBSCRIPTION: 'descart_clean_subscription_v1',
};

const DEFAULT_COMPANY_ID = 'empresa_principal';
const STORAGE_COMPANIES_KEY = 'appvendas_companies_list_v1';
const STORAGE_ACTIVE_COMPANY_KEY = 'appvendas_active_company_id_v1';
const STORAGE_COMPANY_REGISTERED_KEY = 'appvendas_company_registered_v1';
const STORAGE_EXTENDED_TRIAL_CLIENTS_KEY = 'appvendas_extended_trial_clients_v1';

export const getTenantKey = (baseKey: string, companyId: string) => {
  return `tenant_${companyId}_${baseKey}`;
};

const isPlaceholderCompanyName = (name?: string): boolean => {
  const lower = (name || '').trim().toLowerCase();
  return !lower || lower === 'minha loja' || lower === 'minha empresa' || lower === 'appvendas' || lower === 'app vendas' || lower === 'loja';
};

const readCompanyPasswordLocal = (compId: string): { password: string; hasCustom: boolean } => {
  try {
    const tenantPass = localStorage.getItem(getTenantKey('company_password', compId));
    const tenantFlag = localStorage.getItem(getTenantKey('company_has_custom_password', compId)) === 'true';
    if (tenantPass && tenantPass.trim().length > 0) {
      return { password: tenantPass.trim(), hasCustom: tenantFlag || tenantPass.trim() !== '1234' };
    }
    if (compId === DEFAULT_COMPANY_ID) {
      const legacyPass = localStorage.getItem('appvendas_company_password');
      if (legacyPass && legacyPass.trim().length > 0) {
        return { password: legacyPass.trim(), hasCustom: legacyPass.trim() !== '1234' };
      }
    }
  } catch {}
  return { password: '1234', hasCustom: false };
};

export const ADMIN_CONFIG = {
  name: 'Marcia Alves',
  email: 'marciaalves050709@gmail.com',
  role: 'Administradora',
  masterCode: 'MARCIA2026',
  pixKey: '91993192405',
  monthlyPrice: 94.98,
};

export const MASTER_CODES = [
  'MARCIA2026',
  'ADMINMARCIA',
  'MESTRA58',
  'MASTER2026',
  'MARCIA0507',
  '0507',
  '050709',
  'MARCIA050709',
  'MARCIAALVES050709',
  'MARCIA58',
  'MARCIAALVES2026',
  'MASTERADMIN',
  'MASTERADMINMARCIA'
];

/**
 * Checks if the provided Master Password (senha mestra) is valid.
 */
export const checkIsMasterPassword = (password?: string): boolean => {
  if (!password) return false;
  const clean = password.replace(/[\s\-\(\)\.]+/g, '').toUpperCase();
  return (
    MASTER_CODES.includes(clean) || 
    clean === '0507' || 
    clean === '050709' || 
    clean.includes('MARCIA2026') ||
    clean.includes('050709') ||
    clean.includes('MARCIA0507')
  );
};

/**
 * Validates Administrator access.
 * CRITICAL SECURITY REQUIREMENT:
 * The Master Password (senha mestra) is STRICTLY MANDATORY!
 * Access to the administrator panel is NEVER granted without the secret master password.
 */
export const checkIsAdminCredentials = (
  userOrName?: string, 
  phoneOrKey?: string, 
  masterPassword?: string
): boolean => {
  // If masterPassword is explicitly provided, it MUST be valid
  if (masterPassword !== undefined) {
    return checkIsMasterPassword(masterPassword);
  }

  // If only 1 or 2 arguments are provided, one of them MUST be the master password
  if (checkIsMasterPassword(phoneOrKey)) {
    return true;
  }
  if (checkIsMasterPassword(userOrName)) {
    return true;
  }

  // Without the secret master password, administrator access is NEVER granted!
  return false;
};

export const MASTER_ADMIN_LIFETIME_SUBSCRIPTION: SubscriptionState = {
  isSubscribed: true,
  trialStartDate: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  trialDurationDays: 9999,
  planPrice: 94.98,
  planName: 'Plano Pro Vitalício (Isento de Cobrança)',
  activatedAt: new Date().toISOString(),
  subscriptionExpiresAt: new Date('2099-12-31T23:59:59.000Z').toISOString(),
  lastPaymentRef: 'MASTER-ADMIN-MARCIA',
};

export const DEFAULT_SUBSCRIPTION: SubscriptionState = {
  isSubscribed: false,
  trialStartDate: new Date().toISOString(),
  trialDurationDays: 2,
  planPrice: 94.98,
  planName: 'Plano Pro (2 Dias Grátis de Teste)',
};

export const DEFAULT_SELLERS: SellerProfile[] = [
  {
    id: 'vendedor_principal',
    name: 'Atendente',
    whatsapp: '',
    pixKey: '',
    pixKeyType: 'PHONE',
    merchantName: 'Minha Empresa',
    merchantCity: 'Barcarena PA',
    receivingBank: 'NUBANK',
    isDefault: true,
  }
];

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  pixKey: '',
  pixKeyType: 'PHONE',
  merchantName: 'Minha Empresa',
  merchantCity: 'Barcarena PA',
  merchantWhatsapp: '',
  receivingBank: 'NUBANK',
  cardProvider: 'STONE',
  autoPixDetection: true,
  autoCardApproval: true,
  soundEnabled: true,
  sellers: DEFAULT_SELLERS,
  activeSellerId: 'vendedor_principal',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Helper to normalize strings for robust company matching by slug or name
  const normalizeStoreSlug = (str?: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .trim();
  };

  const cleanSlugAlphanumeric = (str?: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  };

  // Check URL params for deep-linking directly to a specific company/store (handles both & and encoded %26)
  const initialUrlParams = typeof window !== 'undefined' 
    ? new URLSearchParams((window.location.search || '').replace(/%26/gi, '&')) 
    : null;
  
  // Also check pathname (e.g. /loja/minha-empresa or /l/maquiagemtop_1t22)
  const ssrInitialStore = typeof window !== 'undefined' ? (window as any).__INITIAL_SHORT_LINK_DATA__ : null;
  let pathLojaName = '';
  let pathShortCode = '';
  if (typeof window !== 'undefined' && window.location.pathname) {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if ((parts[0] === 'loja' || parts[0] === 'l') && parts[1]) {
      const rawSeg = decodeURIComponent(parts[1]);
      if (parts[0] === 'l') {
        pathShortCode = rawSeg;
        pathLojaName = ssrInitialStore?.slug || ssrInitialStore?.company?.name || rawSeg.replace(/[_-][a-z0-9]{4}$/i, '');
      } else {
        pathLojaName = rawSeg;
      }
    }
  }

  const rawUrlStore = initialUrlParams?.get('loja') || 
                      initialUrlParams?.get('nome') ||
                      initialUrlParams?.get('empresa') || 
                      initialUrlParams?.get('company') || 
                      initialUrlParams?.get('companyId') ||
                      ssrInitialStore?.company?.name ||
                      ssrInitialStore?.slug ||
                      pathLojaName;

  const initialCompanyFromUrl = rawUrlStore;
  const initialTabFromUrl = initialUrlParams?.get('tab') as ActiveTab | null;

  const initialUrlHasProducts = Boolean(initialUrlParams?.get('p') || initialUrlParams?.get('pdata') || (Array.isArray(ssrInitialStore?.products) && ssrInitialStore.products.length > 0));
  const initialUrlHasExplicitVersion = Boolean(initialUrlParams?.get('v'));
  const initialUrlVersion = Number(initialUrlParams?.get('v')) || 0;
  const urlCatalogInfoRef = useRef<{ hasUrlProducts: boolean; hasExplicitVersion: boolean; urlVersion: number; urlSlug: string }>({
    hasUrlProducts: initialUrlHasProducts,
    hasExplicitVersion: initialUrlHasExplicitVersion,
    urlVersion: initialUrlVersion,
    urlSlug: normalizeStoreSlug(rawUrlStore)
  });
  const hasMerchantMutationRef = useRef<boolean>(false);
  const lastSyncedSignatureRef = useRef<string>('');

  const COMPANY_RESTRICTED_TABS: ActiveTab[] = [
    'pos',
    'sales',
    'cashier',
    'company-costs',
    'inventory',
    'reports',
    'dashboard',
    'customers',
    'quick-add-product'
  ];

  // Default tab is ALWAYS 'client-store' because this is direct sales to clients!
  // Any restricted tab (POS, sales history, reports, cashier, costs) requires company password
  const [activeTabState, setActiveTabState] = useState<ActiveTab>(() => {
    const isUnlockedInitial = typeof window !== 'undefined' && sessionStorage.getItem('appvendas_company_unlocked') === 'true';
    if (initialTabFromUrl && (initialTabFromUrl === 'client-store' || isUnlockedInitial || !COMPANY_RESTRICTED_TABS.includes(initialTabFromUrl))) {
      return initialTabFromUrl;
    }
    return 'client-store';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);

  // Company Sharing & Promotion Modal (Divulgação no WhatsApp, Redes & Link)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalCompany, setShareModalCompany] = useState<CompanyAccount | null>(null);

  const openShareModal = (comp?: CompanyAccount) => {
    const target = comp 
      ? (companies.find(c => c.id === comp.id) || comp) 
      : (companies.find(c => c.id === activeCompanyId) || currentCompany);
    setShareModalCompany(target);
    setIsShareModalOpen(true);
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setShareModalCompany(null);
  };

  // App Installed Update Modal State & Dynamic Live Version
  const [appVersion, setAppVersion] = useState<string>(CLIENT_APP_VERSION);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const openUpdateModal = () => setIsUpdateModalOpen(true);
  const closeUpdateModal = () => setIsUpdateModalOpen(false);

  // Sync live server version on startup & when window focuses/resumes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncVer = () => {
      fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' })
        .then(r => {
          const ct = r.headers.get('content-type') || '';
          return r.ok && ct.includes('application/json') ? r.json() : null;
        })
        .then(data => {
          if (data?.version) {
            const cleanVer = String(data.version).replace(/^v/i, '').trim();
            if (cleanVer) setAppVersion(cleanVer);
          }
        })
        .catch(() => {});
    };
    syncVer();
    const onFocus = () => syncVer();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncVer();
    };
    const onVerEvent = (ev: Event) => {
      const incoming = String((ev as CustomEvent<{ version?: string }>)?.detail?.version || '').replace(/^v/i, '').trim();
      if (incoming) setAppVersion(incoming);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onFocus);
    window.addEventListener('app-update-available', onVerEvent);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onFocus);
      window.removeEventListener('app-update-available', onVerEvent);
    };
  }, []);

  // Track whether this device has explicitly registered/owns a company (or opened a shared store URL)
  const initialHasRegisteredCompany = (() => {
    if (rawUrlStore || pathShortCode) return true;
    const urlPhoneCheck = (initialUrlParams?.get('zap') || initialUrlParams?.get('cel') || initialUrlParams?.get('celular') || '').replace(/\D/g, '');
    if (urlPhoneCheck.length >= 8) return true;
    try {
      const adminParam = initialUrlParams?.get('admin')?.toLowerCase() || initialUrlParams?.get('chave')?.toLowerCase() || initialUrlParams?.get('key')?.toLowerCase();
      if (adminParam === 'marcia2026' || adminParam === '0507') return true;
      if (localStorage.getItem(STORAGE_COMPANY_REGISTERED_KEY) === 'true') return true;
      if (localStorage.getItem('appvendas_is_admin') === 'true') return true;
      const savedCompaniesRaw = localStorage.getItem(STORAGE_COMPANIES_KEY);
      if (savedCompaniesRaw) {
        const parsed = JSON.parse(savedCompaniesRaw);
        if (Array.isArray(parsed) && parsed.some((c: any) => !isPlaceholderCompanyName(c?.name) || (c?.phone && String(c.phone).replace(/\D/g, '').length >= 8))) {
          return true;
        }
      }
      const legacySettingsRaw = localStorage.getItem(STORAGE_KEYS.PAYMENT_SETTINGS);
      if (legacySettingsRaw) {
        const ps = JSON.parse(legacySettingsRaw);
        if (!isPlaceholderCompanyName(ps?.merchantName) || (ps?.merchantWhatsapp && String(ps.merchantWhatsapp).replace(/\D/g, '').length >= 8)) {
          return true;
        }
      }
      const savedActive = localStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY) || DEFAULT_COMPANY_ID;
      const tenantProductsRaw = localStorage.getItem(getTenantKey('products', savedActive));
      if (tenantProductsRaw) {
        const tp = JSON.parse(tenantProductsRaw);
        if (Array.isArray(tp) && tp.length > 0 && savedActive !== DEFAULT_COMPANY_ID) {
          return true;
        }
      }
    } catch {}
    return false;
  })();

  const [hasRegisteredCompany, setHasRegisteredCompany] = useState<boolean>(initialHasRegisteredCompany);
  const hasRegisteredCompanyRef = useRef<boolean>(initialHasRegisteredCompany);
  useEffect(() => {
    hasRegisteredCompanyRef.current = hasRegisteredCompany;
  }, [hasRegisteredCompany]);

  // Confidential Company Management Area (starts LOCKED so clients never see company costs, POS, sales or suppliers)
  const [isCompanyAreaUnlocked, setIsCompanyAreaUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('appvendas_company_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const initialActiveIdHint = (() => {
    try {
      return initialUrlParams?.get('id') || initialUrlParams?.get('empresa') || localStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY) || DEFAULT_COMPANY_ID;
    } catch {
      return DEFAULT_COMPANY_ID;
    }
  })();
  const initialPassInfo = readCompanyPasswordLocal(initialActiveIdHint);
  const [companyPassword, setCompanyPasswordState] = useState<string>(initialPassInfo.password);
  const [localHasCustomPassword, setLocalHasCustomPassword] = useState<boolean>(initialPassInfo.hasCustom);
  const [serverHasPassword, setServerHasPassword] = useState<boolean>(() => Boolean(ssrInitialStore?.hasPassword));
  const hasCustomCompanyPassword = localHasCustomPassword || serverHasPassword;

  const [isCompanyPasswordModalOpen, setIsCompanyPasswordModalOpen] = useState(false);
  const [targetTabAfterUnlock, setTargetTabAfterUnlock] = useState<ActiveTab | null>(null);

  const setCompanyPassword = (pass: string) => {
    const clean = pass.trim();
    if (!clean) return;
    setCompanyPasswordState(clean);
    setLocalHasCustomPassword(true);
    setServerHasPassword(true);
    try {
      localStorage.setItem(getTenantKey('company_password', activeCompanyId), clean);
      localStorage.setItem(getTenantKey('company_has_custom_password', activeCompanyId), 'true');
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem('appvendas_company_password', clean);
      }
    } catch {}
    if (currentCompany?.name && !isPlaceholderCompanyName(currentCompany.name)) {
      syncStoreToServer(currentCompany, paymentSettings, activeSeller, products, {
        companyPassword: clean
      }).catch(() => {});
    }
  };

  const openCompanyAreaUnlock = (redirectTab?: ActiveTab) => {
    setTargetTabAfterUnlock(redirectTab || 'company-costs');
    setIsCompanyPasswordModalOpen(true);
  };

  const applyUnlockSuccess = (isMaster: boolean, skipModalClose = false) => {
    setIsCompanyAreaUnlocked(true);
    try {
      sessionStorage.setItem('appvendas_company_unlocked', 'true');
    } catch {}
    if (isMaster) {
      setIsAdmin(true);
      try {
        localStorage.setItem('appvendas_is_admin', 'true');
        sessionStorage.setItem('appvendas_admin_session', 'active');
      } catch {}
    }
    if (!skipModalClose) {
      setIsCompanyPasswordModalOpen(false);
      if (targetTabAfterUnlock) {
        setActiveTabState(targetTabAfterUnlock);
        setTargetTabAfterUnlock(null);
      }
    }
  };

  const unlockCompanyArea = (pass: string): boolean => {
    const trimmed = (pass || '').trim();
    const isMaster = checkIsMasterPassword(trimmed);
    const isDirectMatch = trimmed === companyPassword && (localHasCustomPassword || !serverHasPassword);
    const isDefaultFallback = !hasCustomCompanyPassword && trimmed === '1234';

    if (isMaster || isDirectMatch || isDefaultFallback) {
      applyUnlockSuccess(isMaster);
      return true;
    }
    return false;
  };

  const verifyCompanyPasswordAsync = async (pass: string, options?: { unlock?: boolean }): Promise<boolean> => {
    const trimmed = (pass || '').trim();
    if (!trimmed) return false;
    const shouldUnlock = options?.unlock !== false;
    const isMaster = checkIsMasterPassword(trimmed);
    const isDirectMatch = trimmed === companyPassword && (localHasCustomPassword || !serverHasPassword);
    const isDefaultFallback = !hasCustomCompanyPassword && trimmed === '1234';

    if (isMaster || isDirectMatch || isDefaultFallback) {
      if (shouldUnlock) applyUnlockSuccess(isMaster);
      return true;
    }

    const storeKey = normalizeStoreSlug(currentCompany?.slug || currentCompany?.name) || activeCompanyId;
    if (!storeKey) return false;

    try {
      const res = await fetch(`/api/stores/${encodeURIComponent(storeKey)}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmed })
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.valid) {
          if (!isMaster) {
            setCompanyPasswordState(trimmed);
            setLocalHasCustomPassword(Boolean(data.hasPassword) || trimmed !== '1234');
            setServerHasPassword(Boolean(data.hasPassword));
            try {
              localStorage.setItem(getTenantKey('company_password', activeCompanyId), trimmed);
              if (data.hasPassword || trimmed !== '1234') {
                localStorage.setItem(getTenantKey('company_has_custom_password', activeCompanyId), 'true');
              }
            } catch {}
          }
          if (shouldUnlock) applyUnlockSuccess(isMaster);
          return true;
        }
      }
    } catch {}
    return false;
  };

  const lockCompanyArea = () => {
    setIsCompanyAreaUnlocked(false);
    try {
      sessionStorage.removeItem('appvendas_company_unlocked');
    } catch {}
    setActiveTabState('client-store');
  };

  const setActiveTab = (tab: ActiveTab) => {
    // REGRA DE SEGURANÇA: Ao voltar para a loja do cliente, SEMPRE fechar o cadeado da empresa!
    if (tab === 'client-store') {
      setIsCompanyAreaUnlocked(false);
      try {
        sessionStorage.removeItem('appvendas_company_unlocked');
      } catch {}
      setActiveTabState('client-store');
      return;
    }

    if (COMPANY_RESTRICTED_TABS.includes(tab) && !isCompanyAreaUnlocked) {
      openCompanyAreaUnlock(tab);
      return;
    }
    setActiveTabState(tab);
  };

  const activeTab = activeTabState;

  // Multi-Company (Infinite Users) Workspaces
  const [companies, setCompanies] = useState<CompanyAccount[]>(() => {
    const urlCompName = initialUrlParams?.get('nome') || ssrInitialStore?.company?.name || (initialUrlParams?.get('loja') ? initialUrlParams.get('loja')!.replace(/[-_]/g, ' ') : pathLojaName.replace(/[-_]/g, ' '));
    const urlCompEmoji = initialUrlParams?.get('emoji') || ssrInitialStore?.company?.logoEmoji;
    const urlCompZap = initialUrlParams?.get('zap') || ssrInitialStore?.zap || ssrInitialStore?.company?.phone;
    const urlCompId = initialUrlParams?.get('id') || initialUrlParams?.get('empresa') || ssrInitialStore?.company?.id;

    const list: CompanyAccount[] = (() => {
      try {
        const saved = localStorage.getItem(STORAGE_COMPANIES_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map(c => ({
              ...c,
              name: (c.name === 'MARCIA ALVES' || c.name === 'appvendas' || c.name === 'App vendas' || c.name === 'App Vendas' || !c.name) ? 'Minha Loja' : c.name,
              ownerName: (c.ownerName === 'Marcia Alves' || c.ownerName === 'MARCIA ALVES' || c.ownerName === 'Administrador' || c.ownerName === 'Meu Usuário' || !c.ownerName) ? 'Lojista' : c.ownerName,
              email: c.email === 'marciaalves050709@gmail.com' ? '' : (c.email || '')
            }));
          }
        }
      } catch {}

      const legacySettings = (() => {
        try {
          const s = localStorage.getItem(STORAGE_KEYS.PAYMENT_SETTINGS);
          return s ? JSON.parse(s) : null;
        } catch {
          return null;
        }
      })();

      const initialName = (legacySettings?.merchantName === 'MARCIA ALVES' || legacySettings?.merchantName === 'appvendas' || legacySettings?.merchantName === 'App vendas' || legacySettings?.merchantName === 'App Vendas' || !legacySettings?.merchantName)
        ? 'Minha Loja'
        : legacySettings.merchantName;

      return [{
        id: DEFAULT_COMPANY_ID,
        name: initialName,
        slug: initialName.toLowerCase().replace(/\s+/g, '-'),
        ownerName: 'Lojista',
        phone: legacySettings?.merchantWhatsapp || '',
        email: '',
        category: 'Comércio & Serviços',
        logoEmoji: '🏪',
        createdAt: new Date().toISOString()
      }];
    })();

    // If a shared company was accessed via URL (by name, slug, or id), match or register without overwriting another store
    if (rawUrlStore) {
      const targetNormalized = normalizeStoreSlug(rawUrlStore);
      const urlDisplayNorm = normalizeStoreSlug(urlCompName || rawUrlStore);
      const isDefaultPlaceholder = (c: CompanyAccount) => c.name === 'Minha Loja' || c.name === 'appvendas';
      const existingIdx = list.findIndex(c => 
        normalizeStoreSlug(c.slug) === targetNormalized ||
        normalizeStoreSlug(c.name) === targetNormalized ||
        normalizeStoreSlug(c.name) === urlDisplayNorm ||
        (urlCompId && c.id === urlCompId && (isDefaultPlaceholder(c) || normalizeStoreSlug(c.name) === urlDisplayNorm)) ||
        (list.length === 1 && !urlCompId && isDefaultPlaceholder(list[0]))
      );

      if (existingIdx >= 0) {
        list[existingIdx] = {
          ...list[existingIdx],
          name: urlCompName || list[existingIdx].name,
          logoEmoji: urlCompEmoji || list[existingIdx].logoEmoji,
          phone: urlCompZap || list[existingIdx].phone,
        };
      } else {
        const collidesWithOther = urlCompId && list.some(c => c.id === urlCompId);
        const newId = (!urlCompId || collidesWithOther)
          ? `empresa_${targetNormalized || Date.now()}`
          : urlCompId;
        list.push({
          id: newId,
          name: urlCompName || rawUrlStore.replace(/[-_]/g, ' '),
          slug: (urlCompName || rawUrlStore).toLowerCase().replace(/\s+/g, '-'),
          ownerName: 'Lojista',
          phone: urlCompZap || '',
          email: '',
          category: 'Comércio & Serviços',
          logoEmoji: urlCompEmoji || '🏪',
          createdAt: new Date().toISOString()
        });
      }
    }

    return list;
  });

  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    if (rawUrlStore) {
      const targetNormalized = normalizeStoreSlug(rawUrlStore);
      const urlDisplayNorm = normalizeStoreSlug(initialUrlParams?.get('nome') || rawUrlStore);
      const urlCompId = initialUrlParams?.get('id') || initialUrlParams?.get('empresa');
      const isDefaultPlaceholder = (c: CompanyAccount) => c.name === 'Minha Loja' || c.name === 'appvendas';
      const found = companies.find(c => 
        normalizeStoreSlug(c.slug) === targetNormalized ||
        normalizeStoreSlug(c.name) === targetNormalized ||
        normalizeStoreSlug(c.name) === urlDisplayNorm ||
        (urlCompId && c.id === urlCompId && (isDefaultPlaceholder(c) || normalizeStoreSlug(c.name) === urlDisplayNorm)) ||
        (companies.length === 1 && !urlCompId && isDefaultPlaceholder(companies[0]))
      );
      if (found) return found.id;
      return `empresa_${targetNormalized || Date.now()}`;
    }
    const directCompId = initialUrlParams?.get('id') || initialUrlParams?.get('empresa');
    if (directCompId) return directCompId;
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_COMPANY_KEY);
      if (saved) return saved;
    } catch {}
    return DEFAULT_COMPANY_ID;
  });

  // Active Company Object
  const currentCompany = companies.find(c => c.id === activeCompanyId) || companies[0] || {
    id: DEFAULT_COMPANY_ID,
    name: 'Minha Loja',
    slug: 'minha-loja',
    ownerName: 'Lojista',
    phone: '',
    email: '',
    category: 'Comércio & Serviços',
    logoEmoji: '🏪',
    createdAt: new Date().toISOString()
  };

  // Company Name
  const companyName = currentCompany.name;

  // Helper to migrate legacy city names
  const sanitizeMerchantCity = (city?: string) => {
    if (!city || city.toUpperCase().includes('PAULO') || city.toUpperCase().includes('SAO PAULO')) {
      return 'Barcarena PA';
    }
    return city;
  };

  // Persistence loader for PaymentSettings (customized per company workspace)
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() => {
    try {
      const urlZap = initialUrlParams?.get('zap') || ssrInitialStore?.zap || ssrInitialStore?.paymentSettings?.merchantWhatsapp;
      const urlPix = initialUrlParams?.get('pix') || ssrInitialStore?.paymentSettings?.pixKey;
      const rawBanco = initialUrlParams?.get('banco') || ssrInitialStore?.paymentSettings?.receivingBank;
      const urlBanco: BankProvider | undefined = rawBanco ? (rawBanco as BankProvider) : undefined;
      const urlNome = initialUrlParams?.get('nome') || ssrInitialStore?.company?.name || (initialUrlParams?.get('loja') ? decodeURIComponent(initialUrlParams.get('loja')!).replace(/[-_]/g, ' ') : undefined);
      const urlCanalInit = (initialUrlParams?.get('canal') || ssrInitialStore?.canal || '').trim();

      const normalizeSettings = (parsed: Partial<PaymentSettings>): PaymentSettings => {
        const normCity = sanitizeMerchantCity(parsed.merchantCity);
        const normKey = urlPix || parsed.pixKey || '';
        const normWhatsapp = urlZap || parsed.merchantWhatsapp || '';
        const normMerchant = urlNome || (parsed.merchantName === 'MARCIA ALVES' || parsed.merchantName === 'appvendas' || parsed.merchantName === 'App vendas' || parsed.merchantName === 'App Vendas' || !parsed.merchantName
          ? currentCompany.name
          : parsed.merchantName);

        const baseSellers = (parsed.sellers && parsed.sellers.length > 0)
          ? parsed.sellers
          : (ssrInitialStore?.paymentSettings?.sellers && ssrInitialStore.paymentSettings.sellers.length > 0
              ? ssrInitialStore.paymentSettings.sellers
              : [
                  {
                    id: 'vendedor_principal',
                    name: 'Atendente',
                    whatsapp: normWhatsapp,
                    pixKey: normKey,
                    pixKeyType: parsed.pixKeyType || 'PHONE',
                    merchantName: normMerchant,
                    merchantCity: normCity,
                    receivingBank: urlBanco || parsed.receivingBank || 'NUBANK',
                    isDefault: true,
                  }
                ]);

        const matchedCanalSeller = urlCanalInit && Array.isArray(baseSellers)
          ? (baseSellers.find((s: SellerProfile) => s.id === urlCanalInit) ||
             (/^canal_(\d+)$/i.test(urlCanalInit) ? baseSellers[parseInt(urlCanalInit.replace(/\D/g, ''), 10) - 1] : undefined))
          : undefined;
        const resolvedActiveId = matchedCanalSeller?.id || ssrInitialStore?.paymentSettings?.activeSellerId || parsed.activeSellerId || baseSellers[0]?.id || 'vendedor_principal';

        const normSellers: SellerProfile[] = baseSellers.map((s: SellerProfile) => {
          const isSelectedSeller = s.id === resolvedActiveId;
          return {
            ...s,
            name: (s.name === 'Márcia Alves' || s.name === 'Marcia Alves') ? 'Atendente' : s.name,
            merchantName: (s.merchantName === 'MARCIA ALVES' || s.merchantName === 'Márcia Alves' || s.merchantName === 'appvendas' || s.merchantName === 'App vendas' || s.merchantName === 'App Vendas') ? normMerchant : (s.merchantName || normMerchant),
            pixKey: s.pixKey || (isSelectedSeller ? normKey : ''),
            whatsapp: s.whatsapp || (isSelectedSeller ? normWhatsapp : ''),
            merchantCity: sanitizeMerchantCity(s.merchantCity),
            receivingBank: s.receivingBank || (isSelectedSeller ? (urlBanco || 'NUBANK') : 'NUBANK')
          };
        });

        return {
          ...DEFAULT_PAYMENT_SETTINGS,
          ...parsed,
          pixKey: matchedCanalSeller?.pixKey || normKey,
          merchantWhatsapp: matchedCanalSeller?.whatsapp || normWhatsapp,
          merchantCity: normCity,
          merchantName: normMerchant,
          receivingBank: matchedCanalSeller?.receivingBank || urlBanco || parsed.receivingBank || 'NUBANK',
          sellers: normSellers,
          activeSellerId: resolvedActiveId,
        };
      };

      const tenantSaved = localStorage.getItem(getTenantKey('payment_settings', activeCompanyId));
      if (tenantSaved) {
        const parsed = JSON.parse(tenantSaved);
        return normalizeSettings(parsed);
      }
      const saved = localStorage.getItem(STORAGE_KEYS.PAYMENT_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return normalizeSettings({ ...parsed, merchantName: currentCompany.name });
      }
      return normalizeSettings({ ...DEFAULT_PAYMENT_SETTINGS, merchantName: currentCompany.name });
    } catch {
      return { ...DEFAULT_PAYMENT_SETTINGS, merchantName: currentCompany.name };
    }
  });

  // Products state (isolated per company, supports shared catalog unpack & SSR short-link hydration)
  const [products, setProducts] = useState<Product[]>(() => {
    if (ssrInitialStore && Array.isArray(ssrInitialStore.products) && ssrInitialStore.products.length > 0) {
      try {
        localStorage.setItem(getTenantKey('products', activeCompanyId), JSON.stringify(ssrInitialStore.products));
      } catch {}
      return ssrInitialStore.products;
    }

    // Check if products are passed directly in URL from a promotional shared link
    if (initialUrlParams) {
      // 1. Ultra-compact format 'p' (Format: Name_Price_Stock_Unit_Category_WholesalePrice_WholesaleQty joined by '*')
      const pParam = initialUrlParams.get('p');
      if (pParam) {
        try {
          const rawItems = pParam.split('*').filter(Boolean);
          const parsedList: Product[] = rawItems.map((itemStr, idx) => {
            const parts = itemStr.split('_');
            let name = `Produto ${idx + 1}`;
            try {
              name = decodeURIComponent((parts[0] || '').replace(/\+/g, ' ')) || name;
            } catch {
              name = (parts[0] || '').replace(/\+/g, ' ') || name;
            }
            const salePrice = parseFloat(parts[1]) || 0;
            const currentStock = parseInt(parts[2], 10) || 50;
            const unit = (parts[3] as UnitType) || 'UN';
            let category: Category = 'Outros';
            try {
              category = (decodeURIComponent((parts[4] || 'Outros').replace(/\+/g, ' ')) as Category) || 'Outros';
            } catch {
              category = (parts[4] as Category) || 'Outros';
            }
            const wholesalePrice = parts[5] ? parseFloat(parts[5]) : undefined;
            const wholesaleMinQty = parts[6] ? parseInt(parts[6], 10) : undefined;
            return {
              id: `p_share_${idx + 1}`,
              name,
              sku: `PROD-${idx + 1}`,
              barcode: '',
              salePrice,
              costPrice: 0,
              currentStock,
              minStock: 2,
              maxStock: 1000,
              unit,
              category,
              itemsPerUnit: 1,
              description: '',
              wholesalePrice,
              wholesaleMinQty,
              updatedAt: new Date().toISOString()
            };
          });

          if (parsedList.length > 0) {
            try {
              localStorage.setItem(getTenantKey('products', activeCompanyId), JSON.stringify(parsedList));
            } catch {}
            return parsedList;
          }
        } catch (e) {
          console.error('Error unpacking compact products:', e);
        }
      }

      // 2. Legacy 'pdata' format
      const pdataParam = initialUrlParams.get('pdata');
      if (pdataParam) {
        try {
          let raw = pdataParam;
          if (raw.startsWith('%')) {
            try { raw = decodeURIComponent(raw); } catch {}
          }
          const compactList = JSON.parse(raw);
          if (Array.isArray(compactList) && compactList.length > 0) {
            const parsedList: Product[] = compactList.map((item: any, idx: number) => ({
              id: item.id || `shared_${idx + 1}`,
              name: item.n || 'Produto',
              salePrice: Number(item.p) || 0,
              costPrice: 0,
              currentStock: Number(item.s) || 50,
              minStock: 2,
              maxStock: 1000,
              category: (item.c as Category) || 'Outros',
              unit: (item.u as UnitType) || 'UN',
              itemsPerUnit: 1,
              sku: `PROD-${idx + 1}`,
              barcode: '',
              description: item.d || '',
              wholesalePrice: item.w ? Number(item.w) : undefined,
              wholesaleMinQty: item.wq ? Number(item.wq) : undefined,
              updatedAt: new Date().toISOString()
            }));
            try {
              localStorage.setItem(getTenantKey('products', activeCompanyId), JSON.stringify(parsedList));
            } catch {}
            return parsedList;
          }
        } catch {}
      }
    }

    try {
      const tenantSaved = localStorage.getItem(getTenantKey('products', activeCompanyId));
      if (tenantSaved) {
        const parsed = JSON.parse(tenantSaved);
        if (Array.isArray(parsed)) {
          if (parsed.length === 1 && parsed[0]?.name === 'Sal') {
            return [];
          }
          return parsed;
        }
      }
      if (activeCompanyId === DEFAULT_COMPANY_ID && !rawUrlStore && initialHasRegisteredCompany) {
        const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              if (parsed.length === 0 || (parsed.length === 1 && parsed[0]?.name === 'Sal')) {
                return [];
              }
              return parsed;
            }
          } catch {}
        }
      }
      return [];
    } catch {
      return [];
    }
  });

  // Sales state (isolated per company - brand new visitors start clean)
  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const tenantSaved = localStorage.getItem(getTenantKey('sales', activeCompanyId));
      if (tenantSaved) return JSON.parse(tenantSaved);
      if (activeCompanyId === DEFAULT_COMPANY_ID && initialHasRegisteredCompany) {
        const saved = localStorage.getItem(STORAGE_KEYS.SALES);
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  // Movements state (isolated per company)
  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const tenantSaved = localStorage.getItem(getTenantKey('movements', activeCompanyId));
      if (tenantSaved) return JSON.parse(tenantSaved);
      if (activeCompanyId === DEFAULT_COMPANY_ID && initialHasRegisteredCompany) {
        const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  // Customers state (isolated per company)
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const tenantSaved = localStorage.getItem(getTenantKey('customers', activeCompanyId));
      if (tenantSaved) return JSON.parse(tenantSaved);
      if (activeCompanyId === DEFAULT_COMPANY_ID && initialHasRegisteredCompany) {
        const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  // Suppliers state (isolated per company)
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const tenantSaved = localStorage.getItem(getTenantKey('suppliers', activeCompanyId));
      if (tenantSaved) return JSON.parse(tenantSaved);
      if (activeCompanyId === DEFAULT_COMPANY_ID && initialHasRegisteredCompany) {
        const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
        return saved ? JSON.parse(saved) : [];
      }
      return [];
    } catch {
      return [];
    }
  });

  // Cashier shift state (isolated per company)
  const [currentShift, setCurrentShift] = useState<CashierShift>(() => {
    try {
      const tenantSaved = localStorage.getItem(getTenantKey('shift', activeCompanyId));
      if (tenantSaved) return JSON.parse(tenantSaved);
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        const saved = localStorage.getItem(STORAGE_KEYS.SHIFT);
        return saved ? JSON.parse(saved) : INITIAL_SHIFT;
      }
      return INITIAL_SHIFT;
    } catch {
      return INITIAL_SHIFT;
    }
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('cust-4'); // Consumidor balcão default

  // Modals state
  const [receiptModalSale, setReceiptModalSale] = useState<Sale | null>(null);
  const [productModalProduct, setProductModalProduct] = useState<Product | null | 'new'>(null);
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Extended Trial Clients state (Clientes autorizados para +2 dias adicionais de teste)
  const [extendedTrialClients, setExtendedTrialClients] = useState<ExtendedTrialClient[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_EXTENDED_TRIAL_CLIENTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_EXTENDED_TRIAL_CLIENTS_KEY, JSON.stringify(extendedTrialClients));
    } catch {
      // ignore
    }
  }, [extendedTrialClients]);

  // Simulation test block mode for the administrator to test unpaid blocking
  const [isTestBlockMode, setIsTestBlockMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('appvendas_test_block_active') === 'true';
    } catch {
      return false;
    }
  });

  const [isAdminPasswordModalOpen, setIsAdminPasswordModalOpen] = useState<boolean>(false);
  const openAdminPasswordModal = () => {
    setIsAdminPasswordModalOpen(true);
  };

  // Administrator identification:
  // Strictly defaults to FALSE so client users ALWAYS enter DIRECTLY into their own user account.
  // Márcia Alves can explicitly activate admin mode by typing the master key MARCIA2026.
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const adminParam = urlParams?.get('admin')?.toLowerCase() || urlParams?.get('chave')?.toLowerCase() || urlParams?.get('key')?.toLowerCase();
      if (adminParam === 'marcia2026' || adminParam === '0507') {
        localStorage.removeItem('appvendas_test_block_active');
        sessionStorage.setItem('appvendas_admin_session', 'active');
        localStorage.setItem('appvendas_admin_session', 'active');
        localStorage.setItem('appvendas_is_admin', 'true');
        return true;
      }

      // If test block mode is active, administrator is testing unpaid user blocking
      if (localStorage.getItem('appvendas_test_block_active') === 'true') {
        return false;
      }

      // Check session storage or persistent admin storage
      const sessionAuth = sessionStorage.getItem('appvendas_admin_session');
      const localAuth = localStorage.getItem('appvendas_admin_session');
      const isStoredAdmin = localStorage.getItem('appvendas_is_admin') === 'true';

      const savedSubRaw = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
      let isSavedMaster = false;
      if (savedSubRaw) {
        try {
          const s = JSON.parse(savedSubRaw);
          if (s.isSubscribed && (s.lastPaymentRef?.includes('MASTER-ADMIN') || (s.subscriptionExpiresAt && new Date(s.subscriptionExpiresAt).getFullYear() > 2090))) {
            isSavedMaster = true;
          }
        } catch {}
      }

      if (sessionAuth === 'active' || localAuth === 'active' || isStoredAdmin || isSavedMaster) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (!isTestBlockMode && isAdmin) {
        sessionStorage.setItem('appvendas_admin_session', 'active');
        localStorage.setItem('appvendas_admin_session', 'active');
        localStorage.setItem('appvendas_is_admin', 'true');
      }
    } catch {
      // ignore
    }
  }, [isAdmin, isTestBlockMode]);

  // Subscription state:
  // New users automatically get 2 days of free trial (48 hours).
  // Master admin has permanent lifetime access with master password.
  // After 2 days expire, payment of R$ 94,98 is required.
  const [subscription, setSubscription] = useState<SubscriptionState>(() => {
    try {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const isUrlTrial = Boolean(urlParams?.has('teste') || urlParams?.has('trial') || urlParams?.has('novo') || urlParams?.has('degustacao'));

      // If opening via a trial invite link (?teste=2dias), always cancel any test block and grant fresh 2-day trial
      if (isUrlTrial && !isAdmin) {
        localStorage.removeItem('appvendas_test_block_active');
        const freshTrial: SubscriptionState = {
          ...DEFAULT_SUBSCRIPTION,
          isSubscribed: false,
          trialDurationDays: 2,
          trialStartDate: new Date().toISOString(),
        };
        try {
          localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(freshTrial));
        } catch {}
        return freshTrial;
      }

      // If in test block mode, initialize directly as blocked
      if (localStorage.getItem('appvendas_test_block_active') === 'true') {
        const expiredPast = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        return {
          ...DEFAULT_SUBSCRIPTION,
          isSubscribed: false,
          trialDurationDays: 2,
          trialStartDate: expiredPast,
        };
      }

      const saved = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
      const isPixPaid = localStorage.getItem('appvendas_pix_paid') === 'true';

      // 1. Master admin is always permanently authorized
      if (isAdmin) {
        return MASTER_ADMIN_LIFETIME_SUBSCRIPTION;
      }

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.lastPaymentRef?.includes('MASTER-ADMIN') || (parsed.subscriptionExpiresAt && new Date(parsed.subscriptionExpiresAt).getFullYear() > 2090)) {
            return {
              ...MASTER_ADMIN_LIFETIME_SUBSCRIPTION,
              ...parsed,
              isSubscribed: true
            };
          }
          // If the user already has a saved trial, maintain their start date and duration
          const duration = (parsed.trialDurationDays && parsed.trialDurationDays > 0) ? parsed.trialDurationDays : 2;
          let startDate = parsed.trialStartDate;
          // If legacy data had trialDurationDays 0, renew start date
          if (parsed.trialDurationDays === 0 || !startDate) {
            startDate = new Date().toISOString();
          }
          return {
            ...DEFAULT_SUBSCRIPTION,
            ...parsed,
            trialStartDate: startDate,
            trialDurationDays: duration,
          };
        } catch {}
      }

      // 2. Any user who has paid via Pix is confirmed with active subscription
      if (isPixPaid) {
        let expiry = calculateNextDay5Expiry(new Date(), true).toISOString();
        let paymentRef = 'PIX-CONFIRMED';
        return {
          ...DEFAULT_SUBSCRIPTION,
          isSubscribed: true,
          subscriptionExpiresAt: expiry,
          trialDurationDays: 0,
          planPrice: 94.98,
          lastPaymentRef: paymentRef
        };
      }

      // 3. Brand new user opening the link for the first time:
      // Receives 2 full days (48 hours) of free trial!
      const initialTrial: SubscriptionState = {
        isSubscribed: false,
        trialStartDate: new Date().toISOString(),
        trialDurationDays: 2,
        planPrice: 94.98,
        planName: 'Plano Pro (2 Dias Grátis de Teste)',
      };
      try {
        localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(initialTrial));
      } catch {}
      return initialTrial;
    } catch {
      return DEFAULT_SUBSCRIPTION;
    }
  });

  // Keep administrator exempt from all charges and permanently active
  useEffect(() => {
    if (!isTestBlockMode && isAdmin && (!subscription.isSubscribed || subscription.lastPaymentRef !== 'MASTER-ADMIN-MARCIA')) {
      setSubscription(MASTER_ADMIN_LIFETIME_SUBSCRIPTION);
    }
  }, [isTestBlockMode, isAdmin, subscription.isSubscribed, subscription.lastPaymentRef]);

  // Current timestamp clock for live countdown
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 10000); // Check every 10s
    return () => clearInterval(timer);
  }, []);

  // Save subscription changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(subscription));
    } catch {}
  }, [subscription]);

  // Derived Trial & Subscription status
  // For new users or users with trialDurationDays, trial duration defaults to 2 days
  const trialDurationDays = (subscription.trialDurationDays && subscription.trialDurationDays > 0)
    ? subscription.trialDurationDays
    : 2;
  const trialStartMs = new Date(subscription.trialStartDate || Date.now()).getTime();
  const trialDurationMs = trialDurationDays * 24 * 60 * 60 * 1000;
  const trialEndMs = trialStartMs + trialDurationMs;
  const msRemaining = Math.max(0, trialEndMs - currentTimeMs);

  // Master Admin ONLY applies if isAdmin is true
  const isMasterAdmin = Boolean(
    isAdmin &&
    (subscription.isSubscribed &&
      (subscription.lastPaymentRef?.includes('MASTER-ADMIN') ||
       (subscription.subscriptionExpiresAt && new Date(subscription.subscriptionExpiresAt).getFullYear() > 2090)))
  );

  // Day 5 Recurring Billing Rule:
  // Subscription expires on Day 5 at 23:59:59. If not renewed, access is immediately blocked!
  const subscriptionExpiresAtMs = useMemo(() => {
    if (!subscription.isSubscribed) return 0;
    if (subscription.subscriptionExpiresAt) {
      const parsedTime = new Date(subscription.subscriptionExpiresAt).getTime();
      if (!isNaN(parsedTime) && parsedTime > 0) {
        return parsedTime;
      }
    }
    return calculateNextDay5Expiry(new Date(), true).getTime();
  }, [subscription.isSubscribed, subscription.subscriptionExpiresAt]);

  // Check if Day 5 deadline has passed without payment/renewal
  const isBlockedDueToDay5 = Boolean(
    !isMasterAdmin && 
    !isAdmin &&
    subscription.isSubscribed && 
    subscriptionExpiresAtMs > 0 && 
    currentTimeMs >= subscriptionExpiresAtMs
  );

  // Subscribed is only valid if not blocked by Day 5 deadline
  const isSubscribedValid = Boolean(
    isMasterAdmin || 
    (subscription.isSubscribed && !isBlockedDueToDay5)
  );

  // Administrator is ALWAYS subscribed and NEVER expired (100% exempt from charges)
  const isSubscribed = Boolean(isAdmin || isSubscribedValid);
  // Active trial: not admin, not paid subscribed, has trial days and remaining time > 0
  const isTrialActive = Boolean(!isAdmin && !isMasterAdmin && !subscription.isSubscribed && trialDurationDays > 0 && msRemaining > 0);
  const isTrialExpired = Boolean(!isAdmin && !isMasterAdmin && !subscription.isSubscribed && !isTrialActive);
  
  // Total access allowed: Admin OR Valid Subscribed (NOT blocked due to Day 5) OR Active 2-Day Trial!
  // When in test block mode or trial is expired or Day 5 unpaid, access is strictly blocked by AccessPaywall.
  const isAccessAllowed = Boolean(!isTestBlockMode && (isAdmin || isMasterAdmin || (isSubscribedValid && !isBlockedDueToDay5) || isTrialActive));

  // Days remaining calculation:
  const trialDaysRemaining = isAdmin ? 999 : Math.floor(msRemaining / (24 * 60 * 60 * 1000));
  const trialHoursRemaining = isAdmin ? 0 : Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const trialMinutesRemaining = isAdmin ? 0 : Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));

  // Countdown to Day 5 renewal & warning indicator:
  const msUntilDue = Math.max(0, subscriptionExpiresAtMs - currentTimeMs);
  const daysUntilDue = subscriptionExpiresAtMs > 0 ? Math.ceil(msUntilDue / (24 * 60 * 60 * 1000)) : 0;

  // Informative warning: Triggered when user is subscribed, not master admin, not blocked, and <= 5 days to Day 5
  const isDueWarningActive = Boolean(
    !isMasterAdmin && 
    subscription.isSubscribed && 
    !isBlockedDueToDay5 && 
    subscriptionExpiresAtMs > 0 &&
    daysUntilDue <= 5
  );

  const nextDueDateFormatted = isMasterAdmin
    ? 'Vitalício (Isento)'
    : subscriptionExpiresAtMs > 0
      ? formatDay5Date(subscriptionExpiresAtMs)
      : formatDay5Date(calculateNextDay5Expiry(new Date(), true));

  const nextDueDateDay5 = nextDueDateFormatted;

  const setAdminMode = () => {
    setIsTestBlockMode(false);
    setIsAdmin(true);
    try {
      localStorage.removeItem('appvendas_test_block_active');
      sessionStorage.setItem('appvendas_admin_session', 'active');
      localStorage.setItem('appvendas_admin_session', 'active');
      localStorage.setItem('appvendas_is_admin', 'true');
      localStorage.setItem('appvendas_pix_paid', 'true');
    } catch {
      // ignore
    }
    setSubscription(MASTER_ADMIN_LIFETIME_SUBSCRIPTION);
    showToast('success', '👑 Modo Administradora Ativo!', 'Acesso vitalício 100% gratuito confirmado para Márcia Alves.');
  };

  const checkAndApplyAdminCredentials = (
    userOrName?: string, 
    phoneOrKey?: string, 
    masterPassword?: string, 
    options?: { silent?: boolean }
  ): boolean => {
    // Senha Mestra is strictly mandatory!
    if (!checkIsAdminCredentials(userOrName, phoneOrKey, masterPassword)) {
      return false;
    }

    setIsTestBlockMode(false);
    setIsAdmin(true);

    try {
      localStorage.removeItem('appvendas_test_block_active');
      sessionStorage.setItem('appvendas_admin_session', 'active');
      localStorage.setItem('appvendas_admin_session', 'active');
      localStorage.setItem('appvendas_is_admin', 'true');
      localStorage.setItem('appvendas_pix_paid', 'true');
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(MASTER_ADMIN_LIFETIME_SUBSCRIPTION));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }

    setSubscription(MASTER_ADMIN_LIFETIME_SUBSCRIPTION);
    setIsSubscriptionModalOpen(false);

    // Audio & celebratory feedback
    try {
      sounds.playBankNotification();
      setTimeout(() => {
        try {
          sounds.playMoneyReceivedSound();
        } catch {
          // ignore
        }
      }, 200);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.35 }
      });
    } catch {
      // ignore
    }

    if (!options?.silent) {
      showToast(
        'success',
        '👑 Senha Mestra Confirmada!',
        'Bem-vinda, Márcia Alves! Acesso vitalício liberado com sucesso.'
      );
    }

    return true;
  };

  const setClientTestMode = () => {
    setIsAdmin(false);
    try {
      sessionStorage.removeItem('appvendas_admin_session');
      localStorage.removeItem('appvendas_admin_session');
      localStorage.setItem('appvendas_is_admin', 'false');
    } catch {
      // ignore
    }
    const clientTrial: SubscriptionState = {
      ...DEFAULT_SUBSCRIPTION,
      trialStartDate: new Date().toISOString(),
      isSubscribed: false,
    };
    setSubscription(clientTrial);
    showToast('info', '📱 Modo Cliente Ativado', 'Você está no modo exclusivo de cliente/lojista.');
  };

  const activateSubscription = (code?: string, paymentRef?: string): boolean => {
    const rawInput = (code || '').trim();
    // Normalize string: remove spaces, hyphens, dots, parentheses
    const cleanCode = rawInput.replace(/[\s\-\(\)\.]+/g, '').toUpperCase();
    
    // Márcia's private secret master password gives administrator status
    const isMasterKey = checkIsMasterPassword(cleanCode);

    if (isMasterKey) {
      setIsTestBlockMode(false);
      setIsAdmin(true);
      try {
        localStorage.removeItem('appvendas_test_block_active');
        sessionStorage.setItem('appvendas_admin_session', 'active');
        localStorage.setItem('appvendas_admin_session', 'active');
        localStorage.setItem('appvendas_is_admin', 'true');
        localStorage.setItem('appvendas_pix_paid', 'true');
      } catch {
        // ignore
      }
    } else {
      // Regular client payment: strictly keep client mode, client user and client company!
      setIsTestBlockMode(false);
      setIsAdmin(false);
      try {
        localStorage.removeItem('appvendas_test_block_active');
        sessionStorage.removeItem('appvendas_admin_session');
        localStorage.removeItem('appvendas_admin_session');
        localStorage.setItem('appvendas_is_admin', 'false');
        localStorage.setItem('appvendas_pix_paid', 'true');
      } catch {
        // ignore
      }
    }

    const nowIso = new Date().toISOString();
    // Master Admin gets lifetime access until year 2099; regular clients get monthly cycle renewed
    const expiryDate = isMasterKey 
      ? new Date('2099-12-31T23:59:59.000Z')
      : calculateNextDay5Expiry(new Date(), true);
    const expiryIso = expiryDate.toISOString();

    const updated: SubscriptionState = {
      ...subscription,
      isSubscribed: true,
      activatedAt: nowIso,
      subscriptionExpiresAt: expiryIso,
      lastPaymentRef: isMasterKey ? `MASTER-ADMIN-${cleanCode || 'MARCIA2026'}` : (paymentRef || (code ? `CODIGO-${cleanCode}` : `PIX-${Date.now()}`)),
    };

    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updated));
      localStorage.setItem('appvendas_pix_paid', 'true');
      localStorage.setItem('appvendas_pix_paid_timestamp', Date.now().toString());
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }

    setSubscription(updated);
    setIsSubscriptionModalOpen(false);

    // Audio & Visual celebratory feedback: Confetti & Serpentina + Bank Sound
    try {
      sounds.playBankNotification();
      setTimeout(() => {
        try {
          sounds.playMoneyReceivedSound();
        } catch {
          // ignore
        }
      }, 250);
      confetti({
        particleCount: 130,
        spread: 100,
        origin: { y: 0.4 },
      });
    } catch {
      // ignore
    }

    if (isMasterKey) {
      showToast(
        'success',
        '👑 Acesso Liberado com Sucesso!',
        'Acesso Vitalício confirmado permanentemente sem mensalidade.'
      );
    } else {
      showToast(
        'success',
        '🎉 Licença Liberada com Sucesso!',
        `Acesso liberado até ${formatDay5Date(expiryDate)}! Renovação mensal todo dia 05 (${formatCurrency(subscription.planPrice || 94.98)}/mês).`
      );
    }
    return true;
  };

  const renewSubscription = () => {
    activateSubscription(undefined, `RENOVACAO-PIX-${Date.now()}`);
  };

  const simulateDay5Warning = () => {
    // Simulates that payment is 2 days before Day 5 deadline (informing approaching due date)
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const updated: SubscriptionState = {
      ...subscription,
      isSubscribed: true,
      subscriptionExpiresAt: inTwoDays,
      lastPaymentRef: 'SIMULACAO-AVISO-DIA-05',
    };
    setSubscription(updated);
    setCurrentTimeMs(Date.now());
    showToast('warning', '⚠️ Simulação: Aviso de Vencimento Ativado', 'Simulando que faltam 2 dias para o Dia 05. O sistema agora alerta proativamente sobre o vencimento!');
  };

  const simulateDay5Blocked = () => {
    // Simulates that Day 5 has passed without payment -> immediate block!
    setIsAdmin(false);
    try {
      localStorage.setItem('appvendas_is_admin', 'false');
    } catch {
      // ignore
    }
    const passedYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const updated: SubscriptionState = {
      ...subscription,
      isSubscribed: true,
      subscriptionExpiresAt: passedYesterday,
      lastPaymentRef: 'SIMULACAO-BLOQUEIO-DIA-05',
    };
    setSubscription(updated);
    setCurrentTimeMs(Date.now());
    showToast('error', '⛔ Bloqueio Ativado: Dia 05 Vencido', 'Dia 05 ultrapassado sem pagamento. O aplicativo foi bloqueado imediatamente!');
  };

  // Immediate block for testing unpaid user experience from inside admin
  const blockUnpaidUser = () => {
    setIsTestBlockMode(true);
    setIsAdmin(false);
    try {
      localStorage.setItem('appvendas_test_block_active', 'true');
      localStorage.removeItem('appvendas_pix_paid');
    } catch {
      // ignore
    }
    const expiredPast = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const updated: SubscriptionState = {
      ...subscription,
      isSubscribed: false,
      trialDurationDays: 0,
      trialStartDate: expiredPast,
      subscriptionExpiresAt: expiredPast,
      lastPaymentRef: undefined,
    };
    setSubscription(updated);
    setCurrentTimeMs(Date.now());
    showToast('error', '⛔ Modo Teste de Bloqueio Ativado', 'O sistema foi bloqueado imediatamente! Este é o bloqueio total que o usuário não pago vê.');
  };

  // Exit testing block mode and return to admin - strictly requires master password
  const exitTestBlockMode = (masterPassword?: string): boolean => {
    if (!checkIsMasterPassword(masterPassword)) {
      showToast('error', 'Senha Mestra Obrigatória', 'Digite a senha mestra confidencial para retornar ao modo administradora.');
      return false;
    }
    setIsTestBlockMode(false);
    try {
      localStorage.removeItem('appvendas_test_block_active');
    } catch {
      // ignore
    }
    setAdminMode();
    showToast('success', '👑 Teste Encerrado', 'Você retornou ao seu painel de administradora com acesso vitalício!');
    return true;
  };

  const resetTrial = () => {
    setIsTestBlockMode(false);
    try {
      localStorage.removeItem('appvendas_test_block_active');
    } catch {}
    const updated: SubscriptionState = {
      ...DEFAULT_SUBSCRIPTION,
      trialStartDate: new Date().toISOString(),
      trialDurationDays: 2,
      isSubscribed: false,
    };
    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updated));
    } catch {}
    setSubscription(updated);
    setCurrentTimeMs(Date.now());
    showToast('success', '🎁 Teste Grátis de 2 Dias Liberado!', 'Você tem 48 horas de acesso completo com todas as ferramentas.');
  };

  const extendTrialForCurrentDevice = (days: number = 2, clientName?: string, clientPhone?: string) => {
    setIsTestBlockMode(false);
    setIsAdmin(false);
    try {
      localStorage.removeItem('appvendas_test_block_active');
      localStorage.removeItem('appvendas_pix_paid');
    } catch {}

    const nowIso = new Date().toISOString();
    const updated: SubscriptionState = {
      ...DEFAULT_SUBSCRIPTION,
      trialStartDate: nowIso,
      trialDurationDays: days,
      isSubscribed: false,
      planPrice: 94.98,
      planName: `Plano Pro (+${days} Dias de Teste Liberado)`,
      lastPaymentRef: clientName ? `LIBERACAO-${clientName.toUpperCase().replace(/\s+/g, '_')}` : undefined,
    };

    try {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updated));
    } catch {}

    setSubscription(updated);
    setCurrentTimeMs(Date.now());

    try {
      sounds.playBankNotification();
      confetti({
        particleCount: 110,
        spread: 90,
        origin: { y: 0.4 },
      });
    } catch {}

    const targetGreeting = clientName ? `Olá ${clientName}! ` : '';
    showToast(
      'success',
      '🎉 Teste Estendido por +2 Dias!',
      `${targetGreeting}Seu acesso foi liberado com sucesso por mais 48 horas pela Administradora Márcia Alves!`
    );
  };

  const addExtendedTrialClient = (
    clientName: string, 
    clientPhone: string, 
    days: number = 2, 
    notes?: string
  ): ExtendedTrialClient => {
    const trimmedName = clientName.trim() || 'Cliente';
    const cleanPhone = clientPhone.replace(/\D/g, '');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

    const newRecord: ExtendedTrialClient = {
      id: `ext_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clientName: trimmedName,
      clientPhone: clientPhone.trim(),
      extendedAt: now.toISOString(),
      expiresAt,
      daysAdded: days,
      status: 'ACTIVE',
      notes: notes?.trim() || undefined,
    };

    setExtendedTrialClients(prev => {
      // Remove any prior entry with exact same clean digits to avoid clutter
      const filtered = prev.filter(c => {
        const digits = c.clientPhone.replace(/\D/g, '');
        return cleanPhone.length < 8 || digits !== cleanPhone;
      });
      const updated = [newRecord, ...filtered];
      try {
        localStorage.setItem(STORAGE_EXTENDED_TRIAL_CLIENTS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    try {
      sounds.playPixSuccess();
    } catch {}

    showToast(
      'success',
      '✅ Cliente Liberado!',
      `${trimmedName} teve o teste estendido por mais ${days} dias com sucesso.`
    );

    return newRecord;
  };

  const removeExtendedTrialClient = (id: string) => {
    setExtendedTrialClients(prev => {
      const updated = prev.filter(c => c.id !== id);
      try {
        localStorage.setItem(STORAGE_EXTENDED_TRIAL_CLIENTS_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    showToast('info', 'Liberação Removida', 'O registro de liberação foi excluído.');
  };

  const checkAndApplyClientTrialExtension = (nameOrPhone: string): boolean => {
    const raw = (nameOrPhone || '').trim();
    if (!raw) return false;

    const queryDigits = raw.replace(/\D/g, '');
    const queryLower = raw.toLowerCase();

    let currentList = extendedTrialClients;
    if (currentList.length === 0) {
      try {
        const saved = localStorage.getItem(STORAGE_EXTENDED_TRIAL_CLIENTS_KEY);
        if (saved) currentList = JSON.parse(saved);
      } catch {}
    }

    const matched = currentList.find(c => {
      const clientDigits = c.clientPhone.replace(/\D/g, '');
      const clientNameLower = c.clientName.toLowerCase();

      // Check phone match
      if (queryDigits.length >= 8 && clientDigits.length >= 8) {
        if (clientDigits.includes(queryDigits) || queryDigits.includes(clientDigits) || clientDigits.endsWith(queryDigits.slice(-8))) {
          return true;
        }
      }

      // Check name match
      if (queryLower.length >= 3) {
        if (clientNameLower.includes(queryLower) || queryLower.includes(clientNameLower)) {
          return true;
        }
      }

      return false;
    });

    if (matched) {
      extendTrialForCurrentDevice(matched.daysAdded || 2, matched.clientName, matched.clientPhone);
      return true;
    }

    return false;
  };

  // Auto-activate trial extension if opened via custom link (?liberar=teste2dias or ?extensao=2dias)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const urlParams = new URLSearchParams(window.location.search);
      const liberar = urlParams.get('liberar') || urlParams.get('extensao');
      if (liberar === 'teste2dias' || liberar === '2dias' || urlParams.has('liberar_teste')) {
        const clientName = urlParams.get('cliente') || '';
        const clientPhone = urlParams.get('celular') || '';
        extendTrialForCurrentDevice(2, clientName, clientPhone);

        // Clean parameters without page refresh
        const url = new URL(window.location.href);
        url.searchParams.delete('liberar');
        url.searchParams.delete('extensao');
        url.searchParams.delete('liberar_teste');
        url.searchParams.delete('cliente');
        url.searchParams.delete('celular');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    } catch {}
  }, []);

  // Real-time URL Store Listener: ensures that opening a shared link (?loja=... or ?nome=... or ?p=...)
  // immediately updates the active company, store title, products catalog, and merchant name on any device or PWA
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const cleanSearch = (window.location.search || '').replace(/%26/gi, '&');
      const params = new URLSearchParams(cleanSearch);
      const urlLoja = params.get('loja') || pathLojaName;
      const urlNome = params.get('nome') || ssrInitialStore?.company?.name || '';
      const urlCompId = params.get('empresa') || params.get('id') || ssrInitialStore?.company?.id || null;
      const urlCanal = (params.get('canal') || ssrInitialStore?.canal || '').trim();
      const incomingName = (urlNome || (urlLoja ? decodeURIComponent(urlLoja).replace(/[-_]/g, ' ') : '')).trim();
      const targetUrlSlug = normalizeStoreSlug(urlLoja || incomingName);

      if (params.get('install') === '1') {
        const isStandaloneNow =
          window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone === true;
        if (!isStandaloneNow) {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-pwa-install-modal'));
          }, 450);
        }
        try {
          const cleanedInstallUrl = new URL(window.location.href);
          cleanedInstallUrl.searchParams.delete('install');
          window.history.replaceState({}, '', cleanedInstallUrl.pathname + (cleanedInstallUrl.search || '') + (cleanedInstallUrl.hash || ''));
        } catch {}
      }

      // Persist active store slug so installed apps opened from home screen load the right store
      if (targetUrlSlug) {
        try {
          localStorage.setItem('appvendas_last_visited_store_slug', targetUrlSlug);
          localStorage.setItem('appvendas_last_store_slug', targetUrlSlug);
        } catch {}
      }
      if (incomingName) {
        try {
          localStorage.setItem('appvendas_last_visited_store_name', incomingName);
        } catch {}
      }

      // 1. Unpack products FIRST synchronously if passed in URL (?p=...) so we never lose them to stale server caches
      let urlParsedProducts: Product[] = [];
      const pParam = params.get('p');
      if (pParam) {
        try {
          const rawItems = pParam.split('*').filter(Boolean);
          urlParsedProducts = rawItems.map((itemStr, idx) => {
            const parts = itemStr.split('_');
            const rawName = (parts[0] || '').replace(/\+/g, ' ');
            let name = `Produto ${idx + 1}`;
            try {
              name = decodeURIComponent(rawName) || name;
            } catch {
              name = rawName || name;
            }
            const salePrice = parseFloat(parts[1]) || 0;
            const currentStock = parseInt(parts[2], 10) || 50;
            const unit = (parts[3] as UnitType) || 'UN';
            const rawCat = (parts[4] || 'Outros').replace(/\+/g, ' ');
            let category: Category = 'Outros';
            try {
              category = (decodeURIComponent(rawCat) as Category) || 'Outros';
            } catch {
              category = (rawCat as Category) || 'Outros';
            }
            const wholesalePrice = parts[5] ? parseFloat(parts[5]) : undefined;
            const wholesaleMinQty = parts[6] ? parseInt(parts[6], 10) : undefined;
            return {
              id: `p_share_${idx + 1}`,
              name,
              sku: `PROD-${idx + 1}`,
              barcode: '',
              salePrice,
              costPrice: 0,
              currentStock,
              minStock: 2,
              maxStock: 1000,
              unit,
              category,
              itemsPerUnit: 1,
              description: '',
              wholesalePrice,
              wholesaleMinQty,
              updatedAt: new Date().toISOString()
            };
          });

          if (urlParsedProducts.length > 0) {
            const explicitVer = Number(params.get('v')) || 0;
            urlCatalogInfoRef.current = {
              hasUrlProducts: true,
              hasExplicitVersion: Boolean(params.get('v')),
              urlVersion: explicitVer,
              urlSlug: targetUrlSlug
            };
            setProducts(urlParsedProducts);
            const targetId = urlCompId || activeCompanyId;
            try {
              localStorage.setItem(getTenantKey('products', targetId), JSON.stringify(urlParsedProducts));
              if (targetId === DEFAULT_COMPANY_ID) {
                localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(urlParsedProducts));
              }
            } catch {}
          }
        } catch (e) {
          console.error('Error unpacking compact products in URL listener:', e);
        }
      }

      const matchingCompany = companies.find(c => {
        const cNorm = normalizeStoreSlug(c.name);
        const sNorm = normalizeStoreSlug(c.slug);
        return (targetUrlSlug && (cNorm === targetUrlSlug || sNorm === targetUrlSlug)) ||
          (urlCompId && c.id === urlCompId && (c.name === 'Minha Loja' || c.name === 'appvendas' || cNorm === targetUrlSlug));
      });
      const resolvedUrlCompId = matchingCompany?.id || (targetUrlSlug ? `empresa_${targetUrlSlug}` : (urlCompId || activeCompanyId));

      if (resolvedUrlCompId && resolvedUrlCompId !== activeCompanyId) {
        setActiveCompanyId(resolvedUrlCompId);
        try { localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, resolvedUrlCompId); } catch {}
      }

      if (urlParsedProducts.length > 0) {
        try {
          localStorage.setItem(getTenantKey('products', resolvedUrlCompId), JSON.stringify(urlParsedProducts));
          if (resolvedUrlCompId === DEFAULT_COMPANY_ID) {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(urlParsedProducts));
          }
        } catch {}
      }

      if (incomingName && incomingName.toLowerCase() !== 'minha loja' && incomingName.toLowerCase() !== 'loja') {
        const targetSlug = normalizeStoreSlug(incomingName) || incomingName.toLowerCase().replace(/\s+/g, '-');
        setCompanies(prev => {
          const isPlaceholder = (c: CompanyAccount) => c.name === 'Minha Loja' || c.name === 'appvendas';
          const idx = prev.findIndex(c => 
            normalizeStoreSlug(c.slug) === normalizeStoreSlug(targetSlug) || 
            normalizeStoreSlug(c.name) === normalizeStoreSlug(incomingName) ||
            (resolvedUrlCompId && c.id === resolvedUrlCompId && (isPlaceholder(c) || normalizeStoreSlug(c.name) === normalizeStoreSlug(incomingName)))
          );
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              name: incomingName,
              slug: targetSlug,
              logoEmoji: params.get('emoji') || updated[idx].logoEmoji,
              phone: params.get('zap') || updated[idx].phone,
            };
            try { localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(updated)); } catch {}
            return updated;
          } else {
            const newComp: CompanyAccount = {
              id: resolvedUrlCompId || `empresa_${Date.now()}`,
              name: incomingName,
              slug: targetSlug,
              ownerName: 'Lojista',
              phone: params.get('zap') || '',
              email: '',
              category: 'Comércio & Serviços',
              logoEmoji: params.get('emoji') || '🏪',
              createdAt: new Date().toISOString()
            };
            const updated = [...prev, newComp];
            try { localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(updated)); } catch {}
            return updated;
          }
        });

        const urlZap = params.get('zap') || params.get('cel') || params.get('celular') || '';
        const cleanUrlZap = urlZap.replace(/\D/g, '');
        setPaymentSettings(ps => ({
          ...ps,
          merchantName: incomingName,
          ...(cleanUrlZap.length >= 8 ? { merchantWhatsapp: cleanUrlZap } : {}),
          sellers: ps.sellers ? ps.sellers.map((s, idx) => ({
            ...s,
            merchantName: incomingName,
            ...(idx === 0 && cleanUrlZap.length >= 8 && (!s.whatsapp || s.id === ps.activeSellerId) ? { whatsapp: cleanUrlZap } : {})
          })) : ps.sellers
        }));

        if (typeof document !== 'undefined') {
          document.title = `${incomingName} - Catálogo & Pedidos`;
        }
      }

      const urlPhoneDigits = (params.get('cel') || params.get('celular') || params.get('zap') || '').replace(/\D/g, '');
      const isRootAppLaunch = !targetUrlSlug && !urlCompId && !pathShortCode && urlPhoneDigits.length < 8;
      const ownCompanySlug = hasRegisteredCompanyRef.current
        ? (normalizeStoreSlug(currentCompany?.slug || currentCompany?.name) || activeCompanyId || '')
        : '';

      // ISOLATION RULE: If opening root URL (https://www.apvendas1.com.br/) without an explicit store URL or locally registered company,
      // stay 100% clean (products = []) so the visitor can register their own company, password, phone and products!
      if (isRootAppLaunch && (!hasRegisteredCompanyRef.current || !ownCompanySlug || isPlaceholderCompanyName(currentCompany?.name))) {
        return;
      }

      const fetchEndpoint = pathShortCode
        ? `/api/short/${encodeURIComponent(pathShortCode)}?t=${Date.now()}`
        : targetUrlSlug || urlCompId
          ? `/api/stores/${encodeURIComponent(targetUrlSlug || urlCompId || '')}?t=${Date.now()}`
          : urlPhoneDigits.length >= 8
            ? `/api/stores/by-phone/${encodeURIComponent(urlPhoneDigits)}?t=${Date.now()}`
            : `/api/stores/${encodeURIComponent(ownCompanySlug)}?t=${Date.now()}`;

      // 2. Fetch store catalog and settings from backend API (respecting newer ?p= URL products)
      fetch(fetchEndpoint, { cache: 'no-store' })
        .then(res => {
          const ct = res.headers.get('content-type') || '';
          return res.ok && ct.includes('application/json') ? res.json() : null;
        })
        .then(data => {
          if (!data || data.isPlaceholder) {
            // If server doesn't have this store yet and URL brought products, seed the server right away
            if (urlParsedProducts.length > 0 && incomingName) {
              const compObj: CompanyAccount = {
                id: urlCompId || activeCompanyId || DEFAULT_COMPANY_ID,
                name: incomingName,
                slug: targetUrlSlug || 'loja',
                ownerName: 'Lojista',
                phone: params.get('zap') || '',
                email: '',
                category: 'Comércio & Serviços',
                logoEmoji: params.get('emoji') || '🏪',
                createdAt: new Date().toISOString()
              };
              syncStoreToServer(compObj, {
                ...paymentSettings,
                merchantName: incomingName,
                merchantWhatsapp: params.get('zap') || paymentSettings.merchantWhatsapp,
                pixKey: params.get('pix') || paymentSettings.pixKey,
              }, activeSeller, urlParsedProducts).catch(() => {});
            }
            return;
          }

          if (data.hasPassword) {
            setServerHasPassword(true);
          }

          const serverMs = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
          const urlInfo = urlCatalogInfoRef.current;

          if (urlParsedProducts.length > 0) {
            const serverHasProducts = Array.isArray(data.products) && data.products.length > 0;
            const shouldPreferServer = serverHasProducts && (
              !urlInfo.hasExplicitVersion ||
              serverMs >= urlInfo.urlVersion
            );
            if (shouldPreferServer) {
              if (data.products.length === 1 && data.products[0]?.name === 'Sal') return;
              urlCatalogInfoRef.current.hasUrlProducts = false;
              setProducts(data.products);
              const targetCompId = data.company?.id || urlCompId || activeCompanyId;
              try {
                localStorage.setItem(getTenantKey('products', targetCompId), JSON.stringify(data.products));
              } catch {}
            } else if (!serverHasProducts) {
              // Server store has 0 products — seed it with URL snapshot once
              const compObj: CompanyAccount = data.company?.name ? { ...data.company, name: incomingName || data.company.name } : {
                id: urlCompId || activeCompanyId || DEFAULT_COMPANY_ID,
                name: incomingName || currentCompany.name,
                slug: targetUrlSlug || 'loja',
                ownerName: 'Lojista',
                phone: params.get('zap') || '',
                email: '',
                category: 'Comércio & Serviços',
                logoEmoji: params.get('emoji') || '🏪',
                createdAt: new Date().toISOString()
              };
              syncStoreToServer(compObj, {
                ...paymentSettings,
                ...(data.paymentSettings || {}),
                merchantName: incomingName || compObj.name,
                merchantWhatsapp: params.get('zap') || paymentSettings.merchantWhatsapp,
                pixKey: params.get('pix') || paymentSettings.pixKey,
              }, activeSeller, urlParsedProducts).catch(() => {});
            }
          } else if (Array.isArray(data.products)) {
            if (data.products.length === 1 && data.products[0]?.name === 'Sal') {
              return;
            }
            if (data.products.length > 0 || targetUrlSlug || pathShortCode) {
              setProducts(prev => {
                const prevStr = JSON.stringify(prev);
                const newStr = JSON.stringify(data.products);
                return prevStr === newStr ? prev : data.products;
              });
              const targetCompId = data.company?.id || urlCompId || activeCompanyId;
              try {
                localStorage.setItem(getTenantKey('products', activeCompanyId), JSON.stringify(data.products));
                localStorage.setItem(getTenantKey('products', targetCompId), JSON.stringify(data.products));
                if (targetCompId === DEFAULT_COMPANY_ID || activeCompanyId === DEFAULT_COMPANY_ID) {
                  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
                }
              } catch {}
            }
          }

          const isDefaultName = (n?: string) => !n || n === 'Minha Loja' || n === 'Minha Empresa' || n === 'appvendas' || n === 'App vendas' || n === 'App Vendas';
          const matchesOwnRegistered = isRootAppLaunch && hasRegisteredCompanyRef.current && (
            data.company?.id === activeCompanyId ||
            normalizeStoreSlug(data.slug || data.company?.name) === ownCompanySlug
          );
          const incomingMatchesCurrent = Boolean(targetUrlSlug || urlCompId || pathShortCode || matchesOwnRegistered);

          if (data.company && data.company.name && !data.isPlaceholder && incomingMatchesCurrent) {
            const targetCompId = data.company.id || urlCompId || activeCompanyId;
            const resolvedCompName = incomingName || data.company.name;
            const resolvedCompSlug = data.slug || normalizeStoreSlug(resolvedCompName) || data.company.slug;
            setCompanies(prev => {
              const idx = prev.findIndex(c => c.id === targetCompId || normalizeStoreSlug(c.slug) === normalizeStoreSlug(resolvedCompSlug));
              if (idx >= 0) {
                const merged = {
                  ...prev[idx],
                  ...data.company,
                  id: targetCompId,
                  name: resolvedCompName,
                  slug: resolvedCompSlug
                };
                if (JSON.stringify(prev[idx]) === JSON.stringify(merged)) return prev;
                const copy = [...prev];
                copy[idx] = merged;
                try { localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(copy)); } catch {}
                return copy;
              }
              const next = [...prev, { ...data.company, id: targetCompId, name: resolvedCompName, slug: resolvedCompSlug }];
              try { localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(next)); } catch {}
              return next;
            });
            if (targetCompId && targetCompId !== activeCompanyId) {
              setActiveCompanyId(targetCompId);
              try { localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, targetCompId); } catch {}
            }
            if (resolvedCompName && typeof document !== 'undefined') {
              document.title = `${resolvedCompName} - Catálogo & Pedidos`;
            }
            if (resolvedCompSlug) {
              try {
                localStorage.setItem('appvendas_last_visited_store_slug', resolvedCompSlug);
                localStorage.setItem('appvendas_last_store_slug', resolvedCompSlug);
                localStorage.setItem('appvendas_last_visited_store_name', resolvedCompName);
              } catch {}
            }
          }
          if (data.paymentSettings && incomingMatchesCurrent) {
            const targetCompId = data.company?.id || urlCompId || activeCompanyId;
            setPaymentSettings(ps => {
              const rawSellerList = Array.isArray(data.paymentSettings.sellers)
                ? data.paymentSettings.sellers.map((s: SellerProfile) => ({
                    ...s,
                    merchantName: isDefaultName(s.merchantName) ? (incomingName || data.company?.name || ps.merchantName) : (incomingName || data.company?.name || s.merchantName)
                  }))
                : ps.sellers;
              const matchedCanalSeller = urlCanal && Array.isArray(rawSellerList)
                ? (rawSellerList.find((s: SellerProfile) => s.id === urlCanal) ||
                   (/^canal_(\d+)$/i.test(urlCanal) ? rawSellerList[parseInt(urlCanal.replace(/\D/g, ''), 10) - 1] : undefined))
                : undefined;
              const resolvedMerchant = incomingName || data.company?.name || (isDefaultName(data.paymentSettings.merchantName) ? ps.merchantName : data.paymentSettings.merchantName);
              const next = {
                ...ps,
                ...data.paymentSettings,
                ...(matchedCanalSeller ? {
                  activeSellerId: matchedCanalSeller.id,
                  merchantWhatsapp: matchedCanalSeller.whatsapp || data.paymentSettings.merchantWhatsapp || ps.merchantWhatsapp,
                  ...(matchedCanalSeller.pixKey ? { pixKey: matchedCanalSeller.pixKey } : {}),
                  ...(matchedCanalSeller.receivingBank ? { receivingBank: matchedCanalSeller.receivingBank } : {})
                } : {}),
                merchantName: resolvedMerchant,
                sellers: rawSellerList
              };
              try {
                localStorage.setItem(getTenantKey('payment_settings', targetCompId), JSON.stringify(next));
                localStorage.setItem(getTenantKey('payment_settings', activeCompanyId), JSON.stringify(next));
              } catch {}
              return JSON.stringify(ps) === JSON.stringify(next) ? ps : next;
            });
          }
        })
        .catch(() => {});
    } catch {}
  }, []);

  // Live Refs so SSE, BroadcastChannel, Polling & Resume listeners NEVER operate on stale closures
  const productsRef = useRef<Product[]>(products);
  productsRef.current = products;
  const currentCompanyRef = useRef<CompanyAccount>(currentCompany);
  currentCompanyRef.current = currentCompany;
  const activeCompanyIdRef = useRef<string>(activeCompanyId);
  activeCompanyIdRef.current = activeCompanyId;
  const paymentSettingsRef = useRef<PaymentSettings>(paymentSettings);
  paymentSettingsRef.current = paymentSettings;
  const isCompanyAreaUnlockedRef = useRef<boolean>(isCompanyAreaUnlocked);
  isCompanyAreaUnlockedRef.current = isCompanyAreaUnlocked;
  const isAdminRef = useRef<boolean>(isAdmin);
  isAdminRef.current = isAdmin;
  const isMasterAdminRef = useRef<boolean>(isMasterAdmin);
  isMasterAdminRef.current = isMasterAdmin;
  const activeSellerRef = useRef<SellerProfile | undefined>(undefined);
  const refreshStoreCatalogRef = useRef<(() => Promise<boolean>) | null>(null);
  const lastSseActivityRef = useRef<number>(Date.now());
  const forceReconnectSseRef = useRef<(() => void) | null>(null);

  const applyIncomingStorePayload = (
    storeData: any,
    opts?: {
      slug?: string;
      cleanSlug?: string;
      companyId?: string;
      previousSlugs?: string[];
      fromShortCode?: boolean;
      fromPhone?: boolean;
    }
  ): boolean => {
    try {
      if (!storeData || storeData.isPlaceholder) return false;

      const curParams = typeof window !== 'undefined'
        ? new URLSearchParams((window.location.search || '').replace(/%26/gi, '&'))
        : null;
      const curUrlLoja = curParams?.get('loja') || curParams?.get('empresa') || pathLojaName;
      const curUrlZap = (curParams?.get('zap') || curParams?.get('cel') || curParams?.get('celular') || curParams?.get('whatsapp') || '').replace(/\D/g, '');
      const curUrlCanal = (curParams?.get('canal') || ssrInitialStore?.canal || '').trim();
      const isOnRootUrl = !curUrlLoja && !pathShortCode && curUrlZap.length < 8;

      if (isOnRootUrl && !hasRegisteredCompanyRef.current) {
        return false;
      }

      const activeComp = currentCompanyRef.current;
      const activeId = activeCompanyIdRef.current;
      const activeNameIsPlaceholder = isPlaceholderCompanyName(activeComp?.name);

      const curUrlSlug = normalizeStoreSlug(curUrlLoja || '');
      const curUrlClean = cleanSlugAlphanumeric(curUrlSlug);
      const ownSlug = normalizeStoreSlug(activeComp?.slug || activeComp?.name || '');
      const ownClean = cleanSlugAlphanumeric(ownSlug);

      const incomingSlug = normalizeStoreSlug(opts?.slug || storeData.slug || storeData.company?.slug || storeData.company?.name || '');
      const incomingClean = cleanSlugAlphanumeric(opts?.cleanSlug || storeData.cleanSlug || incomingSlug);
      const incomingCompId = opts?.companyId || storeData.company?.id || '';
      const incomingPrevSlugs: string[] = Array.isArray(opts?.previousSlugs)
        ? opts.previousSlugs
        : (Array.isArray(storeData.previousSlugs) ? storeData.previousSlugs : []);

      const matchesSlug = (targetNorm: string, targetClean: string) => {
        if (!targetNorm && !targetClean) return false;
        if (incomingSlug && targetNorm && incomingSlug === targetNorm) return true;
        if (incomingClean && targetClean && incomingClean === targetClean) return true;
        return incomingPrevSlugs.some(ps => {
          const pn = normalizeStoreSlug(ps);
          const pc = cleanSlugAlphanumeric(ps);
          return (pn && targetNorm && pn === targetNorm) || (pc && targetClean && pc === targetClean);
        });
      };

      const isMatch = Boolean(
        opts?.fromShortCode ||
        opts?.fromPhone ||
        (curUrlZap.length >= 8 && opts?.fromPhone !== false) ||
        (curUrlLoja && matchesSlug(curUrlSlug, curUrlClean)) ||
        (incomingCompId && incomingCompId === activeId) ||
        (!isOnRootUrl && curUrlLoja && storeData.company?.name && matchesSlug(normalizeStoreSlug(storeData.company.name), cleanSlugAlphanumeric(storeData.company.name))) ||
        (isOnRootUrl && hasRegisteredCompanyRef.current && !activeNameIsPlaceholder && matchesSlug(ownSlug, ownClean))
      );

      if (!isMatch) return false;

      if (Array.isArray(storeData.products) && storeData.products.length === 1 && storeData.products[0]?.name === 'Sal') {
        return false;
      }

      if (storeData.hasPassword) {
        setServerHasPassword(true);
      }

      const incomingProducts: Product[] | null = Array.isArray(storeData.products) ? storeData.products : null;
      const incomingCompany = storeData.company && storeData.company.name ? storeData.company : null;
      const resolvedCompName = incomingCompany && !isPlaceholderCompanyName(incomingCompany.name)
        ? incomingCompany.name
        : activeComp?.name;
      const resolvedSlug = normalizeStoreSlug(storeData.slug || incomingCompany?.slug || resolvedCompName) || activeComp?.slug;

      let resolvedSettingsForSig: PaymentSettings = paymentSettingsRef.current;
      let resolvedSellerIdForSig = paymentSettingsRef.current.activeSellerId || 'vendedor_principal';

      if (storeData.paymentSettings) {
        const psPrev = paymentSettingsRef.current;
        const rawIncomingName = (storeData.paymentSettings.merchantName || '').trim();
        const isIncomingDefaultMerchant = isPlaceholderCompanyName(rawIncomingName);
        const allowNameSync = activeNameIsPlaceholder || isMatch;
        const nextMerchant = isIncomingDefaultMerchant
          ? (resolvedCompName || psPrev.merchantName)
          : (allowNameSync ? (rawIncomingName || resolvedCompName || psPrev.merchantName) : psPrev.merchantName);

        const rawSellerList = Array.isArray(storeData.paymentSettings.sellers) && storeData.paymentSettings.sellers.length > 0
          ? storeData.paymentSettings.sellers.map((s: SellerProfile) => ({
              ...s,
              merchantName: isPlaceholderCompanyName(s.merchantName) ? nextMerchant : s.merchantName
            }))
          : psPrev.sellers;

        const matchedCanalSeller = curUrlCanal && Array.isArray(rawSellerList)
          ? (rawSellerList.find((s: SellerProfile) => s.id === curUrlCanal) ||
             (/^canal_(\d+)$/i.test(curUrlCanal) ? rawSellerList[parseInt(curUrlCanal.replace(/\D/g, ''), 10) - 1] : undefined))
          : undefined;

        const nextPs: PaymentSettings = {
          ...psPrev,
          ...storeData.paymentSettings,
          ...(matchedCanalSeller ? {
            activeSellerId: matchedCanalSeller.id,
            merchantWhatsapp: matchedCanalSeller.whatsapp || storeData.paymentSettings.merchantWhatsapp || psPrev.merchantWhatsapp,
            ...(matchedCanalSeller.pixKey ? { pixKey: matchedCanalSeller.pixKey } : {}),
            ...(matchedCanalSeller.receivingBank ? { receivingBank: matchedCanalSeller.receivingBank } : {})
          } : {}),
          merchantName: nextMerchant,
          sellers: rawSellerList
        };
        resolvedSettingsForSig = nextPs;
        resolvedSellerIdForSig = nextPs.activeSellerId || rawSellerList?.[0]?.id || 'vendedor_principal';

        setPaymentSettings(prev => (JSON.stringify(prev) === JSON.stringify(nextPs) ? prev : nextPs));
        try {
          localStorage.setItem(getTenantKey('payment_settings', activeId), JSON.stringify(nextPs));
          if (incomingCompId && incomingCompId !== activeId) {
            localStorage.setItem(getTenantKey('payment_settings', incomingCompId), JSON.stringify(nextPs));
          }
          if (activeId === DEFAULT_COMPANY_ID || incomingCompId === DEFAULT_COMPANY_ID) {
            localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(nextPs));
          }
        } catch {}
      }

      const nextProductsForSig = incomingProducts !== null ? incomingProducts : productsRef.current;

      // Update auto-sync signature BEFORE applying React state so remote updates never echo back to server
      try {
        lastSyncedSignatureRef.current = JSON.stringify({
          companyId: activeComp?.id || activeId,
          companyName: resolvedCompName,
          paymentSettings: resolvedSettingsForSig,
          activeSellerId: resolvedSellerIdForSig,
          products: nextProductsForSig
        });
      } catch {}

      if (incomingProducts !== null) {
        setProducts(prevProducts => {
          const prevStr = JSON.stringify(prevProducts);
          const newStr = JSON.stringify(incomingProducts);
          if (prevStr === newStr) return prevProducts;
          return incomingProducts;
        });
        try {
          localStorage.setItem(getTenantKey('products', activeId), JSON.stringify(incomingProducts));
          if (incomingCompId && incomingCompId !== activeId) {
            localStorage.setItem(getTenantKey('products', incomingCompId), JSON.stringify(incomingProducts));
          }
          if (activeId === DEFAULT_COMPANY_ID || incomingCompId === DEFAULT_COMPANY_ID) {
            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(incomingProducts));
          }
        } catch {}
      }

      if (incomingCompany && !isPlaceholderCompanyName(incomingCompany.name)) {
        setCompanies(prev => {
          const idx = prev.findIndex(c =>
            c.id === activeId ||
            (incomingCompId && c.id === incomingCompId) ||
            (resolvedSlug && (normalizeStoreSlug(c.slug) === resolvedSlug || cleanSlugAlphanumeric(c.slug) === cleanSlugAlphanumeric(resolvedSlug))) ||
            incomingPrevSlugs.some(ps => normalizeStoreSlug(c.slug) === normalizeStoreSlug(ps))
          );
          if (idx < 0) return prev;
          const merged: CompanyAccount = {
            ...prev[idx],
            ...incomingCompany,
            id: prev[idx].id, // NEVER overwrite local tenant ID key used by activeCompanyId
            name: incomingCompany.name,
            slug: resolvedSlug || prev[idx].slug
          };
          if (JSON.stringify(prev[idx]) === JSON.stringify(merged)) return prev;
          const next = [...prev];
          next[idx] = merged;
          try { localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(next)); } catch {}
          return next;
        });

        try {
          if (resolvedSlug) {
            localStorage.setItem('appvendas_last_visited_store_slug', resolvedSlug);
            localStorage.setItem('appvendas_last_store_slug', resolvedSlug);
          }
          localStorage.setItem('appvendas_last_visited_store_name', incomingCompany.name);
        } catch {}
      }

      return true;
    } catch (err) {
      console.warn('[LiveSync] Apply error:', err);
      return false;
    }
  };

  const applyIncomingStorePayloadRef = useRef(applyIncomingStorePayload);
  applyIncomingStorePayloadRef.current = applyIncomingStorePayload;

  // Real-Time Live Push Synchronization via Server-Sent Events (SSE) + Same-Device BroadcastChannel & Storage
  // Ensures all installed PWAs (Android/iOS/Desktop) receive product, stock, price, and company changes instantly
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let watchdogInterval: any = null;
    let isDisposed = false;

    const handleServerVersionCheck = (rawVersion?: string) => {
      const nextVer = String(rawVersion || '').replace(/^v/i, '').trim();
      if (!nextVer) return;
      setAppVersion(nextVer);
      if (nextVer !== CLIENT_APP_VERSION) {
        window.dispatchEvent(new CustomEvent('app-update-available', { detail: { version: nextVer } }));
        try {
          const tsKey = `pwa_version_upgraded_ts_${nextVer}`;
          const lastAttempt = Number(sessionStorage.getItem(tsKey) || '0');
          if (Date.now() - lastAttempt >= 15000 && !(window as any).__is_reloading_app) {
            sessionStorage.setItem(tsKey, String(Date.now()));
            if (typeof (window as any).__clearAppCacheAndReload === 'function') {
              (window as any).__clearAppCacheAndReload(nextVer);
            }
          }
        } catch {}
      }
    };

    const connectLiveSync = (forceNew = false) => {
      if (isDisposed) return;
      if (eventSource) {
        if (!forceNew && eventSource.readyState === 1 && Date.now() - lastSseActivityRef.current < 22000) {
          return;
        }
        try { eventSource.close(); } catch {}
        eventSource = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      try {
        lastSseActivityRef.current = Date.now();
        eventSource = new EventSource('/api/live-sync');

        eventSource.onopen = () => {
          lastSseActivityRef.current = Date.now();
        };

        eventSource.onmessage = (e) => {
          lastSseActivityRef.current = Date.now();
          try {
            if (!e.data) return;
            const msg = JSON.parse(e.data);
            if (msg.type === 'CONNECTED') {
              if (msg.version) handleServerVersionCheck(msg.version);
              refreshStoreCatalogRef.current?.().catch(() => {});
            } else if (msg.type === 'PING') {
              if (msg.version) handleServerVersionCheck(msg.version);
            } else if (msg.type === 'STORE_UPDATED' && msg.storeData) {
              applyIncomingStorePayloadRef.current(msg.storeData, {
                slug: msg.slug,
                cleanSlug: msg.cleanSlug,
                companyId: msg.companyId,
                previousSlugs: msg.previousSlugs
              });
            }
          } catch (err) {
            console.warn('[LiveSync] Parse error:', err);
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            try { eventSource.close(); } catch {}
            eventSource = null;
          }
          if (!isDisposed) {
            reconnectTimeout = setTimeout(() => connectLiveSync(true), 2500);
          }
        };
      } catch (err) {
        console.warn('[LiveSync] Connection failed:', err);
        if (!isDisposed) {
          reconnectTimeout = setTimeout(() => connectLiveSync(true), 4000);
        }
      }
    };

    forceReconnectSseRef.current = () => {
      const staleOrClosed = !eventSource || eventSource.readyState !== 1 || Date.now() - lastSseActivityRef.current > 12000;
      if (staleOrClosed) {
        connectLiveSync(true);
      }
    };

    connectLiveSync(true);

    // Watchdog: mobile iOS/Android standalone PWAs often drop TCP silently after background sleep without firing onerror
    watchdogInterval = setInterval(() => {
      if (isDisposed || document.visibilityState === 'hidden') return;
      if (!eventSource || eventSource.readyState === 2 || Date.now() - lastSseActivityRef.current > 28000) {
        connectLiveSync(true);
        refreshStoreCatalogRef.current?.().catch(() => {});
      }
    }, 10000);

    // 0ms Same-Device Cross-Tab / Installed-PWA BroadcastChannel Sync
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('appvendas_realtime_sync');
        bc.onmessage = (ev) => {
          const msg = ev?.data;
          if (msg?.type === 'STORE_UPDATED' && msg.storeData) {
            applyIncomingStorePayloadRef.current(msg.storeData, {
              slug: msg.slug,
              cleanSlug: msg.cleanSlug,
              companyId: msg.companyId,
              previousSlugs: msg.previousSlugs
            });
          }
        };
      } catch {}
    }

    // Cross-context localStorage sync event when another window/tab on same origin updates tenant data
    const onStorageSync = (ev: StorageEvent) => {
      if (!ev.key || !ev.newValue) return;
      const curId = activeCompanyIdRef.current;
      const prodKey = getTenantKey('products', curId);
      const psKey = getTenantKey('payment_settings', curId);
      if (ev.key === prodKey || (curId === DEFAULT_COMPANY_ID && ev.key === STORAGE_KEYS.PRODUCTS)) {
        try {
          const parsed = JSON.parse(ev.newValue);
          if (Array.isArray(parsed)) {
            setProducts(prev => (JSON.stringify(prev) === JSON.stringify(parsed) ? prev : parsed));
          }
        } catch {}
      } else if (ev.key === psKey || (curId === DEFAULT_COMPANY_ID && ev.key === STORAGE_KEYS.PAYMENT_SETTINGS) || ev.key === STORAGE_COMPANIES_KEY) {
        refreshStoreCatalogRef.current?.().catch(() => {});
      }
    };
    window.addEventListener('storage', onStorageSync);

    (window as any).__closeLiveSync = () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (watchdogInterval) clearInterval(watchdogInterval);
      if (eventSource) {
        try { eventSource.close(); } catch {}
        eventSource = null;
      }
      if (bc) {
        try { bc.close(); } catch {}
        bc = null;
      }
    };

    return () => {
      isDisposed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (watchdogInterval) clearInterval(watchdogInterval);
      window.removeEventListener('storage', onStorageSync);
      if (bc) {
        try { bc.close(); } catch {}
        bc = null;
      }
      if (eventSource) {
        try { eventSource.close(); } catch {}
        eventSource = null;
      }
    };
  }, []);

  // High-Frequency Real-Time Fallback Polling (Every 4s when active) + Immediate Mobile Resume Sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isDisposed = false;
    const pollCheck = async () => {
      if (isDisposed || document.visibilityState === 'hidden') return;
      await refreshStoreCatalogRef.current?.();
    };

    const wakeAndSync = () => {
      if (isDisposed) return;
      forceReconnectSseRef.current?.();
      refreshStoreCatalogRef.current?.().catch(() => {});
    };

    const interval = setInterval(pollCheck, 4000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        wakeAndSync();
      }
    };
    const onFocus = () => wakeAndSync();
    const onOnline = () => wakeAndSync();
    const onPageShow = () => wakeAndSync();

    // If app just completed a 1-click update, refresh catalog immediately and confirm to user
    try {
      const updatedVer = sessionStorage.getItem('appvendas_just_updated_ver');
      if (updatedVer) {
        sessionStorage.removeItem('appvendas_just_updated_ver');
        refreshStoreCatalogRef.current?.().catch(() => {});
        showToast('success', `✅ Aplicativo Atualizado (v${updatedVer} Oficial)!`, 'Produtos, links e recursos sincronizados em tempo real.');
      }
    } catch {}

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      isDisposed = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  const simulateTrialExpired = () => {
    setIsAdmin(false);
    try {
      localStorage.setItem('appvendas_is_admin', 'false');
    } catch {
      // ignore
    }
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const updated: SubscriptionState = {
      ...subscription,
      trialDurationDays: 2,
      isSubscribed: false,
      trialStartDate: threeDaysAgo,
    };
    setSubscription(updated);
    setCurrentTimeMs(Date.now());
    showToast('warning', '⛔ Teste Expirado: Bloqueio Ativado', 'O período de 2 dias foi marcado como expirado. Acesso bloqueado até o Pix ser realizado!');
  };

  const simulateTrialDay = (daysFromStart: number) => {
    // E.g. day 4 means 4 days have passed
    const pastMs = daysFromStart * 24 * 60 * 60 * 1000;
    const fakeStart = new Date(Date.now() - pastMs).toISOString();
    const updated: SubscriptionState = {
      ...subscription,
      isSubscribed: false,
      trialStartDate: fakeStart,
    };
    setSubscription(updated);
    setCurrentTimeMs(Date.now());
    showToast('info', `Simulação do ${daysFromStart + 1}º Dia`, `Calculado com ${daysFromStart} dias passados.`);
  };

  // Persist companies list
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(companies));
    } catch {
      // ignore
    }
  }, [companies]);

  // Persist active company ID and reload per-company password
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, activeCompanyId);
    } catch {
      // ignore
    }
    const info = readCompanyPasswordLocal(activeCompanyId);
    setCompanyPasswordState(info.password);
    setLocalHasCustomPassword(info.hasCustom);
  }, [activeCompanyId]);

  // Sync document title, PWA Web App Manifest, and iOS home screen title with current company & channel
  useEffect(() => {
    if (!currentCompany?.name || typeof document === 'undefined') return;
    document.title = `${currentCompany.name} - Gestão & Vendas`;
    const isGeneric = ['Minha Loja', 'Minha Empresa', 'appvendas'].includes(currentCompany.name.trim());
    const slug = normalizeStoreSlug(currentCompany.slug || currentCompany.name);

    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) {
      appleTitle.setAttribute('content', (isGeneric ? 'appvendas' : currentCompany.name).slice(0, 12));
    }

    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      if (isGeneric || !slug) {
        manifestLink.setAttribute('href', '/manifest.webmanifest');
      } else {
        const canalSuffix = activeSeller?.id ? `&canal=${encodeURIComponent(activeSeller.id)}` : '';
        manifestLink.setAttribute(
          'href',
          `/manifest.webmanifest?slug=${encodeURIComponent(slug)}&nome=${encodeURIComponent(currentCompany.name)}${canalSuffix}`
        );
      }
    }
  }, [currentCompany?.name, currentCompany?.slug, paymentSettings?.activeSellerId]);

  // Sync to local storage per-tenant (Multi-tenant isolation)
  useEffect(() => {
    try {
      const tenantKey = getTenantKey('products', activeCompanyId);
      if (products.length === 0 && !hasMerchantMutationRef.current) {
        const existingTenant = localStorage.getItem(tenantKey);
        if (existingTenant) {
          try {
            const parsed = JSON.parse(existingTenant);
            if (Array.isArray(parsed) && parsed.length > 0) return;
          } catch {}
        }
      }
      localStorage.setItem(tenantKey, JSON.stringify(products));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      }
    } catch {
      // ignore
    }
  }, [products, activeCompanyId]);

  useEffect(() => {
    try {
      localStorage.setItem(getTenantKey('sales', activeCompanyId), JSON.stringify(sales));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
      }
    } catch {
      // ignore
    }
  }, [sales, activeCompanyId]);

  useEffect(() => {
    try {
      localStorage.setItem(getTenantKey('movements', activeCompanyId), JSON.stringify(movements));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
      }
    } catch {
      // ignore
    }
  }, [movements, activeCompanyId]);

  useEffect(() => {
    try {
      localStorage.setItem(getTenantKey('customers', activeCompanyId), JSON.stringify(customers));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      }
    } catch {
      // ignore
    }
  }, [customers, activeCompanyId]);

  useEffect(() => {
    try {
      localStorage.setItem(getTenantKey('suppliers', activeCompanyId), JSON.stringify(suppliers));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
      }
    } catch {
      // ignore
    }
  }, [suppliers, activeCompanyId]);

  useEffect(() => {
    try {
      localStorage.setItem(getTenantKey('shift', activeCompanyId), JSON.stringify(currentShift));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.SHIFT, JSON.stringify(currentShift));
      }
    } catch {
      // ignore
    }
  }, [currentShift, activeCompanyId]);

  useEffect(() => {
    try {
      localStorage.setItem(getTenantKey('payment_settings', activeCompanyId), JSON.stringify(paymentSettings));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(paymentSettings));
      }
    } catch {
      // ignore
    }
  }, [paymentSettings, activeCompanyId]);

  const updatePaymentSettings = (newSettings: Partial<PaymentSettings>) => {
    hasMerchantMutationRef.current = true;
    const nextSettings: PaymentSettings = { ...paymentSettings, ...newSettings };
    setPaymentSettings(nextSettings);
    try {
      localStorage.setItem(getTenantKey('payment_settings', activeCompanyId), JSON.stringify(nextSettings));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(nextSettings));
      }
    } catch {}

    let syncedCompany = currentCompany;
    if ((newSettings.merchantName && newSettings.merchantName.trim()) || newSettings.merchantWhatsapp !== undefined) {
      const cleanName = newSettings.merchantName?.trim();
      const cleanPhone = newSettings.merchantWhatsapp !== undefined ? newSettings.merchantWhatsapp.trim() : undefined;
      syncedCompany = {
        ...currentCompany,
        ...(cleanName ? { name: cleanName, slug: normalizeStoreSlug(cleanName) || cleanName.toLowerCase().replace(/\s+/g, '-') } : {}),
        ...(cleanPhone !== undefined ? { phone: cleanPhone } : {})
      };
      setCompanies(prev => {
        const next = prev.map(c => c.id === activeCompanyId ? {
          ...c,
          ...(cleanName ? { name: cleanName, slug: normalizeStoreSlug(cleanName) || cleanName.toLowerCase().replace(/\s+/g, '-') } : {}),
          ...(cleanPhone !== undefined ? { phone: cleanPhone } : {})
        } : c);
        try {
          localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      if (cleanName && typeof document !== 'undefined') {
        document.title = `${cleanName} - Gestão & Vendas`;
      }
    }

    const activeSel = nextSettings.sellers?.find(s => s.id === nextSettings.activeSellerId) || nextSettings.sellers?.[0] || activeSeller;
    syncStoreToServer(syncedCompany, nextSettings, activeSel, products, { setAsActive: true }).catch(() => {});
    showToast('success', 'Configurações Salvas', 'Preferências salvas com sucesso.');
  };

  // Sellers Management (WhatsApp, Pix, QR Code per seller)
  const [isSellerWhatsappModalOpen, setIsSellerWhatsappModalOpen] = useState(false);

  const sellers: SellerProfile[] = useMemo(() => {
    if (paymentSettings.sellers && paymentSettings.sellers.length > 0) {
      return paymentSettings.sellers;
    }
    return [
      {
        id: 'vendedor_principal',
        name: 'Atendente',
        whatsapp: paymentSettings.merchantWhatsapp || '',
        pixKey: paymentSettings.pixKey || '',
        pixKeyType: paymentSettings.pixKeyType || 'PHONE',
        merchantName: paymentSettings.merchantName || currentCompany.name || 'Minha Empresa',
        merchantCity: paymentSettings.merchantCity || 'Barcarena PA',
        receivingBank: paymentSettings.receivingBank || 'NUBANK',
        isDefault: true,
      }
    ];
  }, [paymentSettings]);

  const activeSellerId = paymentSettings.activeSellerId || sellers[0]?.id || 'vendedor_principal';

  const activeSeller: SellerProfile = useMemo(() => {
    const found = sellers.find(s => s.id === activeSellerId);
    return found || sellers[0];
  }, [sellers, activeSellerId]);
  activeSellerRef.current = activeSeller;

  // Auto-sync company store to backend ONLY when merchant has unlocked/modified data AND payload actually changed
  useEffect(() => {
    if (
      (hasMerchantMutationRef.current || isCompanyAreaUnlocked || isAdmin || isMasterAdmin) &&
      currentCompany &&
      currentCompany.name &&
      (products.length > 0 || hasMerchantMutationRef.current)
    ) {
      const signature = JSON.stringify({
        companyId: currentCompany.id,
        companyName: currentCompany.name,
        paymentSettings,
        activeSellerId: activeSeller?.id,
        products
      });
      if (signature === lastSyncedSignatureRef.current) return;
      lastSyncedSignatureRef.current = signature;
      syncStoreToServer(currentCompany, paymentSettings, activeSeller, products, { setAsActive: true }).catch(() => {});
    }
  }, [currentCompany?.name, currentCompany?.id, products, paymentSettings, activeSeller, isCompanyAreaUnlocked, isAdmin, isMasterAdmin]);

  const setActiveSellerId = (id: string) => {
    const target = sellers.find(s => s.id === id);
    if (target) {
      hasMerchantMutationRef.current = true;
      const nextSettings: PaymentSettings = {
        ...paymentSettings,
        activeSellerId: id,
        pixKey: target.pixKey,
        pixKeyType: target.pixKeyType,
        merchantWhatsapp: target.whatsapp,
        merchantName: target.merchantName || target.name,
        merchantCity: target.merchantCity || 'Barcarena PA',
        receivingBank: target.receivingBank || 'NUBANK',
      };
      setPaymentSettings(nextSettings);
      try {
        localStorage.setItem(getTenantKey('payment_settings', activeCompanyId), JSON.stringify(nextSettings));
      } catch {}
      syncStoreToServer(currentCompany, nextSettings, target, products, { setAsActive: true }).catch(() => {});
    }
  };

  const addSeller = (newSellerData: Omit<SellerProfile, 'id'>): SellerProfile => {
    hasMerchantMutationRef.current = true;
    const newId = 'vend_' + Date.now().toString(36);
    const newSeller: SellerProfile = {
      ...newSellerData,
      id: newId,
      merchantCity: newSellerData.merchantCity || 'Barcarena PA',
    };
    const updatedSellers = [...sellers, newSeller];
    const nextSettings: PaymentSettings = {
      ...paymentSettings,
      sellers: updatedSellers,
    };
    setPaymentSettings(nextSettings);
    try {
      localStorage.setItem(getTenantKey('payment_settings', activeCompanyId), JSON.stringify(nextSettings));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(nextSettings));
      }
    } catch {}
    syncStoreToServer(currentCompany, nextSettings, activeSeller, products, { setAsActive: true }).catch(() => {});
    return newSeller;
  };

  const updateSeller = (id: string, data: Partial<SellerProfile>) => {
    hasMerchantMutationRef.current = true;
    const updatedSellers = sellers.map(s => {
      if (s.id === id) {
        return { ...s, ...data };
      }
      return s;
    });

    const isCurrentActive = activeSellerId === id;
    const patch: Partial<PaymentSettings> = { sellers: updatedSellers };
    if (isCurrentActive) {
      if (data.pixKey) patch.pixKey = data.pixKey;
      if (data.pixKeyType) patch.pixKeyType = data.pixKeyType;
      if (data.whatsapp) patch.merchantWhatsapp = data.whatsapp;
      if (data.name) patch.merchantName = data.merchantName || data.name;
      if (data.merchantName) patch.merchantName = data.merchantName;
      if (data.merchantCity) patch.merchantCity = data.merchantCity;
      if (data.receivingBank) patch.receivingBank = data.receivingBank;
    }
    const nextSettings: PaymentSettings = { ...paymentSettings, ...patch };
    setPaymentSettings(nextSettings);
    try {
      localStorage.setItem(getTenantKey('payment_settings', activeCompanyId), JSON.stringify(nextSettings));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(nextSettings));
      }
    } catch {}
    const nextActiveSel = updatedSellers.find(s => s.id === (nextSettings.activeSellerId || activeSellerId)) || updatedSellers[0];
    syncStoreToServer(currentCompany, nextSettings, nextActiveSel, products, { setAsActive: true }).catch(() => {});
  };

  const deleteSeller = (id: string): boolean => {
    if (sellers.length <= 1) {
      showToast('error', 'Não Permitido', 'Deve haver pelo menos um vendedor cadastrado.');
      return false;
    }
    hasMerchantMutationRef.current = true;
    const filtered = sellers.filter(s => s.id !== id);
    const newActiveId = activeSellerId === id ? filtered[0].id : activeSellerId;
    const newActiveSeller = filtered.find(s => s.id === newActiveId) || filtered[0];

    const nextSettings: PaymentSettings = {
      ...paymentSettings,
      sellers: filtered,
      activeSellerId: newActiveId,
      pixKey: newActiveSeller.pixKey,
      pixKeyType: newActiveSeller.pixKeyType,
      merchantWhatsapp: newActiveSeller.whatsapp,
      merchantName: newActiveSeller.merchantName || newActiveSeller.name,
      merchantCity: newActiveSeller.merchantCity || 'Barcarena PA',
      receivingBank: newActiveSeller.receivingBank || 'NUBANK',
    };
    setPaymentSettings(nextSettings);
    try {
      localStorage.setItem(getTenantKey('payment_settings', activeCompanyId), JSON.stringify(nextSettings));
    } catch {}
    syncStoreToServer(currentCompany, nextSettings, newActiveSeller, products, { setAsActive: true }).catch(() => {});
    return true;
  };

  // Set Company Name directly (Replaces "appvendas" everywhere and syncs across AI Studio & Installed Apps)
  const setCompanyName = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    hasMerchantMutationRef.current = true;
    const newSlug = normalizeStoreSlug(trimmed) || trimmed.toLowerCase().replace(/\s+/g, '-');
    const updatedCompany: CompanyAccount = { ...currentCompany, name: trimmed, slug: newSlug };
    const nextSettings: PaymentSettings = {
      ...paymentSettings,
      merchantName: trimmed,
      sellers: paymentSettings.sellers ? paymentSettings.sellers.map(s => ({ ...s, merchantName: trimmed })) : paymentSettings.sellers
    };
    setCompanies(prev => {
      const next = prev.map(c => c.id === activeCompanyId ? updatedCompany : c);
      try {
        localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setPaymentSettings(nextSettings);
    try {
      localStorage.setItem('appvendas_last_visited_store_slug', newSlug);
      localStorage.setItem('appvendas_last_store_slug', newSlug);
      localStorage.setItem('appvendas_last_visited_store_name', trimmed);
    } catch {}
    syncStoreToServer(updatedCompany, nextSettings, activeSeller, products, { setAsActive: true, isRename: true }).catch(() => {});
    if (typeof document !== 'undefined') {
      document.title = `${trimmed} - Gestão & Vendas`;
    }
    showToast('success', 'Nome da Empresa Salvo!', `O nome "${trimmed}" agora é o oficial em todo o sistema.`);
  };

  const updateCurrentCompany = (data: Partial<CompanyAccount>) => {
    hasMerchantMutationRef.current = true;
    // If ownerName or phone matches Márcia Alves, auto-apply master admin
    const current = companies.find(c => c.id === activeCompanyId) || currentCompany;
    const checkName = data.ownerName !== undefined ? data.ownerName : current?.ownerName;
    const checkPhone = data.phone !== undefined ? data.phone : current?.phone;
    if (checkIsAdminCredentials(checkName, checkPhone)) {
      checkAndApplyAdminCredentials(checkName, checkPhone);
    }

    const cleanNameUpdate = data.name ? data.name.trim() : undefined;
    const cleanPhoneUpdate = data.phone !== undefined ? data.phone.trim() : undefined;
    const updatedSlug = cleanNameUpdate
      ? (normalizeStoreSlug(cleanNameUpdate) || cleanNameUpdate.toLowerCase().replace(/\s+/g, '-'))
      : current.slug;
    const updatedCompObj: CompanyAccount = {
      ...current,
      ...data,
      ...(cleanNameUpdate ? { name: cleanNameUpdate, slug: updatedSlug } : {}),
      ...(cleanPhoneUpdate !== undefined ? { phone: cleanPhoneUpdate } : {})
    };

    setCompanies(prev => {
      const next = prev.map(c => (c.id === activeCompanyId ? updatedCompObj : c));
      try {
        localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    const nextSettings: PaymentSettings = (data.name || cleanPhoneUpdate !== undefined)
      ? {
          ...paymentSettings,
          ...(cleanNameUpdate ? { merchantName: cleanNameUpdate } : {}),
          ...(cleanPhoneUpdate !== undefined ? { merchantWhatsapp: cleanPhoneUpdate } : {}),
          sellers: paymentSettings.sellers ? paymentSettings.sellers.map((s, idx) => ({
            ...s,
            ...(cleanNameUpdate ? { merchantName: cleanNameUpdate } : {}),
            ...(cleanPhoneUpdate !== undefined && (s.id === paymentSettings.activeSellerId || idx === 0) && (!s.whatsapp || s.whatsapp === current?.phone) ? { whatsapp: cleanPhoneUpdate } : {})
          })) : paymentSettings.sellers
        }
      : paymentSettings;

    if (data.name || cleanPhoneUpdate !== undefined) {
      if ((cleanNameUpdate && !isPlaceholderCompanyName(cleanNameUpdate)) || (cleanPhoneUpdate && cleanPhoneUpdate.replace(/\D/g, '').length >= 8)) {
        hasRegisteredCompanyRef.current = true;
        setHasRegisteredCompany(true);
        try { localStorage.setItem(STORAGE_COMPANY_REGISTERED_KEY, 'true'); } catch {}
      }
      if (updatedSlug) {
        try {
          localStorage.setItem('appvendas_last_visited_store_slug', updatedSlug);
          localStorage.setItem('appvendas_last_store_slug', updatedSlug);
          if (cleanNameUpdate) localStorage.setItem('appvendas_last_visited_store_name', cleanNameUpdate);
        } catch {}
      }
      setPaymentSettings(nextSettings);
      if (cleanNameUpdate && typeof document !== 'undefined') {
        document.title = `${cleanNameUpdate} - Gestão & Vendas`;
      }
    }

    syncStoreToServer(updatedCompObj, nextSettings, activeSeller, products, { setAsActive: true, isRename: Boolean(cleanNameUpdate) }).catch(() => {});
  };

  const registerMerchantWorkspace = (data: {
    companyName: string;
    phone: string;
    password: string;
    ownerName?: string;
    logoEmoji?: string;
  }): CompanyAccount => {
    hasMerchantMutationRef.current = true;
    hasRegisteredCompanyRef.current = true;
    setHasRegisteredCompany(true);

    const cleanName = data.companyName.trim() || 'Minha Loja';
    const cleanPhone = data.phone.trim();
    const cleanPass = data.password.trim();
    const cleanOwner = data.ownerName?.trim() || 'Lojista';
    const cleanEmoji = data.logoEmoji || '🏪';

    if (checkIsAdminCredentials(cleanOwner, cleanPhone)) {
      checkAndApplyAdminCredentials(cleanOwner, cleanPhone);
    }

    const existingPlaceholderOnly =
      companies.length === 1 &&
      companies[0].id === DEFAULT_COMPANY_ID &&
      isPlaceholderCompanyName(companies[0].name) &&
      products.length === 0;

    const newId = existingPlaceholderOnly
      ? `empresa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      : `empresa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const baseSlug = normalizeStoreSlug(cleanName) || cleanName.toLowerCase().replace(/\s+/g, '-');

    const newComp: CompanyAccount = {
      id: newId,
      name: cleanName,
      slug: baseSlug,
      ownerName: cleanOwner,
      phone: cleanPhone,
      category: 'Comércio & Varejo',
      logoEmoji: cleanEmoji,
      createdAt: new Date().toISOString()
    };

    const initialSeller: SellerProfile = {
      id: 'vendedor_principal',
      name: cleanOwner !== 'Lojista' ? cleanOwner : 'Atendente',
      whatsapp: cleanPhone,
      pixKey: '',
      pixKeyType: 'PHONE',
      merchantName: cleanName,
      merchantCity: 'Barcarena PA',
      receivingBank: 'NUBANK',
      isDefault: true,
    };

    const initialTenantSettings: PaymentSettings = {
      ...DEFAULT_PAYMENT_SETTINGS,
      merchantName: cleanName,
      merchantWhatsapp: cleanPhone,
      sellers: [initialSeller],
      activeSellerId: initialSeller.id,
    };

    const updatedCompanies = existingPlaceholderOnly ? [newComp] : [...companies, newComp];
    try {
      localStorage.setItem(STORAGE_COMPANY_REGISTERED_KEY, 'true');
      localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(updatedCompanies));
      localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, newId);
      localStorage.setItem(getTenantKey('products', newId), JSON.stringify([]));
      localStorage.setItem(getTenantKey('sales', newId), JSON.stringify([]));
      localStorage.setItem(getTenantKey('movements', newId), JSON.stringify([]));
      localStorage.setItem(getTenantKey('customers', newId), JSON.stringify([]));
      localStorage.setItem(getTenantKey('suppliers', newId), JSON.stringify([]));
      localStorage.setItem(getTenantKey('payment_settings', newId), JSON.stringify(initialTenantSettings));
      if (cleanPass.length >= 4) {
        localStorage.setItem(getTenantKey('company_password', newId), cleanPass);
        localStorage.setItem(getTenantKey('company_has_custom_password', newId), 'true');
      }
      if (baseSlug) {
        localStorage.setItem('appvendas_last_visited_store_slug', baseSlug);
        localStorage.setItem('appvendas_last_store_slug', baseSlug);
        localStorage.setItem('appvendas_last_visited_store_name', cleanName);
      }
      sessionStorage.setItem('appvendas_company_unlocked', 'true');
    } catch {}

    urlCatalogInfoRef.current = { hasUrlProducts: false, hasExplicitVersion: false, urlVersion: 0, urlSlug: '' };
    setCompanies(updatedCompanies);
    setActiveCompanyId(newId);
    setProducts([]);
    setSales([]);
    setMovements([]);
    setCustomers([]);
    setSuppliers([]);
    setPaymentSettings(initialTenantSettings);
    setCart([]);

    if (cleanPass.length >= 4) {
      setCompanyPasswordState(cleanPass);
      setLocalHasCustomPassword(true);
      setServerHasPassword(true);
    }

    setIsCompanyAreaUnlocked(true);
    setActiveTabState('quick-add-product');

    syncStoreToServer(newComp, initialTenantSettings, initialSeller, [], {
      forceClear: true,
      setAsActive: true,
      isNewRegistration: true,
      companyPassword: cleanPass,
      onResolvedSlug: (resolvedSlug) => {
        if (resolvedSlug && resolvedSlug !== newComp.slug) {
          setCompanies(prev => {
            const next = prev.map(c => (c.id === newId ? { ...c, slug: resolvedSlug } : c));
            try { localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(next)); } catch {}
            return next;
          });
          try {
            localStorage.setItem('appvendas_last_visited_store_slug', resolvedSlug);
            localStorage.setItem('appvendas_last_store_slug', resolvedSlug);
          } catch {}
        }
      }
    }).catch(() => {});

    if (typeof document !== 'undefined') {
      document.title = `${cleanName} - Gestão & Vendas`;
    }
    return newComp;
  };

  const createCompany = (companyData: { name: string; ownerName?: string; phone?: string; category?: string; logoEmoji?: string; password?: string }): CompanyAccount => {
    hasMerchantMutationRef.current = true;
    hasRegisteredCompanyRef.current = true;
    setHasRegisteredCompany(true);
    // If ownerName or phone matches Márcia Alves, auto-apply master admin
    if (checkIsAdminCredentials(companyData.ownerName, companyData.phone)) {
      checkAndApplyAdminCredentials(companyData.ownerName, companyData.phone);
    }

    const newId = `empresa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const cleanPhone = companyData.phone?.trim() || '';
    const cleanPass = companyData.password?.trim() || '';
    const newComp: CompanyAccount = {
      id: newId,
      name: companyData.name.trim(),
      slug: normalizeStoreSlug(companyData.name.trim()) || companyData.name.trim().toLowerCase().replace(/\s+/g, '-'),
      ownerName: companyData.ownerName?.trim() || 'Usuário',
      phone: cleanPhone,
      category: companyData.category || 'Comércio & Varejo',
      logoEmoji: companyData.logoEmoji || '🏪',
      createdAt: new Date().toISOString()
    };

    const initialSeller: SellerProfile = {
      id: 'vendedor_principal',
      name: newComp.ownerName && newComp.ownerName !== 'Usuário' ? newComp.ownerName : 'Atendente',
      whatsapp: cleanPhone,
      pixKey: '',
      pixKeyType: 'PHONE',
      merchantName: newComp.name,
      merchantCity: 'Barcarena PA',
      receivingBank: 'NUBANK',
      isDefault: true,
    };

    const initialTenantSettings: PaymentSettings = {
      ...DEFAULT_PAYMENT_SETTINGS,
      merchantName: newComp.name,
      merchantWhatsapp: cleanPhone,
      sellers: [initialSeller],
      activeSellerId: initialSeller.id,
    };

    const updatedCompanies = [...companies, newComp];
    try {
      localStorage.setItem(STORAGE_COMPANY_REGISTERED_KEY, 'true');
      localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(updatedCompanies));
      localStorage.setItem(STORAGE_ACTIVE_COMPANY_KEY, newId);
      localStorage.setItem(getTenantKey('products', newId), JSON.stringify([]));
      localStorage.setItem(getTenantKey('sales', newId), JSON.stringify([]));
      localStorage.setItem(getTenantKey('movements', newId), JSON.stringify([]));
      localStorage.setItem(getTenantKey('customers', newId), JSON.stringify([]));
      localStorage.setItem(getTenantKey('suppliers', newId), JSON.stringify([]));
      localStorage.setItem(getTenantKey('payment_settings', newId), JSON.stringify(initialTenantSettings));
      if (cleanPass.length >= 4) {
        localStorage.setItem(getTenantKey('company_password', newId), cleanPass);
        localStorage.setItem(getTenantKey('company_has_custom_password', newId), 'true');
      }
    } catch {
      // ignore
    }

    setCompanies(updatedCompanies);
    setActiveCompanyId(newId);

    if (cleanPass.length >= 4) {
      setCompanyPasswordState(cleanPass);
      setLocalHasCustomPassword(true);
      setServerHasPassword(true);
    } else {
      setCompanyPasswordState('1234');
      setLocalHasCustomPassword(false);
      setServerHasPassword(false);
    }

    // Update active store slug so background sync tracks the new company (never old store)
    urlCatalogInfoRef.current = { hasUrlProducts: false, hasExplicitVersion: false, urlVersion: 0, urlSlug: '' };
    const newNormSlug = normalizeStoreSlug(newComp.slug || newComp.name);
    if (newNormSlug) {
      try {
        localStorage.setItem('appvendas_last_visited_store_slug', newNormSlug);
        localStorage.setItem('appvendas_last_store_slug', newNormSlug);
        localStorage.setItem('appvendas_last_visited_store_name', newComp.name);
      } catch {}
    }

    // Switch in-memory state cleanly
    setProducts([]);
    setSales([]);
    setMovements([]);
    setCustomers([]);
    setSuppliers([]);
    setPaymentSettings(initialTenantSettings);
    setCart([]);

    // Register new company cleanly on the server as active store with its own seller/phone & password
    syncStoreToServer(newComp, initialTenantSettings, initialSeller, [], {
      forceClear: true,
      setAsActive: true,
      isNewRegistration: true,
      ...(cleanPass.length >= 4 ? { companyPassword: cleanPass } : {}),
      onResolvedSlug: (resolvedSlug) => {
        if (resolvedSlug && resolvedSlug !== newComp.slug) {
          setCompanies(prev => {
            const next = prev.map(c => (c.id === newId ? { ...c, slug: resolvedSlug } : c));
            try { localStorage.setItem(STORAGE_COMPANIES_KEY, JSON.stringify(next)); } catch {}
            return next;
          });
          try {
            localStorage.setItem('appvendas_last_visited_store_slug', resolvedSlug);
            localStorage.setItem('appvendas_last_store_slug', resolvedSlug);
          } catch {}
        }
      }
    }).catch(() => {});

    if (typeof document !== 'undefined') {
      document.title = `${newComp.name} - Gestão & Vendas`;
    }
    return newComp;
  };

  const switchCompany = (companyId: string) => {
    if (companyId === activeCompanyId) return;
    const target = companies.find(c => c.id === companyId);
    if (!target) return;

    hasMerchantMutationRef.current = true;
    setActiveCompanyId(companyId);

    // Load per-company password and lock restricted area unless Master Admin
    const nextPassInfo = readCompanyPasswordLocal(companyId);
    setCompanyPasswordState(nextPassInfo.password);
    setLocalHasCustomPassword(nextPassInfo.hasCustom);
    setServerHasPassword(false);
    if (!isAdmin && !isMasterAdmin) {
      setIsCompanyAreaUnlocked(false);
      try {
        sessionStorage.removeItem('appvendas_company_unlocked');
      } catch {}
    }

    // Update active store slug & clear URL catalog lock when user switches company manually
    urlCatalogInfoRef.current = { hasUrlProducts: false, hasExplicitVersion: false, urlVersion: 0, urlSlug: '' };
    const targetNormSlug = normalizeStoreSlug(target.slug || target.name);
    if (targetNormSlug) {
      try {
        localStorage.setItem('appvendas_last_visited_store_slug', targetNormSlug);
        localStorage.setItem('appvendas_last_store_slug', targetNormSlug);
        localStorage.setItem('appvendas_last_visited_store_name', target.name);
      } catch {}
    }

    const loadTenant = <T,>(key: string, fallback: T): T => {
      try {
        const val = localStorage.getItem(getTenantKey(key, companyId));
        return val ? JSON.parse(val) : fallback;
      } catch {
        return fallback;
      }
    };

    const loadedProds = loadTenant<Product[]>('products', []);
    const loadedSales = loadTenant<Sale[]>('sales', []);
    const loadedMoves = loadTenant<StockMovement[]>('movements', []);
    const loadedCusts = loadTenant<Customer[]>('customers', []);
    const loadedSupps = loadTenant<Supplier[]>('suppliers', []);
    const loadedSettings = loadTenant<PaymentSettings>('payment_settings', {
      ...DEFAULT_PAYMENT_SETTINGS,
      merchantName: target.name,
      merchantWhatsapp: target.phone || '',
      sellers: [{
        ...DEFAULT_SELLERS[0],
        merchantName: target.name,
        whatsapp: target.phone || ''
      }]
    });
    if (loadedSettings) {
      loadedSettings.merchantCity = sanitizeMerchantCity(loadedSettings.merchantCity);
    }

    const loadedSeller = loadedSettings?.sellers?.find(s => s.id === loadedSettings.activeSellerId) || loadedSettings?.sellers?.[0];

    setProducts(loadedProds);
    setSales(loadedSales);
    setMovements(loadedMoves);
    setCustomers(loadedCusts);
    setSuppliers(loadedSupps);
    setPaymentSettings(loadedSettings);
    setCart([]);

    syncStoreToServer(target, loadedSettings, loadedSeller, loadedProds, { setAsActive: true }).catch(() => {});

    if (typeof document !== 'undefined') {
      document.title = `${target.name} - Gestão & Vendas`;
    }
  };

  const deleteCompany = (companyId: string): boolean => {
    if (companies.length <= 1) {
      showToast('error', 'Ação Não Permitida', 'Você precisa manter pelo menos 1 empresa cadastrada.');
      return false;
    }
    const remaining = companies.filter(c => c.id !== companyId);
    setCompanies(remaining);

    try {
      localStorage.removeItem(getTenantKey('products', companyId));
      localStorage.removeItem(getTenantKey('sales', companyId));
      localStorage.removeItem(getTenantKey('movements', companyId));
      localStorage.removeItem(getTenantKey('customers', companyId));
      localStorage.removeItem(getTenantKey('suppliers', companyId));
      localStorage.removeItem(getTenantKey('payment_settings', companyId));
      localStorage.removeItem(getTenantKey('company_password', companyId));
      localStorage.removeItem(getTenantKey('company_has_custom_password', companyId));
    } catch {
      // ignore
    }

    if (activeCompanyId === companyId) {
      switchCompany(remaining[0].id);
    }
    return true;
  };

  // Toast helpers
  const showToast = (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => {
    const id = 'toast-' + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Helper to compute unit price taking wholesale quantity rule into account
  const computeItemPrice = (product: Product, quantity: number) => {
    if (
      product.wholesalePrice &&
      product.wholesaleMinQty &&
      quantity >= product.wholesaleMinQty
    ) {
      return { price: product.wholesalePrice, isWholesale: true };
    }
    return { price: product.salePrice, isWholesale: false };
  };

  // Cart operations
  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.currentStock <= 0) {
      showToast('error', 'Estoque Zerado', `O item "${product.name}" não possui unidades em estoque.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        const newQty = existing.quantity + quantity;
        if (newQty > product.currentStock) {
          showToast('warning', 'Estoque Insuficiente', `Disponível apenas ${product.currentStock} unidades.`);
          return prev;
        }
        const { price, isWholesale } = computeItemPrice(product, newQty);
        return prev.map(item =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: newQty,
                unitPrice: price,
                isWholesaleApplied: isWholesale,
                total: newQty * price,
              }
            : item
        );
      } else {
        const initialQty = Math.min(quantity, product.currentStock);
        const { price, isWholesale } = computeItemPrice(product, initialQty);
        return [
          ...prev,
          {
            product,
            quantity: initialQty,
            unitPrice: price,
            isWholesaleApplied: isWholesale,
            total: initialQty * price,
          },
        ];
      }
    });

    showToast('success', 'Adicionado ao Carrinho', `${product.name} foi adicionado.`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          if (quantity > item.product.currentStock) {
            showToast('warning', 'Aviso de Estoque', `Quantidade ajustada para o máximo em estoque (${item.product.currentStock}).`);
            quantity = item.product.currentStock;
          }
          const { price, isWholesale } = computeItemPrice(item.product, quantity);
          return {
            ...item,
            quantity,
            unitPrice: price,
            isWholesaleApplied: isWholesale,
            total: quantity * price,
          };
        }
        return item;
      });
    });
  };

  const clearCart = () => {
    setCart([]);
    setCartDiscount(0);
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Complete Sale
  const completeSale = (paymentMethod: PaymentMethod, details?: PaymentDetails): Sale | null => {
    if (cart.length === 0) {
      showToast('error', 'Carrinho Vazio', 'Adicione pelo menos um produto para finalizar a venda.');
      return null;
    }

    // Check customer info
    const customer = customers.find(c => c.id === selectedCustomerId) || {
      id: 'cust-4',
      name: 'Consumidor Balcão',
      document: '000.000.000-00',
    };

    // Ensure shift is active
    let activeShift = currentShift;
    if (!activeShift.isOpen) {
      activeShift = {
        ...activeShift,
        isOpen: true,
        openedAt: new Date().toISOString(),
        operator: 'Operador Padrão',
        initialCash: activeShift.initialCash || 200,
        finalCashCalculated: activeShift.initialCash || 200,
      };
    }

    const nextCodeNumber = sales.length + 4933;
    const saleCode = `VEN-${nextCodeNumber}`;
    const saleId = 'sale-' + Date.now();

    const saleItems = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      productSku: item.product.sku,
      category: item.product.category,
      unit: item.product.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      costPrice: item.product.costPrice,
      total: item.total,
    }));

    const totalCost = cart.reduce((sum, item) => sum + (item.quantity * item.product.costPrice), 0);
    const profit = cartTotal - totalCost;

    const newSale: Sale = {
      id: saleId,
      code: saleCode,
      items: saleItems,
      subtotal: cartSubtotal,
      discount: cartDiscount,
      total: cartTotal,
      costTotal: totalCost,
      profit: profit,
      paymentMethod: paymentMethod,
      paymentDetails: details,
      installments: details?.installments || 1,
      cashReceived: details?.cashReceived,
      change: details?.change,
      customerId: customer.id,
      customerName: customer.name,
      customerDocument: customer.document,
      status: 'CONCLUIDA',
      seller: currentShift.operator || 'Operador Padrão',
      createdAt: new Date().toISOString(),
      notes: details?.notes,
    };

    // 1. Update product stocks and record movements
    const newMovements: StockMovement[] = [];
    const updatedProducts = products.map(prod => {
      const cartItem = cart.find(ci => ci.product.id === prod.id);
      if (cartItem) {
        const previousStock = prod.currentStock;
        const newStock = Math.max(0, previousStock - cartItem.quantity);
        newMovements.push({
          id: 'mov-' + Math.random().toString(36).substring(2, 9),
          productId: prod.id,
          productName: prod.name,
          productSku: prod.sku,
          type: 'SAIDA_VENDA',
          quantity: cartItem.quantity,
          previousStock,
          newStock,
          documentRef: saleCode,
          user: currentShift.operator || 'Operador Padrão',
          timestamp: new Date().toISOString(),
        });
        return {
          ...prod,
          currentStock: newStock,
          updatedAt: new Date().toISOString(),
        };
      }
      return prod;
    });

    // 2. Update cashier shift metrics (considering split payments if MISTO)
    let addedCash = 0;
    let addedPix = 0;
    let addedCredit = 0;
    let addedDebit = 0;
    let addedOnCredit = 0;

    if (paymentMethod === 'MISTO' && details?.splitPayments && details.splitPayments.length > 0) {
      details.splitPayments.forEach(sp => {
        if (sp.method === 'DINHEIRO') addedCash += sp.amount;
        else if (sp.method === 'PIX') addedPix += sp.amount;
        else if (sp.method === 'CARTAO_CREDITO') addedCredit += sp.amount;
        else if (sp.method === 'CARTAO_DEBITO') addedDebit += sp.amount;
        else if (sp.method === 'A_PRAZO') addedOnCredit += sp.amount;
      });
    } else {
      if (paymentMethod === 'DINHEIRO') addedCash = cartTotal;
      else if (paymentMethod === 'PIX') addedPix = cartTotal;
      else if (paymentMethod === 'CARTAO_CREDITO') addedCredit = cartTotal;
      else if (paymentMethod === 'CARTAO_DEBITO') addedDebit = cartTotal;
      else if (paymentMethod === 'A_PRAZO') addedOnCredit = cartTotal;
    }

    const updatedShift: CashierShift = {
      ...activeShift,
      cashSales: activeShift.cashSales + addedCash,
      pixSales: activeShift.pixSales + addedPix,
      creditSales: activeShift.creditSales + addedCredit,
      debitSales: activeShift.debitSales + addedDebit,
      onCreditSales: activeShift.onCreditSales + addedOnCredit,
      finalCashCalculated:
        activeShift.initialCash +
        (activeShift.cashSales + addedCash) +
        activeShift.supplements -
        activeShift.bleedings,
    };

    // 3. Update customer total spend
    const updatedCustomers = customers.map(c => {
      if (c.id === customer.id) {
        return {
          ...c,
          totalPurchased: (c.totalPurchased || 0) + cartTotal,
          lastPurchaseDate: new Date().toISOString(),
        };
      }
      return c;
    });

    setProducts(updatedProducts);
    try {
      localStorage.setItem(getTenantKey('products', activeCompanyId), JSON.stringify(updatedProducts));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
      }
    } catch {}
    syncStoreToServer(currentCompany, paymentSettings, activeSeller, updatedProducts).catch(() => {});
    setMovements(prev => [...newMovements, ...prev]);
    setSales(prev => [newSale, ...prev]);
    setCurrentShift(updatedShift);
    setCustomers(updatedCustomers);

    clearCart();
    setReceiptModalSale(newSale);
    showToast('success', 'Venda Finalizada!', `Venda ${saleCode} no valor de R$ ${cartTotal.toFixed(2)} registrada com sucesso.`);

    return newSale;
  };

  // Cancel sale
  const cancelSale = (saleId: string, reason: string = 'Cancelamento pelo operador') => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || sale.status === 'CANCELADA') {
      showToast('error', 'Erro', 'Venda não encontrada ou já cancelada.');
      return false;
    }

    // 1. Restock items
    const restoredMovements: StockMovement[] = [];
    const updatedProducts = products.map(prod => {
      const soldItem = sale.items.find(item => item.productId === prod.id);
      if (soldItem) {
        const previousStock = prod.currentStock;
        const newStock = previousStock + soldItem.quantity;
        restoredMovements.push({
          id: 'mov-' + Math.random().toString(36).substring(2, 9),
          productId: prod.id,
          productName: prod.name,
          productSku: prod.sku,
          type: 'DEVOLUCAO',
          quantity: soldItem.quantity,
          previousStock,
          newStock,
          documentRef: `CANC-${sale.code}`,
          reason: reason,
          user: currentShift.operator || 'Operador Padrão',
          timestamp: new Date().toISOString(),
        });
        return {
          ...prod,
          currentStock: newStock,
          updatedAt: new Date().toISOString(),
        };
      }
      return prod;
    });

    // 2. Adjust shift
    const updatedShift: CashierShift = {
      ...currentShift,
      cashSales: sale.paymentMethod === 'DINHEIRO' ? Math.max(0, currentShift.cashSales - sale.total) : currentShift.cashSales,
      pixSales: sale.paymentMethod === 'PIX' ? Math.max(0, currentShift.pixSales - sale.total) : currentShift.pixSales,
      creditSales: sale.paymentMethod === 'CARTAO_CREDITO' ? Math.max(0, currentShift.creditSales - sale.total) : currentShift.creditSales,
      debitSales: sale.paymentMethod === 'CARTAO_DEBITO' ? Math.max(0, currentShift.debitSales - sale.total) : currentShift.debitSales,
      onCreditSales: sale.paymentMethod === 'A_PRAZO' ? Math.max(0, currentShift.onCreditSales - sale.total) : currentShift.onCreditSales,
      finalCashCalculated:
        currentShift.initialCash +
        (sale.paymentMethod === 'DINHEIRO' ? Math.max(0, currentShift.cashSales - sale.total) : currentShift.cashSales) +
        currentShift.supplements -
        currentShift.bleedings,
    };

    setProducts(updatedProducts);
    try {
      localStorage.setItem(getTenantKey('products', activeCompanyId), JSON.stringify(updatedProducts));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
      }
    } catch {}
    syncStoreToServer(currentCompany, paymentSettings, activeSeller, updatedProducts).catch(() => {});
    setMovements(prev => [...restoredMovements, ...prev]);
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'CANCELADA', notes: `${s.notes || ''} | Cancelada: ${reason}` } : s));
    setCurrentShift(updatedShift);

    showToast('info', 'Venda Cancelada', `Venda ${sale.code} foi estornada e o estoque restaurado.`);
    return true;
  };

  // Product Operations (Immediate real-time server & storage sync)
  const addProduct = (productData: Omit<Product, 'id' | 'updatedAt'>) => {
    hasMerchantMutationRef.current = true;
    const newProduct: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
      updatedAt: new Date().toISOString(),
    };

    const nextProducts = [newProduct, ...products];
    setProducts(nextProducts);
    try {
      localStorage.setItem(getTenantKey('products', activeCompanyId), JSON.stringify(nextProducts));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts));
      }
    } catch {}
    syncStoreToServer(currentCompany, paymentSettings, activeSeller, nextProducts, { setAsActive: true }).catch(() => {});

    // Initial stock movement record if stock > 0
    if (newProduct.currentStock > 0) {
      const newMovement: StockMovement = {
        id: 'mov-' + Date.now(),
        productId: newProduct.id,
        productName: newProduct.name,
        productSku: newProduct.sku,
        type: 'ENTRADA',
        quantity: newProduct.currentStock,
        previousStock: 0,
        newStock: newProduct.currentStock,
        unitCost: newProduct.costPrice,
        reason: 'Cadastro inicial de produto',
        user: currentShift.operator || 'Admin',
        timestamp: new Date().toISOString(),
      };
      setMovements(prev => [newMovement, ...prev]);
    }

    showToast('success', 'Produto Criado', `"${newProduct.name}" cadastrado e sincronizado no catálogo.`);
    return newProduct;
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    hasMerchantMutationRef.current = true;
    const nextProducts = products.map(p => (p.id === id ? { ...p, ...productData, updatedAt: new Date().toISOString() } : p));
    setProducts(nextProducts);
    try {
      localStorage.setItem(getTenantKey('products', activeCompanyId), JSON.stringify(nextProducts));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts));
      }
    } catch {}
    syncStoreToServer(currentCompany, paymentSettings, activeSeller, nextProducts, { setAsActive: true }).catch(() => {});
    showToast('success', 'Produto Atualizado', 'As informações foram salvas e sincronizadas.');
  };

  const deleteProduct = (id: string) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    hasMerchantMutationRef.current = true;
    const nowIso = new Date().toISOString();
    const nextProducts = products
      .filter(p => p.id !== id)
      .map((p, idx) => (idx === 0 ? { ...p, updatedAt: nowIso } : p));
    setProducts(nextProducts);
    setCart(prev => prev.filter(item => item.product.id !== id));
    try {
      localStorage.setItem(getTenantKey('products', activeCompanyId), JSON.stringify(nextProducts));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts));
      }
    } catch {}
    syncStoreToServer(currentCompany, paymentSettings, activeSeller, nextProducts, { forceClear: nextProducts.length === 0, setAsActive: true }).catch(() => {});
    showToast('info', 'Produto Removido', `O item "${prod.name}" foi excluído.`);
  };

  // Add stock movement (Entrada de compra, Avaria, etc)
  const addStockMovement = (
    productId: string,
    type: MovementType,
    quantity: number,
    options?: { reason?: string; documentRef?: string; unitCost?: number; user?: string }
  ) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) {
      showToast('error', 'Erro', 'Produto não encontrado.');
      return false;
    }

    const previousStock = prod.currentStock;
    let newStock = previousStock;

    if (type === 'ENTRADA' || type === 'AJUSTE_POSITIVO' || type === 'DEVOLUCAO') {
      newStock = previousStock + quantity;
    } else {
      if (quantity > previousStock) {
        showToast('error', 'Estoque Insuficiente', `O estoque atual é de apenas ${previousStock} unidades.`);
        return false;
      }
      newStock = Math.max(0, previousStock - quantity);
    }

    const movement: StockMovement = {
      id: 'mov-' + Date.now(),
      productId: prod.id,
      productName: prod.name,
      productSku: prod.sku,
      type,
      quantity,
      previousStock,
      newStock,
      unitCost: options?.unitCost || prod.costPrice,
      reason: options?.reason,
      documentRef: options?.documentRef,
      user: options?.user || currentShift.operator || 'Operador',
      timestamp: new Date().toISOString(),
    };

    const nextProducts = products.map(p =>
      p.id === productId
        ? {
            ...p,
            currentStock: newStock,
            costPrice: options?.unitCost && options.unitCost > 0 ? options.unitCost : p.costPrice,
            updatedAt: new Date().toISOString(),
          }
        : p
    );
    setProducts(nextProducts);
    try {
      localStorage.setItem(getTenantKey('products', activeCompanyId), JSON.stringify(nextProducts));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts));
      }
    } catch {}
    syncStoreToServer(currentCompany, paymentSettings, activeSeller, nextProducts, { setAsActive: true }).catch(() => {});

    setMovements(prev => [movement, ...prev]);
    showToast(
      'success',
      'Movimentação Registrada',
      `${type === 'ENTRADA' ? 'Entrada' : 'Ajuste'} de ${quantity} un para "${prod.name}". Novo estoque: ${newStock}.`
    );
    return true;
  };

  const quickStockAdjustment = (productId: string, newStock: number, reason: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return false;

    const previousStock = prod.currentStock;
    const diff = newStock - previousStock;
    if (diff === 0) return true;

    const type: MovementType = diff > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';
    const movement: StockMovement = {
      id: 'mov-' + Date.now(),
      productId: prod.id,
      productName: prod.name,
      productSku: prod.sku,
      type,
      quantity: Math.abs(diff),
      previousStock,
      newStock,
      reason: reason || 'Ajuste de inventário físico',
      user: currentShift.operator || 'Admin',
      timestamp: new Date().toISOString(),
    };

    const nextProducts = products.map(p => (p.id === productId ? { ...p, currentStock: newStock, updatedAt: new Date().toISOString() } : p));
    setProducts(nextProducts);
    try {
      localStorage.setItem(getTenantKey('products', activeCompanyId), JSON.stringify(nextProducts));
      if (activeCompanyId === DEFAULT_COMPANY_ID) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(nextProducts));
      }
    } catch {}
    syncStoreToServer(currentCompany, paymentSettings, activeSeller, nextProducts, { setAsActive: true }).catch(() => {});
    setMovements(prev => [movement, ...prev]);
    showToast('success', 'Estoque Ajustado', `Estoque de "${prod.name}" alterado de ${previousStock} para ${newStock}.`);
    return true;
  };

  // Live Refresh for Client Store & Installed App (Strictly isolated per store/company - NEVER fetches /api/store/latest on root /)
  const refreshStoreCatalog = async (): Promise<boolean> => {
    try {
      const liveComp = currentCompanyRef.current;
      const liveCompId = activeCompanyIdRef.current;
      const liveProds = productsRef.current;
      const liveSettings = paymentSettingsRef.current;
      const liveSeller = activeSellerRef.current;

      const urlParams = typeof window !== 'undefined' ? new URLSearchParams((window.location.search || '').replace(/%26/gi, '&')) : null;
      const urlLoja = urlParams?.get('loja') || urlParams?.get('empresa') || pathLojaName;
      const urlZap = urlParams?.get('zap') || urlParams?.get('cel') || urlParams?.get('celular') || urlParams?.get('whatsapp') || '';
      const cleanUrlZap = urlZap.replace(/\D/g, '');
      const isRootAppLaunch = !urlLoja && !pathShortCode && cleanUrlZap.length < 8;
      const ownCompanySlug = hasRegisteredCompanyRef.current
        ? (normalizeStoreSlug(liveComp?.slug || liveComp?.name) || liveCompId || '')
        : '';

      if (isRootAppLaunch && (!hasRegisteredCompanyRef.current || !ownCompanySlug || isPlaceholderCompanyName(liveComp?.name))) {
        return false;
      }

      const targetQuery = urlLoja ? normalizeStoreSlug(urlLoja) : '';
      const endpoint = pathShortCode
        ? `/api/short/${encodeURIComponent(pathShortCode)}?t=${Date.now()}`
        : (targetQuery
            ? `/api/stores/${encodeURIComponent(targetQuery)}?t=${Date.now()}`
            : (cleanUrlZap.length >= 8
                ? `/api/stores/by-phone/${encodeURIComponent(cleanUrlZap)}?t=${Date.now()}`
                : `/api/stores/${encodeURIComponent(ownCompanySlug)}?t=${Date.now()}`));
      const res = await fetch(endpoint, { cache: 'no-store' });
      const resCt = res.headers.get('content-type') || '';
      if (res.ok && resCt.includes('application/json')) {
        const data = await res.json();
        if (!data || data.isPlaceholder) {
          if (liveProds && liveProds.length > 0 && liveComp && !isPlaceholderCompanyName(liveComp.name) && (!urlLoja || normalizeStoreSlug(liveComp.name) === normalizeStoreSlug(urlLoja))) {
            syncStoreToServer(liveComp, liveSettings, liveSeller, liveProds, { setAsActive: isRootAppLaunch }).catch(() => {});
          }
          return false;
        }

        const serverMs = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
        const urlInfo = urlCatalogInfoRef.current;

        // Only hold URL snapshot if URL carried explicit newer ?v= (NEVER overwrite live server from read-only polling)
        if (urlInfo.hasUrlProducts && urlInfo.hasExplicitVersion && urlInfo.urlVersion > serverMs) {
          return true;
        }
        if (urlInfo.hasUrlProducts) {
          urlCatalogInfoRef.current.hasUrlProducts = false;
        }

        return applyIncomingStorePayloadRef.current(data, {
          slug: data.slug,
          cleanSlug: data.cleanSlug,
          companyId: data.company?.id,
          previousSlugs: data.previousSlugs,
          fromShortCode: Boolean(pathShortCode),
          fromPhone: cleanUrlZap.length >= 8
        });
      }
    } catch {}
    return false;
  };
  refreshStoreCatalogRef.current = refreshStoreCatalog;

  // Real-Time 1-Click Update for Installed PWAs & Browsers:
  // 1) Syncs merchant changes (if any) and pulls freshest catalog immediately
  // 2) Resolves newest /api/version, purges SW + CacheStorage + HTTP disk cache, and reloads seamlessly
  const triggerOneClickUpdate = async (): Promise<void> => {
    showToast('info', 'Atualizando em Tempo Real...', `Sincronizando catálogo, limpando cache antigo e ativando a versão mais recente (v${appVersion})...`);
    try {
      const liveComp = currentCompanyRef.current;
      const liveProds = productsRef.current;
      if ((hasMerchantMutationRef.current || isCompanyAreaUnlockedRef.current || isAdminRef.current || isMasterAdminRef.current) && liveProds && liveProds.length > 0 && liveComp?.name) {
        await syncStoreToServer(liveComp, paymentSettingsRef.current, activeSellerRef.current, liveProds).catch(() => {});
      }
      await refreshStoreCatalog().catch(() => {});
    } catch {}

    let latestVer = appVersion || CLIENT_APP_VERSION;
    try {
      const verRes = await fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' });
      const verCt = verRes.headers.get('content-type') || '';
      if (verRes.ok && verCt.includes('application/json')) {
        const verJson = await verRes.json();
        if (verJson?.version) {
          latestVer = String(verJson.version).replace(/^v/i, '').trim() || latestVer;
          setAppVersion(latestVer);
        }
      }
    } catch {}

    if (typeof (window as any).__clearAppCacheAndReload === 'function') {
      (window as any).__clearAppCacheAndReload(latestVer);
    } else {
      try {
        const curUrl = new URL(window.location.href);
        curUrl.searchParams.set('app_ver', latestVer);
        curUrl.searchParams.set('atualizado', Date.now().toString());
        window.location.replace(curUrl.toString());
      } catch {
        window.location.reload();
      }
    }
  };

  // Customers
  const addCustomer = (customerData: Omit<Customer, 'id' | 'totalPurchased'>) => {
    const newCust: Customer = {
      ...customerData,
      id: 'cust-' + Date.now(),
      totalPurchased: 0,
    };
    setCustomers(prev => [newCust, ...prev]);
    showToast('success', 'Cliente Cadastrado', `${newCust.name} adicionado à base.`);
    return newCust;
  };

  const updateCustomer = (id: string, customerData: Partial<Customer>) => {
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, ...customerData } : c)));
    showToast('success', 'Cliente Atualizado', 'Dados do cliente salvos.');
  };

  // Suppliers
  const addSupplier = (supplierData: Omit<Supplier, 'id'>) => {
    const newSup: Supplier = {
      ...supplierData,
      id: 'sup-' + Date.now(),
    };
    setSuppliers(prev => [newSup, ...prev]);
    showToast('success', 'Fornecedor Cadastrado', `${newSup.name} adicionado.`);
    return newSup;
  };

  const updateSupplier = (id: string, supplierData: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => (s.id === id ? { ...s, ...supplierData } : s)));
    showToast('success', 'Fornecedor Atualizado', 'Dados salvos.');
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    showToast('success', 'Fornecedor Excluído', 'O fornecedor foi removido da empresa.');
  };

  // Cashier Shift management
  const openCashier = (initialCash: number, operator: string) => {
    const shift: CashierShift = {
      id: 'shift-' + Date.now(),
      openedAt: new Date().toISOString(),
      isOpen: true,
      operator: operator || 'Operador Padrão',
      initialCash,
      cashSales: 0,
      pixSales: 0,
      creditSales: 0,
      debitSales: 0,
      onCreditSales: 0,
      supplements: 0,
      bleedings: 0,
      finalCashCalculated: initialCash,
      notes: 'Caixa aberto com fundo inicial.',
    };
    setCurrentShift(shift);
    showToast('success', 'Caixa Aberto', `Caixa iniciado com R$ ${initialCash.toFixed(2)} por ${shift.operator}.`);
  };

  const closeCashier = (actualCash: number, notes?: string) => {
    const calculated = currentShift.finalCashCalculated;
    const diff = actualCash - calculated;

    const closed: CashierShift = {
      ...currentShift,
      isOpen: false,
      closedAt: new Date().toISOString(),
      finalCashActual: actualCash,
      difference: diff,
      notes: notes || currentShift.notes,
    };

    setCurrentShift(closed);
    showToast(
      diff === 0 ? 'success' : diff > 0 ? 'info' : 'warning',
      'Caixa Fechado',
      `Balanço: Calculado R$ ${calculated.toFixed(2)} | Real R$ ${actualCash.toFixed(2)} (${diff >= 0 ? '+' : ''}${diff.toFixed(2)})`
    );
  };

  const addCashMovement = (type: 'SUPRIMENTO' | 'SANGRIA', amount: number, reason: string) => {
    if (amount <= 0) return;

    if (type === 'SANGRIA' && amount > currentShift.finalCashCalculated) {
      showToast('error', 'Sangria Não Permitida', 'Valor superior ao saldo atual de dinheiro em caixa.');
      return;
    }

    const newSupplements = type === 'SUPRIMENTO' ? currentShift.supplements + amount : currentShift.supplements;
    const newBleedings = type === 'SANGRIA' ? currentShift.bleedings + amount : currentShift.bleedings;
    const newFinal = currentShift.initialCash + currentShift.cashSales + newSupplements - newBleedings;

    const updated: CashierShift = {
      ...currentShift,
      supplements: newSupplements,
      bleedings: newBleedings,
      finalCashCalculated: newFinal,
      notes: `${currentShift.notes || ''} | ${type}: R$ ${amount.toFixed(2)} (${reason})`,
    };

    setCurrentShift(updated);
    showToast('success', `${type === 'SUPRIMENTO' ? 'Suprimento' : 'Sangria'} Registrada`, `R$ ${amount.toFixed(2)} - ${reason}`);
  };

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
    localStorage.removeItem(STORAGE_KEYS.SHIFT);

    setProducts(INITIAL_PRODUCTS);
    setSales(INITIAL_SALES);
    setMovements(INITIAL_MOVEMENTS);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers(INITIAL_SUPPLIERS);
    setCurrentShift(INITIAL_SHIFT);
    setCart([]);
    setCartDiscount(0);

    showToast('info', 'Dados Restaurados', 'Catálogo e registros reiniciados.');
  };

  const clearAllForNewClient = () => {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.MOVEMENTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
    localStorage.removeItem(STORAGE_KEYS.SHIFT);

    setProducts([]);
    setSales([]);
    setMovements([]);
    setCustomers(INITIAL_CUSTOMERS);
    setSuppliers([]);
    setCurrentShift(INITIAL_SHIFT);
    setCart([]);
    setCartDiscount(0);

    showToast(
      'success',
      '🧹 Sistema Zerado para Novo Cliente!',
      'Todos os produtos, estoque e vendas foram limpos. Pronto para cadastrar novos produtos no appvendas.'
    );
  };

  const loadDemoData = () => {
    setProducts(DEMO_PRODUCTS);
    showToast('info', '📦 Modelos de Exemplo Carregados', '5 produtos de demonstração foram adicionados para teste.');
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        products,
        sales,
        movements,
        customers,
        suppliers,
        currentShift,
        cart,
        cartDiscount,
        selectedCustomerId,
        paymentSettings,
        updatePaymentSettings,
        sellers,
        activeSeller,
        activeSellerId,
        setActiveSellerId,
        addSeller,
        updateSeller,
        deleteSeller,
        isSellerWhatsappModalOpen,
        setIsSellerWhatsappModalOpen,
        addToCart,
        removeFromCart,
        updateCartQty,
        setCartDiscount,
        setSelectedCustomerId,
        clearCart,
        cartSubtotal,
        cartTotal,
        cartItemCount,
        completeSale,
        cancelSale,
        addProduct,
        updateProduct,
        deleteProduct,
        addStockMovement,
        quickStockAdjustment,
        refreshStoreCatalog,
        addCustomer,
        updateCustomer,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        openCashier,
        closeCashier,
        addCashMovement,
        receiptModalSale,
        setReceiptModalSale,
        productModalProduct,
        setProductModalProduct,
        stockModalProduct,
        setStockModalProduct,
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        toasts,
        showToast,
        removeToast,
        resetAllData,
        clearAllForNewClient,
        loadDemoData,
        // Trial & Subscription & Admin Exemption
        isAdmin,
        setIsAdmin,
        setAdminMode,
        setClientTestMode,
        adminConfig: ADMIN_CONFIG,
        subscription,
        isTrialActive,
        isTrialExpired,
        isSubscribed,
        isMasterAdmin,
        trialDaysRemaining,
        trialHoursRemaining,
        trialMinutesRemaining,
        isAccessAllowed,
        isBlockedDueToDay5,
        isDueWarningActive,
        daysUntilDue,
        nextDueDateFormatted,
        nextDueDateDay5,
        isSubscriptionModalOpen,
        setIsSubscriptionModalOpen,
        activateSubscription,
        resetTrial,
        simulateTrialExpired,
        simulateTrialDay,
        simulateDay5Warning,
        simulateDay5Blocked,
        blockUnpaidUser,
        isTestBlockMode,
        exitTestBlockMode,
        renewSubscription,
        // Extended Trial Clients (Liberar +2 Dias de Teste por Nome e Celular)
        extendedTrialClients,
        addExtendedTrialClient,
        removeExtendedTrialClient,
        extendTrialForCurrentDevice,
        checkAndApplyClientTrialExtension,
        // Multi-Company & Infinite Users
        companyName,
        setCompanyName,
        currentCompany,
        companies,
        hasRegisteredCompany,
        registerMerchantWorkspace,
        createCompany,
        switchCompany,
        updateCurrentCompany,
        deleteCompany,
        isCompanyModalOpen,
        setIsCompanyModalOpen,
        checkAndApplyAdminCredentials,
        isAdminPasswordModalOpen,
        setIsAdminPasswordModalOpen,
        openAdminPasswordModal,
        // Confidential Company Management Area
        isCompanyAreaUnlocked,
        setIsCompanyAreaUnlocked,
        companyPassword,
        hasCustomCompanyPassword,
        setCompanyPassword,
        unlockCompanyArea,
        verifyCompanyPasswordAsync,
        lockCompanyArea,
        isCompanyPasswordModalOpen,
        setIsCompanyPasswordModalOpen,
        openCompanyAreaUnlock,
        // Company Sharing & Promotion Modal
        isShareModalOpen,
        setIsShareModalOpen,
        shareModalCompany,
        openShareModal,
        closeShareModal,
        // App Installed Update Modal & Real-Time 1-Click Update
        appVersion,
        isUpdateModalOpen,
        setIsUpdateModalOpen,
        openUpdateModal,
        closeUpdateModal,
        triggerOneClickUpdate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
