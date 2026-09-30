import { Product, Customer, Supplier, Sale, StockMovement, CashierShift } from '../types';

// ============================================================================
// BASE DE DADOS INICIAL LIMPA PARA ENTREGA AO CLIENTE (ZERO PRODUTOS E VENDAS)
// ============================================================================

// Inicializa vazio para o cliente cadastrar seus próprios descartáveis e produtos
export const INITIAL_PRODUCTS: Product[] = [];

// Histórico de vendas inicial vazio
export const INITIAL_SALES: Sale[] = [];

// Histórico de movimentações de estoque inicial vazio
export const INITIAL_MOVEMENTS: StockMovement[] = [];

// Cliente padrão inicial para balcão
export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Consumidor Balcão / Não Identificado',
    document: '000.000.000-00',
    phone: '(00) 00000-0000',
    totalPurchased: 0,
    address: 'Venda Presencial Balcão',
  },
];

// Fornecedores inicial vazio
export const INITIAL_SUPPLIERS: Supplier[] = [];

// Caixa diário inicial zerado
export const INITIAL_SHIFT: CashierShift = {
  id: 'shift-initial',
  openedAt: new Date().toISOString(),
  isOpen: true,
  operator: 'Operador Padrão',
  initialCash: 0,
  cashSales: 0,
  pixSales: 0,
  creditSales: 0,
  debitSales: 0,
  onCreditSales: 0,
  supplements: 0,
  bleedings: 0,
  finalCashCalculated: 0,
  notes: 'Caixa inicial pronto para cadastros e vendas.',
};

// ============================================================================
// PRODUTOS DE DEMONSTRAÇÃO (OPCIONAL - CASO O ADMINISTRADOR QUEIRA TESTAR)
// ============================================================================
export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-1',
    name: 'Copo Descartável 200ml Branco (C/ 100)',
    sku: 'CD-200-W',
    barcode: '7891234560012',
    category: 'Copos & Taças',
    unit: 'PCT',
    itemsPerUnit: 100,
    costPrice: 2.80,
    salePrice: 4.50,
    wholesalePrice: 3.90,
    wholesaleMinQty: 10,
    currentStock: 450,
    minStock: 100,
    maxStock: 800,
    location: 'Corredor A - Prateleira 01',
    description: 'Copo descartável de polipropileno (PP) para água e refrigerante. Pacote com 100 unidades.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    name: 'Prato Raso 21cm Branco Reforçado (C/ 10)',
    sku: 'PR-210-B',
    barcode: '7891234560029',
    category: 'Pratos & Potes',
    unit: 'PCT',
    itemsPerUnit: 10,
    costPrice: 1.90,
    salePrice: 3.20,
    wholesalePrice: 2.75,
    wholesaleMinQty: 15,
    currentStock: 120,
    minStock: 50,
    maxStock: 300,
    location: 'Corredor B - Prateleira 02',
    description: 'Prato plástico descartável para refeições e eventos. Diâmetro 21cm, fundo frisado.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    name: 'Guardanapo Folha Dupla 30x30 (C/ 2000)',
    sku: 'GD-300-D',
    barcode: '7891234560036',
    category: 'Guardanapos & Papéis',
    unit: 'FARDO',
    itemsPerUnit: 2000,
    costPrice: 5.40,
    salePrice: 8.90,
    wholesalePrice: 7.80,
    wholesaleMinQty: 5,
    currentStock: 350,
    minStock: 80,
    maxStock: 800,
    location: 'Corredor C - Palete 01',
    description: 'Guardanapo de papel macio folha dupla 30x30cm, ideal para lanchonetes e restaurantes.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-4',
    name: 'Marmitex de Alumínio Nº 8 c/ Tampa (C/ 100)',
    sku: 'MTX-AL-08',
    barcode: '7891234560050',
    category: 'Marmitex & Alumínio',
    unit: 'CX',
    itemsPerUnit: 100,
    costPrice: 42.00,
    salePrice: 68.00,
    wholesalePrice: 59.90,
    wholesaleMinQty: 4,
    currentStock: 80,
    minStock: 20,
    maxStock: 200,
    location: 'Corredor B - Prateleira 05',
    description: 'Marmitex descartável de alumínio para delivery de refeições e marmitas.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-5',
    name: 'Sacola Plástica Branca 40x50 Reforçada (C/ 1000)',
    sku: 'SAC-4050-B',
    barcode: '7891234560067',
    category: 'Sacolas & Bobinas',
    unit: 'FARDO',
    itemsPerUnit: 1000,
    costPrice: 34.00,
    salePrice: 55.00,
    wholesalePrice: 48.00,
    wholesaleMinQty: 3,
    currentStock: 45,
    minStock: 15,
    maxStock: 120,
    location: 'Corredor D - Palete 03',
    description: 'Sacola plástica tipo camiseta virgem de alta densidade para mercados e delivery.',
    updatedAt: new Date().toISOString(),
  },
];
