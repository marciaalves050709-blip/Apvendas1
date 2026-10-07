import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Category } from '../../types';
import { AutomatedPaymentModal } from './AutomatedPaymentModal';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Barcode, 
  User, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Percent, 
  CheckCircle, 
  X, 
  Sparkles,
  ArrowRight,
  ReceiptText,
  ShieldCheck,
  Zap
} from 'lucide-react';

const CATEGORIES: (Category | 'ALL')[] = [
  'ALL',
  'Copos & Taças',
  'Pratos & Potes',
  'Marmitex & Alumínio',
  'Talheres & Canudos',
  'Guardanapos & Papéis',
  'Sacolas & Bobinas',
  'Filmes & Embalagens',
  'Higiene & Proteção',
];

export const PosView: React.FC = () => {
  const { 
    products, 
    cart, 
    addToCart, 
    removeFromCart, 
    updateCartQty, 
    clearCart, 
    cartSubtotal, 
    cartDiscount, 
    setCartDiscount, 
    cartTotal, 
    cartItemCount, 
    customers, 
    selectedCustomerId, 
    setSelectedCustomerId, 
    showToast 
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<Category | 'ALL'>('ALL');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'R$' | '%'>('R$');
  const [discountInput, setDiscountInput] = useState<string>('');
  const [mobilePosTab, setMobilePosTab] = useState<'products' | 'cart'>('products');

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  // Filter products for grid
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search);
    const matchesCat = selectedCat === 'ALL' || p.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  // Handle barcode quick scan / enter
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    const matched = products.find(
      p => p.barcode === search.trim() || p.sku.toLowerCase() === search.trim().toLowerCase()
    );

    if (matched) {
      addToCart(matched, 1);
      setSearch('');
    } else {
      showToast('warning', 'Não Encontrado', `Nenhum produto com código "${search}".`);
    }
  };

  const handleApplyDiscount = () => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val <= 0) {
      setCartDiscount(0);
      return;
    }

    if (discountType === '%') {
      const calculated = (cartSubtotal * val) / 100;
      setCartDiscount(calculated);
    } else {
      setCartDiscount(Math.min(cartSubtotal, val));
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex items-center bg-slate-200 p-1.5 border-b border-slate-300 shrink-0">
        <button
          type="button"
          onClick={() => setMobilePosTab('products')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobilePosTab === 'products'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Catálogo ({filteredProducts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobilePosTab('cart')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            mobilePosTab === 'cart'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Carrinho ({cartItemCount})</span>
          {cartItemCount > 0 && (
            <span className="font-mono text-[10px] ml-1 bg-amber-400 text-slate-900 px-1.5 py-0.2 rounded-full font-black">
              {formatCurrency(cartTotal)}
            </span>
          )}
        </button>
      </div>

      {/* Left Column: Product Selection Grid */}
      <div className={`flex-1 flex flex-col overflow-hidden bg-slate-50 border-r border-slate-200 ${
        mobilePosTab === 'products' ? 'flex' : 'hidden md:flex'
      }`}>
        {/* Search & Category Filter Bar */}
        <div className="p-5 bg-white border-b border-slate-200 flex flex-col gap-3 shrink-0">
          <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Escanear código de barras, SKU ou digitar nome do produto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Adicionar
            </button>
          </form>

          {/* Categories bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIES.map(cat => {
              const isSelected = selectedCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat === 'ALL' ? 'Todos os Produtos' : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(prod => {
            const isOutOfStock = prod.currentStock <= 0;
            const inCart = cart.find(item => item.product.id === prod.id);

            return (
              <div
                key={prod.id}
                onClick={() => !isOutOfStock && addToCart(prod, 1)}
                className={`bg-white border rounded-xl p-4 flex flex-col justify-between transition-all select-none relative group ${
                  isOutOfStock
                    ? 'opacity-60 border-slate-200 bg-slate-50 cursor-not-allowed'
                    : 'border-slate-200 hover:border-indigo-500 hover:shadow-md cursor-pointer active:scale-98'
                }`}
              >
                {inCart && (
                  <div className="absolute top-2 right-2 bg-indigo-600 text-white font-mono font-bold text-[11px] w-6 h-6 rounded-full flex items-center justify-center shadow-xs">
                    {inCart.quantity}
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {prod.category}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                    {prod.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {prod.sku} • {prod.unit}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1">
                  {prod.wholesalePrice && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded self-start">
                      Atacado ({prod.wholesaleMinQty}+ un): {formatCurrency(prod.wholesalePrice)}
                    </span>
                  )}

                  <div className="flex items-end justify-between mt-1">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Preço Un.</span>
                      <span className="text-lg font-extrabold text-slate-900 font-mono">
                        {formatCurrency(prod.salePrice)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          prod.currentStock <= prod.minStock
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {prod.currentStock} {prod.unit.toLowerCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 text-sm">
              Nenhum produto encontrado para "{search}".
            </div>
          )}
        </div>

        {/* Mobile floating button to view cart */}
        {mobilePosTab === 'products' && cartItemCount > 0 && (
          <div className="md:hidden p-3 bg-white border-t border-slate-200 shrink-0 shadow-lg z-20">
            <button
              type="button"
              onClick={() => setMobilePosTab('cart')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-between px-4 shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-white" />
                <span>Ver Carrinho ({cartItemCount} {cartItemCount === 1 ? 'item' : 'itens'})</span>
              </div>
              <span className="font-mono font-black text-xs bg-indigo-800/80 px-2.5 py-1 rounded-lg">
                {formatCurrency(cartTotal)} →
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: POS Cart & Checkout */}
      <div className={`w-full md:w-96 lg:w-[420px] bg-white flex-col h-full shrink-0 border-l border-slate-200 shadow-md ${
        mobilePosTab === 'cart' ? 'flex' : 'hidden md:flex'
      }`}>
        {/* Cart Header & Customer Selector */}
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-base text-slate-900">Itens da Venda</h3>
              <span className="text-xs font-bold font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {cartItemCount} {cartItemCount === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>

          {/* Customer Selection */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 w-full focus:outline-none cursor-pointer"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.document ? `(${c.document})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 divide-y divide-slate-100">
          {cart.map(item => (
            <div key={item.product.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs text-slate-900 truncate">{item.product.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono text-slate-500">
                    {formatCurrency(item.unitPrice)} un
                  </span>
                  {item.isWholesaleApplied && (
                    <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded uppercase">
                      Atacado
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                  className="w-6 h-6 bg-white hover:bg-slate-200 rounded flex items-center justify-center text-slate-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  max={item.product.currentStock}
                  value={item.quantity}
                  onChange={e => updateCartQty(item.product.id, parseInt(e.target.value) || 1)}
                  className="w-10 text-center font-mono font-bold text-xs bg-transparent focus:outline-none"
                />
                <button
                  onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                  className="w-6 h-6 bg-white hover:bg-slate-200 rounded flex items-center justify-center text-slate-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Item Total */}
              <div className="text-right min-w-[70px]">
                <span className="font-bold font-mono text-sm text-slate-900 block">
                  {formatCurrency(item.total)}
                </span>
                <button
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-[10px] text-rose-500 hover:underline cursor-pointer"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <ShoppingCart className="w-12 h-12 text-slate-300 stroke-1 mb-2" />
              <p className="font-semibold text-sm text-slate-600">Carrinho Vazio</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                Clique nos produtos ou escaneie o código de barras para adicionar.
              </p>
            </div>
          )}
        </div>

        {/* Cart Bottom Summary & Checkout Trigger */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3">
          {/* Discount Field */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-slate-200 overflow-hidden bg-white shrink-0">
              <button
                type="button"
                onClick={() => setDiscountType('R$')}
                className={`px-2 py-1 text-[11px] font-bold ${discountType === 'R$' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
              >
                R$
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('%')}
                className={`px-2 py-1 text-[11px] font-bold ${discountType === '%' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
              >
                %
              </button>
            </div>
            <input
              type="number"
              placeholder={`Desconto (${discountType})`}
              value={discountInput}
              onChange={e => setDiscountInput(e.target.value)}
              className="flex-1 px-3 py-1 bg-white border border-slate-200 rounded-md text-xs font-mono focus:outline-none focus:border-indigo-600"
            />
            <button
              onClick={handleApplyDiscount}
              className="px-3 py-1 bg-slate-800 text-white text-xs font-medium rounded-md hover:bg-slate-700 cursor-pointer"
            >
              Aplicar
            </button>
          </div>

          <div className="flex flex-col gap-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-mono font-medium">{formatCurrency(cartSubtotal)}</span>
            </div>
            {cartDiscount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Desconto</span>
                <span className="font-mono">- {formatCurrency(cartDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900">
              <span className="font-extrabold text-base">TOTAL A PAGAR</span>
              <span className="font-black text-2xl text-indigo-600 font-mono">
                {formatCurrency(cartTotal)}
              </span>
            </div>
          </div>

          {/* Checkout Button */}
          <button
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Pagar & Finalizar Venda</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Automated Payment Modal (Pix, Card TEF, Split, Cash) */}
      <AutomatedPaymentModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
      />
    </div>
  );
};
