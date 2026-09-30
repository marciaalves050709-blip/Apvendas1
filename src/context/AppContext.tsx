import React, { createContext, useContext, useState, useEffect } from 'react';
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
  SubscriptionState
} from '../types';
import { sounds, formatCurrency } from '../utils/pixHelper';
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

  // Customer Actions
  addCustomer: (customerData: Omit<Customer, 'id' | 'totalPurchased'>) => Customer;
  updateCustomer: (id: string, customerData: Partial<Customer>) => void;

  // Supplier Actions
  addSupplier: (supplierData: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (id: string, supplierData: Partial<Supplier>) => void;

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

  // Trial & Subscription (5 Days Free Trial -> R$ 58,94)
  subscription: SubscriptionState;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  isSubscribed: boolean;
  isMasterAdmin: boolean;
  trialDaysRemaining: number;
  trialHoursRemaining: number;
  trialMinutesRemaining: number;
  isAccessAllowed: boolean;
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (open: boolean) => void;
  activateSubscription: (code?: string, paymentRef?: string) => boolean;
  resetTrial: () => void;
  simulateTrialExpired: () => void;
  simulateTrialDay: (daysFromStart: number) => void;
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

export const DEFAULT_SUBSCRIPTION: SubscriptionState = {
  isSubscribed: false,
  trialStartDate: new Date().toISOString(),
  trialDurationDays: 5,
  planPrice: 58.94,
  planName: 'Plano Pro DescartClean (Estoque + PDV + Loja WhatsApp)',
};

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  pixKey: '12.345.678/0001-90',
  pixKeyType: 'CNPJ',
  merchantName: 'DESCARTCLEAN DISTRIBUIDORA',
  merchantCity: 'SAO PAULO',
  merchantWhatsapp: '5511999998888',
  receivingBank: 'NUBANK',
  cardProvider: 'STONE',
  autoPixDetection: false,
  autoCardApproval: true,
  soundEnabled: true,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');

  // Persistence loader
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAYMENT_SETTINGS);
      return saved ? { ...DEFAULT_PAYMENT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_PAYMENT_SETTINGS;
    } catch {
      return DEFAULT_PAYMENT_SETTINGS;
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SALES);
      return saved ? JSON.parse(saved) : INITIAL_SALES;
    } catch {
      return INITIAL_SALES;
    }
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
    } catch {
      return INITIAL_MOVEMENTS;
    }
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
    } catch {
      return INITIAL_CUSTOMERS;
    }
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
    } catch {
      return INITIAL_SUPPLIERS;
    }
  });

  const [currentShift, setCurrentShift] = useState<CashierShift>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SHIFT);
      return saved ? JSON.parse(saved) : INITIAL_SHIFT;
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

  // Subscription & 5-Day Free Trial state
  const [subscription, setSubscription] = useState<SubscriptionState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SUBSCRIPTION, ...parsed };
      }
      // Initialize with fresh trial start date
      const initial: SubscriptionState = {
        ...DEFAULT_SUBSCRIPTION,
        trialStartDate: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(initial));
      return initial;
    } catch {
      return DEFAULT_SUBSCRIPTION;
    }
  });

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
    localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(subscription));
  }, [subscription]);

  // Derived Trial & Subscription status
  const trialStartMs = new Date(subscription.trialStartDate || Date.now()).getTime();
  const trialDurationMs = (subscription.trialDurationDays || 5) * 24 * 60 * 60 * 1000;
  const trialEndMs = trialStartMs + trialDurationMs;
  const msRemaining = Math.max(0, trialEndMs - currentTimeMs);

  const isSubscribed = Boolean(subscription.isSubscribed);
  const isTrialActive = !isSubscribed && msRemaining > 0;
  const isTrialExpired = !isSubscribed && msRemaining <= 0;
  const isAccessAllowed = isSubscribed || isTrialActive;

  const trialDaysRemaining = Math.floor(msRemaining / (24 * 60 * 60 * 1000));
  const trialHoursRemaining = Math.floor((msRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const trialMinutesRemaining = Math.floor((msRemaining % (60 * 60 * 1000)) / (60 * 1000));

  const isMasterAdmin = Boolean(
    subscription.isSubscribed &&
    (subscription.lastPaymentRef?.includes('MASTER-ADMIN') ||
     (subscription.subscriptionExpiresAt && new Date(subscription.subscriptionExpiresAt).getFullYear() > 2090))
  );

  const activateSubscription = (code?: string, paymentRef?: string): boolean => {
    const rawInput = (code || '').trim();
    const cleanCode = rawInput.toUpperCase();
    const isMasterKey = [
      'MARCIA',
      'MARCIA2026',
      'ADMINMARCIA',
      'MARCIA0507',
      'MESTRA58',
      'MARCIAALVES050709@GMAIL.COM',
      '5894',
      'MASTER2026',
      'VIP2026'
    ].includes(cleanCode) || rawInput.toLowerCase() === 'marciaalves050709@gmail.com';

    const nowIso = new Date().toISOString();
    // Master Admin gets lifetime access until year 2099
    const expiryIso = isMasterKey 
      ? new Date('2099-12-31T23:59:59.000Z').toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const updated: SubscriptionState = {
      ...subscription,
      isSubscribed: true,
      activatedAt: nowIso,
      subscriptionExpiresAt: expiryIso,
      lastPaymentRef: isMasterKey ? `MASTER-ADMIN-${cleanCode}` : (paymentRef || (code ? `CODIGO-${cleanCode}` : `PIX-${Date.now()}`)),
    };

    setSubscription(updated);
    setIsSubscriptionModalOpen(false);

    // Audio & Visual celebratory feedback
    try {
      sounds.playBankNotification();
      setTimeout(() => sounds.playMoneyReceivedSound(), 300);
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.4 },
      });
    } catch {
      // ignore
    }

    if (isMasterKey) {
      showToast(
        'success',
        '👑 Chave Mestra Reconhecida!',
        'Acesso Vitalício de Administrador Márcia liberado permanentemente sem expiração.'
      );
    } else {
      showToast(
        'success',
        '🎉 Licença Ativada com Sucesso!',
        `Acesso completo ao DescartClean liberado! Plano de ${formatCurrency(subscription.planPrice)}/mês confirmado.`
      );
    }
    return true;
  };

  const resetTrial = () => {
    const updated: SubscriptionState = {
      ...DEFAULT_SUBSCRIPTION,
      trialStartDate: new Date().toISOString(),
      isSubscribed: false,
    };
    setSubscription(updated);
    setCurrentTimeMs(Date.now());
    showToast('info', 'Período de Teste Reiniciado', 'Você tem 5 dias grátis de acesso completo a partir de agora.');
  };

  const simulateTrialExpired = () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const updated: SubscriptionState = {
      ...subscription,
      isSubscribed: false,
      trialStartDate: sixDaysAgo,
    };
    setSubscription(updated);
    setCurrentTimeMs(Date.now());
    showToast('warning', 'Simulação de Teste Expirado', 'O período de 5 dias foi marcado como expirado para teste do bloqueio.');
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

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHIFT, JSON.stringify(currentShift));
  }, [currentShift]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENT_SETTINGS, JSON.stringify(paymentSettings));
  }, [paymentSettings]);

  const updatePaymentSettings = (newSettings: Partial<PaymentSettings>) => {
    setPaymentSettings(prev => ({ ...prev, ...newSettings }));
    showToast('success', 'Configurações de Pagamento', 'Preferências de Pix e Maquininha salvas com sucesso.');
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
    setMovements(prev => [...restoredMovements, ...prev]);
    setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'CANCELADA', notes: `${s.notes || ''} | Cancelada: ${reason}` } : s));
    setCurrentShift(updatedShift);

    showToast('info', 'Venda Cancelada', `Venda ${sale.code} foi estornada e o estoque restaurado.`);
    return true;
  };

  // Product Operations
  const addProduct = (productData: Omit<Product, 'id' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
      updatedAt: new Date().toISOString(),
    };

    setProducts(prev => [newProduct, ...prev]);

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

    showToast('success', 'Produto Criado', `"${newProduct.name}" cadastrado com sucesso.`);
    return newProduct;
  };

  const updateProduct = (id: string, productData: Partial<Product>) => {
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, ...productData, updatedAt: new Date().toISOString() } : p))
    );
    showToast('success', 'Produto Atualizado', 'As informações foram salvas.');
  };

  const deleteProduct = (id: string) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    setProducts(prev => prev.filter(p => p.id !== id));
    setCart(prev => prev.filter(item => item.product.id !== id));
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

    setProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? {
              ...p,
              currentStock: newStock,
              costPrice: options?.unitCost && options.unitCost > 0 ? options.unitCost : p.costPrice,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );

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

    setProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, currentStock: newStock, updatedAt: new Date().toISOString() } : p))
    );
    setMovements(prev => [movement, ...prev]);
    showToast('success', 'Estoque Ajustado', `Estoque de "${prod.name}" alterado de ${previousStock} para ${newStock}.`);
    return true;
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
      'Todos os produtos, estoque e vendas foram limpos. Pronto para o cliente cadastrar seus descartáveis.'
    );
  };

  const loadDemoData = () => {
    setProducts(DEMO_PRODUCTS);
    showToast('info', '📦 Modelos de Exemplo Carregados', '5 descartáveis de demonstração foram adicionados para teste.');
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
        addCustomer,
        updateCustomer,
        addSupplier,
        updateSupplier,
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
        // Trial & Subscription
        subscription,
        isTrialActive,
        isTrialExpired,
        isSubscribed,
        isMasterAdmin,
        trialDaysRemaining,
        trialHoursRemaining,
        trialMinutesRemaining,
        isAccessAllowed,
        isSubscriptionModalOpen,
        setIsSubscriptionModalOpen,
        activateSubscription,
        resetTrial,
        simulateTrialExpired,
        simulateTrialDay,
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
