export type Category = 
  | 'Copos & Taças'
  | 'Pratos & Potes'
  | 'Marmitex & Alumínio'
  | 'Talheres & Canudos'
  | 'Guardanapos & Papéis'
  | 'Sacolas & Bobinas'
  | 'Filmes & Embalagens'
  | 'Higiene & Proteção';

export type UnitType = 'UN' | 'PCT' | 'CX' | 'FARDO' | 'ROLO' | 'KIT';

export type StockStatus = 'NORMAL' | 'ALERTA' | 'BAIXO' | 'ZERADO';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: Category;
  unit: UnitType;
  itemsPerUnit: number; // e.g. 100 cups per pack, or 2000 per box
  costPrice: number;    // Preço de Custo
  salePrice: number;    // Preço de Venda Unitário/Pct
  wholesalePrice?: number; // Preço de Atacado (ex: a partir de 5 unidades)
  wholesaleMinQty?: number;
  currentStock: number;
  minStock: number;     // Alerta de estoque mínimo
  maxStock: number;
  location?: string;    // Ex: Prateleira B-04
  supplierId?: string;
  supplierName?: string;
  description?: string;
  imageUrl?: string;
  updatedAt: string;
}

export type MovementType = 'ENTRADA' | 'SAIDA_VENDA' | 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'AVARIA_PERDA' | 'DEVOLUCAO';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  reason?: string;
  documentRef?: string; // Ex: NF-1234 ou Venda #4932
  user: string;
  timestamp: string;
}

export type PaymentMethod = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'A_PRAZO' | 'MISTO';

export type CardBrand = 'MASTERCARD' | 'VISA' | 'ELO' | 'HIPERCARD' | 'AMEX';

export interface SplitPaymentItem {
  method: PaymentMethod;
  amount: number;
  installments?: number;
  authOrNsu?: string;
  pixTxId?: string;
}

export type BankProvider = 'NUBANK' | 'ITAU' | 'BANCO_DO_BRASIL' | 'BRADESCO' | 'SANTANDER' | 'STONE' | 'MERCADOPAGO' | 'PAGBANK' | 'INTER' | 'C6BANK';

export interface PaymentDetails {
  cashReceived?: number;
  change?: number;
  installments?: number;
  notes?: string;
  // Automated Pix data
  pixKey?: string;
  pixTxId?: string;
  pixE2EId?: string;
  pixPayload?: string;
  bankReceived?: BankProvider;
  // Automated Card data
  cardBrand?: CardBrand;
  cardNsu?: string;
  cardAuthCode?: string;
  cardTerminal?: string;
  cardLast4?: string;
  // Split payment
  splitPayments?: SplitPaymentItem[];
}

export interface PaymentSettings {
  pixKey: string;
  pixKeyType: 'CNPJ' | 'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM';
  merchantName: string;
  merchantCity: string;
  merchantWhatsapp: string; // WhatsApp para receber pedidos da loja do cliente
  receivingBank: BankProvider;
  cardProvider: 'STONE' | 'PAGBANK' | 'MERCADOPAGO' | 'CIELO' | 'REDE' | 'TEF';
  autoPixDetection: boolean;
  autoCardApproval: boolean;
  soundEnabled: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number; // calculated based on wholesale rule or standard price
  isWholesaleApplied: boolean;
  total: number;
  notes?: string;
}

export interface Sale {
  id: string;
  code: string; // Ex: VEN-4932
  items: {
    productId: string;
    productName: string;
    productSku: string;
    category: Category;
    unit: UnitType;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  costTotal: number;
  profit: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: PaymentDetails;
  installments?: number;
  cashReceived?: number;
  change?: number;
  customerId?: string;
  customerName?: string;
  customerDocument?: string; // CPF or CNPJ
  status: 'CONCLUIDA' | 'CANCELADA' | 'PENDENTE';
  seller: string;
  createdAt: string;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  tradeName?: string; // Nome fantasia (ex: Lanchonete do Zé)
  document: string;   // CPF ou CNPJ
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  creditLimit?: number;
  totalPurchased: number;
  lastPurchaseDate?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  document: string; // CNPJ
  contactPerson: string;
  phone: string;
  email: string;
  category: string;
  leadTimeDays?: number;
}

export interface CashierShift {
  id: string;
  openedAt: string;
  closedAt?: string;
  isOpen: boolean;
  operator: string;
  initialCash: number;
  cashSales: number;
  pixSales: number;
  creditSales: number;
  debitSales: number;
  onCreditSales: number;
  supplements: number; // Entradas extras no caixa
  bleedings: number;   // Sangrias / Retiradas
  finalCashCalculated: number;
  finalCashActual?: number;
  difference?: number;
  notes?: string;
}

export type ActiveTab = 
  | 'client-store' 
  | 'quick-add-product' 
  | 'dashboard' 
  | 'inventory' 
  | 'pos' 
  | 'sales' 
  | 'cashier' 
  | 'customers' 
  | 'reports';

export interface SubscriptionState {
  isSubscribed: boolean;
  trialStartDate: string; // ISO string
  trialDurationDays: number; // 5 days
  planPrice: number; // 58.94
  subscriptionExpiresAt?: string; // ISO string
  planName: string;
  activatedAt?: string;
  lastPaymentRef?: string;
}

export interface CompanyAccount {
  id: string; // Unique workspace ID, e.g. "empresa_default" or "empresa_1712345678"
  name: string; // Business name, e.g. "Mercado Silva"
  slug: string; // URL-safe slug, e.g. "mercado-silva"
  ownerName: string; // Owner name, e.g. "João Silva"
  email?: string;
  phone?: string;
  category?: string;
  logoEmoji?: string; // e.g. "🏪", "🛒", "📦", "🍕", "🧴"
  createdAt: string;
}

