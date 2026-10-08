import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Category, PaymentMethod, CartItem } from '../../types';
import { formatCurrency, generatePixPayload, generatePixE2EId, BANKS_LIST, BankConfig, sounds } from '../../utils/pixHelper';
import { 
  formatPhoneToWhatsApp, 
  formatPhoneDisplay, 
  buildWhatsAppOrderMessage, 
  generateWhatsAppLink,
  CustomerOrderData 
} from '../../utils/whatsappHelper';
import { getProductImage, CATEGORY_EMOJIS } from '../../utils/productImages';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Edit3,
  Package,
  Send, 
  Smartphone, 
  User, 
  MapPin, 
  CheckCircle2, 
  Copy, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Phone, 
  Store, 
  Truck, 
  CreditCard, 
  QrCode, 
  Banknote, 
  MessageSquare, 
  Clock, 
  Sparkles, 
  X,
  AlertCircle,
  AlertTriangle,
  Ban,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  Info,
  Radio,
  Bell,
  ShieldCheck,
  Zap,
  Volume2
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';

const ALL_CATEGORIES: Category[] = [
  'Copos & Taças',
  'Pratos & Potes',
  'Marmitex & Alumínio',
  'Talheres & Canudos',
  'Guardanapos & Papéis',
  'Sacolas & Bobinas',
  'Filmes & Embalagens',
  'Higiene & Proteção',
];

interface ClientUser {
  name: string;
  phone: string;
  address: string;
  deliveryType: 'ENTREGA' | 'RETIRADA';
}

const STORAGE_KEY_CLIENT_USER = 'descart_client_user_v1';

export const ClientStoreView: React.FC = () => {
  const { 
    products, 
    paymentSettings, 
    updatePaymentSettings, 
    showToast, 
    addCustomer, 
    addStockMovement,
    setProductModalProduct,
    currentCompany,
    setActiveTab 
  } = useApp();

  // Client Session State
  const [clientUser, setClientUser] = useState<ClientUser>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CLIENT_USER);
      return saved ? JSON.parse(saved) : { name: '', phone: '', address: '', deliveryType: 'ENTREGA' };
    } catch {
      return { name: '', phone: '', address: '', deliveryType: 'ENTREGA' };
    }
  });

  const [isIdentified, setIsIdentified] = useState<boolean>(() => {
    return Boolean(clientUser.name.trim() && clientUser.phone.trim());
  });

  // Entry Form Inputs
  const [inputName, setInputName] = useState(clientUser.name);
  const [inputPhone, setInputPhone] = useState(clientUser.phone);
  const [inputAddress, setInputAddress] = useState(clientUser.address || '');
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<'ENTREGA' | 'RETIRADA'>(clientUser.deliveryType || 'ENTREGA');

  // Search and Category Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'TODOS'>('TODOS');

  // Local Client Cart
  const [cartItems, setCartItems] = useState<{ [productId: string]: number }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [cashChangeFor, setCashChangeFor] = useState<string>('');

  // Unavailable Product Alert Modal
  const [unavailableModalProduct, setUnavailableModalProduct] = useState<Product | null>(null);

  // Post-Order State
  const [completedOrder, setCompletedOrder] = useState<CustomerOrderData | null>(null);
  const [copiedPixKey, setCopiedPixKey] = useState(false);
  const [copiedOrderText, setCopiedOrderText] = useState(false);
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string>('');
  const [pixPaymentStatus, setPixPaymentStatus] = useState<'WAITING' | 'CONFIRMED'>('WAITING');
  const [pixE2EId, setPixE2EId] = useState<string>('');
  const [bankAlert, setBankAlert] = useState<{
    visible: boolean;
    bankName: string;
    bankTag: string;
    amount: number;
    time: string;
    e2eId: string;
  } | null>(null);
  const [radarPulseCount, setRadarPulseCount] = useState(0);

  const activeBank = useMemo(() => {
    return BANKS_LIST.find(b => b.id === (paymentSettings.receivingBank || 'NUBANK')) || BANKS_LIST[0];
  }, [paymentSettings.receivingBank]);

  // Live Banking Pulse Radar when waiting for Pix
  useEffect(() => {
    if (!completedOrder || completedOrder.paymentMethod !== 'PIX' || pixPaymentStatus !== 'WAITING') return;
    const interval = setInterval(() => {
      setRadarPulseCount(c => c + 1);
    }, 1500);
    return () => clearInterval(interval);
  }, [completedOrder, pixPaymentStatus]);

  // Function to confirm payment and trigger instant bank notification alert
  const handleConfirmBankPayment = (instant = false) => {
    if (pixPaymentStatus === 'CONFIRMED' || !completedOrder) return;

    const e2e = generatePixE2EId();
    const nowTime = new Date().toLocaleTimeString('pt-BR');
    setPixE2EId(e2e);
    setPixPaymentStatus('CONFIRMED');

    // Play bank notification sound and money drop
    if (paymentSettings.soundEnabled) {
      sounds.playBankNotification();
      setTimeout(() => sounds.playMoneyReceivedSound(), 150);
    }

    // Trigger visual confetti
    try {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.5 },
      });
    } catch {
      // ignore
    }

    // Trigger instant bank alert banner
    setBankAlert({
      visible: true,
      bankName: activeBank.name,
      bankTag: activeBank.shortName,
      amount: completedOrder.cartTotal,
      time: nowTime,
      e2eId: e2e,
    });

    showToast(
      'success',
      'Pagamento no Banco Identificado!',
      `Transferência Pix de ${formatCurrency(completedOrder.cartTotal)} recebida no ${activeBank.shortName} na mesma hora!`
    );
  };
  
  // WhatsApp Settings Quick Popover
  const [isSettingWhatsappOpen, setIsSettingWhatsappOpen] = useState(false);
  const [tempWhatsapp, setTempWhatsapp] = useState(paymentSettings.merchantWhatsapp || '5511999998888');

  // Format phone input
  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length > 7) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    setInputPhone(formatted);
  };

  // Login / Identify Action
  const handleIdentifyCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) {
      showToast('error', 'Nome Obrigatório', 'Por favor, digite seu nome.');
      return;
    }
    if (!inputPhone.trim() || inputPhone.replace(/\D/g, '').length < 8) {
      showToast('error', 'Telefone Inválido', 'Por favor, digite um número de WhatsApp válido.');
      return;
    }

    const newUser: ClientUser = {
      name: inputName.trim(),
      phone: inputPhone.trim(),
      address: inputAddress.trim(),
      deliveryType: selectedDeliveryType,
    };

    setClientUser(newUser);
    setIsIdentified(true);
    localStorage.setItem(STORAGE_KEY_CLIENT_USER, JSON.stringify(newUser));

    // Register customer in central store context if not exists
    addCustomer({
      name: newUser.name,
      document: '',
      phone: newUser.phone,
      address: newUser.address,
      city: paymentSettings.merchantCity || 'São Paulo',
      notes: 'Cliente cadastrado via Catálogo Mobile',
    });

    showToast('success', `Bem-vindo(a), ${newUser.name}!`, 'Selecione os produtos e faça seu pedido.');
  };

  // Handle click on out-of-stock product
  const handleUnavailableClick = (product: Product) => {
    setUnavailableModalProduct(product);
    showToast('error', 'Produto Esgotado', `O item "${product.name}" não está disponível no estoque no momento.`);
  };

  // Cart operations with strict stock verification
  const updateProductQty = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Check if product is out of stock when trying to add
    if (delta > 0 && product.currentStock <= 0) {
      handleUnavailableClick(product);
      return;
    }

    setCartItems(prev => {
      const current = prev[productId] || 0;
      const next = current + delta;

      if (delta > 0 && next > product.currentStock) {
        showToast('warning', 'Limite de Estoque', `Temos apenas ${product.currentStock} unidades de "${product.name}" disponíveis.`);
        return { ...prev, [productId]: product.currentStock };
      }

      if (next <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }

      return { ...prev, [productId]: next };
    });
  };

  const setProductExactQty = (productId: string, qty: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (qty > 0 && product.currentStock <= 0) {
      handleUnavailableClick(product);
      return;
    }

    setCartItems(prev => {
      if (qty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }

      const clampedQty = Math.min(qty, product.currentStock);
      if (qty > product.currentStock) {
        showToast('warning', 'Limite de Estoque', `Ajustado para ${product.currentStock} unidades disponíveis.`);
      }

      return { ...prev, [productId]: clampedQty };
    });
  };

  const clearClientCart = () => {
    setCartItems({});
  };

  // Calculate Cart Items with wholesale rules and current product info
  const detailedCart: CartItem[] = useMemo(() => {
    return Object.entries(cartItems)
      .map(([productId, rawQty]) => {
        const quantity = Number(rawQty) || 0;
        const product = products.find(p => p.id === productId);
        if (!product || quantity <= 0) return null;

        const isWholesale = Boolean(
          product.wholesalePrice &&
          product.wholesaleMinQty &&
          quantity >= product.wholesaleMinQty
        );

        const unitPrice = isWholesale ? (product.wholesalePrice || product.salePrice) : product.salePrice;
        const total = unitPrice * quantity;

        return {
          product,
          quantity,
          unitPrice,
          isWholesaleApplied: isWholesale,
          total,
        };
      })
      .filter((item): item is CartItem => item !== null);
  }, [cartItems, products]);

  // Identify any stock discrepancies in the cart
  const cartStockIssues = useMemo(() => {
    return detailedCart.filter(item => item.product.currentStock <= 0 || item.quantity > item.product.currentStock);
  }, [detailedCart]);

  const hasStockError = cartStockIssues.length > 0;

  // Auto-fix cart items exceeding available stock or out of stock
  const handleAutoFixCartStock = () => {
    setCartItems(prev => {
      const updated: { [id: string]: number } = {};
      Object.entries(prev).forEach(([id, rawQty]) => {
        const qty = Number(rawQty) || 0;
        const p = products.find(prod => prod.id === id);
        if (!p || p.currentStock <= 0) {
          // completely remove unavailable item
        } else {
          updated[id] = Math.min(qty, p.currentStock);
        }
      });
      return updated;
    });
    showToast('success', 'Sacola Ajustada', 'Itens esgotados foram removidos e quantidades ajustadas ao estoque real.');
  };

  const cartTotalItems = useMemo(() => {
    return Object.values(cartItems).reduce<number>((sum, qty) => sum + (Number(qty) || 0), 0);
  }, [cartItems]);

  const cartSubtotal = useMemo(() => {
    return detailedCart.reduce((sum, item) => sum + (item.product.salePrice * item.quantity), 0);
  }, [detailedCart]);

  const cartTotal = useMemo(() => {
    return detailedCart.reduce((sum, item) => sum + item.total, 0);
  }, [detailedCart]);

  const cartDiscount = Math.max(0, cartSubtotal - cartTotal);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesCat = selectedCategory === 'TODOS' || product.category === selectedCategory;
      const term = search.toLowerCase();
      const matchesSearch = 
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        (product.description && product.description.toLowerCase().includes(term));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  // Generate QR Code for Pix when completed or viewing
  useEffect(() => {
    if (paymentMethod === 'PIX' && cartTotal > 0) {
      const pixObj = generatePixPayload({
        pixKey: paymentSettings.pixKey || '12.345.678/0001-90',
        merchantName: paymentSettings.merchantName || 'APP DE VENDAS',
        merchantCity: paymentSettings.merchantCity || 'SAO PAULO',
        amount: cartTotal,
        txId: 'PED' + Math.floor(1000 + Math.random() * 9000),
      });

      QRCode.toDataURL(pixObj.payload, { width: 220, margin: 1 })
        .then(url => setPixQrDataUrl(url))
        .catch(() => setPixQrDataUrl(''));
    }
  }, [paymentMethod, cartTotal, paymentSettings]);

  // Finalize Order and Send to WhatsApp with strict stock safety
  const handleSendOrderToWhatsApp = () => {
    if (detailedCart.length === 0) {
      showToast('error', 'Sacola Vazia', 'Adicione pelo menos um item antes de finalizar.');
      return;
    }

    // Strict validation: do not allow buying unavailable or out-of-stock items
    for (const item of detailedCart) {
      if (item.product.currentStock <= 0) {
        showToast('error', 'Produto Esgotado', `O item "${item.product.name}" está sem estoque e não pode ser comprado.`);
        setUnavailableModalProduct(item.product);
        return;
      }
      if (item.quantity > item.product.currentStock) {
        showToast('error', 'Estoque Insuficiente', `O item "${item.product.name}" tem apenas ${item.product.currentStock} unidades disponíveis.`);
        return;
      }
    }

    if (clientUser.deliveryType === 'ENTREGA' && !clientUser.address.trim()) {
      showToast('error', 'Endereço Obrigatório', 'Por favor, informe o endereço para entrega.');
      return;
    }

    const orderNumber = Math.floor(1000 + Math.random() * 9000).toString();
    const orderData: CustomerOrderData = {
      orderCode: orderNumber,
      customerName: clientUser.name,
      customerPhone: clientUser.phone,
      deliveryType: clientUser.deliveryType,
      deliveryAddress: clientUser.address,
      paymentMethod,
      cashChangeFor: cashChangeFor ? parseFloat(cashChangeFor.replace(',', '.')) : undefined,
      cart: detailedCart,
      cartSubtotal,
      cartDiscount,
      cartTotal,
      notes: orderNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    // Deduct inventory items so stock is accurately reserved/sold
    detailedCart.forEach(item => {
      addStockMovement(item.product.id, 'SAIDA_VENDA', item.quantity, {
        reason: `Pedido WhatsApp #${orderNumber} (${clientUser.name})`,
        documentRef: `WA-${orderNumber}`,
        user: clientUser.name,
      });
    });

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    setCompletedOrder(orderData);
    setIsCartOpen(false);
    clearClientCart();

    // Build URL and open WhatsApp in new tab
    const waUrl = generateWhatsAppLink(orderData, paymentSettings);
    window.open(waUrl, '_blank');

    showToast('success', 'Pedido Gerado!', 'Redirecionando para o WhatsApp do vendedor com os detalhes da compra.');
  };

  // Copy Pix Key
  const handleCopyPix = () => {
    if (!paymentSettings.pixKey) return;
    navigator.clipboard.writeText(paymentSettings.pixKey);
    setCopiedPixKey(true);
    showToast('info', 'Copiado!', 'Chave Pix copiada para a área de transferência.');
    setTimeout(() => setCopiedPixKey(false), 2500);
  };

  // Copy Full Message
  const handleCopyOrderText = () => {
    if (!completedOrder) return;
    const msg = buildWhatsAppOrderMessage(completedOrder, paymentSettings);
    navigator.clipboard.writeText(msg);
    setCopiedOrderText(true);
    showToast('info', 'Texto Copiado!', 'Você pode colar diretamente no chat do WhatsApp.');
    setTimeout(() => setCopiedOrderText(false), 2500);
  };

  // Save WhatsApp settings
  const handleSaveWhatsapp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tempWhatsapp.replace(/\D/g, '');
    if (clean.length < 9) {
      showToast('error', 'Número Inválido', 'Digite o DDD + Número do WhatsApp.');
      return;
    }
    updatePaymentSettings({ merchantWhatsapp: tempWhatsapp });
    setIsSettingWhatsappOpen(false);
    showToast('success', 'WhatsApp Salvo!', `Pedidos serão enviados para ${formatPhoneDisplay(tempWhatsapp)}.`);
  };

  // STEP 1: Identification Screen (Ultra Simple & 100% Mobile Accessible)
  if (!isIdentified) {
    return (
      <div className="flex-1 w-full h-full bg-slate-100 overflow-y-auto overscroll-contain p-3 sm:p-6 pb-40 sm:pb-16 flex flex-col items-center justify-start min-h-0">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden shrink-0 my-2 sm:my-auto">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 sm:p-6 text-white text-center relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-2.5 sm:mb-3 text-2xl sm:text-3xl shadow-inner">
              🛍️
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {paymentSettings.merchantName || currentCompany?.name || 'Minha Loja'}
            </h1>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-[11px] font-semibold mt-2.5 text-emerald-50">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Catálogo & Loja Virtual no Celular</span>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleIdentifyCustomer} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
            <div className="text-center mb-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-800">Identifique-se para começar</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">Informe seu nome e WhatsApp para ver o catálogo e fazer pedidos</p>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Seu Nome / Empresa</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Márcia Alves ou Cliente"
                value={inputName}
                onChange={e => setInputName(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 text-sm font-medium text-slate-900 outline-none transition-all"
              />
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Seu WhatsApp (com DDD)</span>
              </label>
              <input
                type="tel"
                required
                placeholder="(11) 99999-9999"
                value={inputPhone}
                onChange={e => handlePhoneChange(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 text-sm font-medium text-slate-900 outline-none transition-all"
              />
            </div>

            {/* Endereço Inicial (Opcional) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Endereço de Entrega (Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Rua, Número, Bairro (ou deixe em branco)"
                value={inputAddress}
                onChange={e => setInputAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 text-xs font-medium text-slate-900 outline-none transition-all"
              />
            </div>

            {/* Main Submit Button: Entrar e Ver Produtos */}
            <button
              type="submit"
              className="w-full py-3.5 sm:py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Entrar e Ver Produtos</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Fast Alternative: Direct Visitor Entry without filling */}
            <button
              type="button"
              onClick={() => {
                setClientUser({ name: 'Visitante', phone: '(11) 99999-9999', address: '', deliveryType: 'RETIRADA' });
                setIsIdentified(true);
              }}
              className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>👀 Ver Produtos sem cadastro (Visitante) →</span>
            </button>

            {/* Fast Link to Inventory/Product update */}
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Ver Produtos pra Atualizar no Estoque</span>
            </button>

            {/* Demo Quick login & Back to dashboard */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setInputName('Cliente Demonstração');
                  setInputPhone('(11) 98765-4321');
                  setInputAddress('Av. Paulista, 1000 - Bela Vista');
                }}
                className="hover:text-emerald-700 transition-colors underline cursor-pointer text-[11px]"
              >
                Preencher dados de teste
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="hover:text-emerald-700 font-bold transition-colors text-[11px] flex items-center gap-1 cursor-pointer"
              >
                Entrar na Gestão →
              </button>
            </div>
          </form>

          {/* Footer signature */}
          <div className="text-center py-2.5 sm:py-3 text-[11px] text-slate-400 font-medium border-t border-slate-100 bg-slate-50">
            Criado por <strong className="text-slate-600 font-bold">Marcia Alves</strong>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Main Customer Shopping View
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden relative">
      {/* Top Customer Mobile Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 shadow-xs flex items-center justify-between z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm shrink-0">
            🛒
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-slate-900 truncate">
                Olá, {clientUser.name.split(' ')[0]}!
              </span>
              <button
                onClick={() => setIsIdentified(false)}
                title="Editar dados"
                className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
              >
                Trocar
              </button>
            </div>
            <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-slate-400" />
              <span>{formatPhoneDisplay(clientUser.phone)}</span>
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2">
          {/* Back to management button */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
            title="Ir para o Painel de Gestão"
          >
            <span>Painel Gestão</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* WhatsApp Destination Config */}
          <button
            onClick={() => setIsSettingWhatsappOpen(true)}
            title="Configurar WhatsApp que recebe os pedidos"
            className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            <Send className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">WhatsApp do Vendedor</span>
          </button>

          {/* Cart Trigger Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden xs:inline">{formatCurrency(cartTotal)}</span>
            {cartTotalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs border-2 border-white">
                {cartTotalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Search & Category Filter Section */}
      <div className="p-3 bg-white border-b border-slate-200 shrink-0 space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar produtos pelo nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-slate-100 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Product Manager Switcher */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {filteredProducts.length} de {products.length} produtos
          </span>
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className="text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3 h-3 text-indigo-600" />
            <span>Ver Produtos no Estoque pra Atualizar</span>
          </button>
        </div>

        {/* Category Horizontal Scroll Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory('TODOS')}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'TODOS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🔥 Todos ({products.length})
          </button>
          {ALL_CATEGORIES.map(cat => {
            const count = products.filter(p => p.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{CATEGORY_EMOJIS[cat] || '📦'}</span>
                <span>{cat}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Catalog Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-28">
        <div className="max-w-6xl mx-auto">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-6">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                🔍
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Nenhum produto encontrado</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Tente buscar por outro termo ou selecione a categoria "Todos".
              </p>
              <button
                onClick={() => { setSearch(''); setSelectedCategory('TODOS'); }}
                className="mt-3 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100"
              >
                Limpar Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map(product => {
                const qtyInCart = cartItems[product.id] || 0;
                const isWholesaleApplicable = Boolean(
                  product.wholesalePrice &&
                  product.wholesaleMinQty &&
                  qtyInCart >= product.wholesaleMinQty
                );
                const currentPrice = isWholesaleApplicable 
                  ? (product.wholesalePrice || product.salePrice) 
                  : product.salePrice;

                const isOutOfStock = product.currentStock <= 0;
                const isMaxReached = !isOutOfStock && qtyInCart >= product.currentStock;

                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col shadow-xs hover:shadow-md ${
                      isOutOfStock
                        ? 'border-slate-200 opacity-90'
                        : qtyInCart > 0 
                        ? 'border-emerald-500 ring-2 ring-emerald-500/10' 
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Product Image Banner */}
                    <div className="h-36 sm:h-40 bg-slate-100 relative overflow-hidden group">
                      <img
                        src={getProductImage(product.category, product.imageUrl)}
                        alt={product.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                          isOutOfStock ? 'grayscale-40 contrast-75' : 'group-hover:scale-105'
                        }`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

                      {/* Out of Stock Overlay Ribbon */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-2">
                          <span className="px-3 py-1 bg-rose-600/95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg border border-rose-400/50 flex items-center gap-1.5 animate-pulse">
                            <Ban className="w-3.5 h-3.5" />
                            <span>Indisponível</span>
                          </span>
                        </div>
                      )}

                      {/* Category Badge */}
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold rounded-md">
                        {CATEGORY_EMOJIS[product.category]} {product.category}
                      </span>

                      {/* Stock Badge */}
                      <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 text-[10px] font-bold rounded-md backdrop-blur-md flex items-center gap-1 ${
                        isOutOfStock 
                          ? 'bg-rose-600 text-white shadow-sm' 
                          : product.currentStock <= product.minStock
                          ? 'bg-amber-500/90 text-white'
                          : 'bg-emerald-600/90 text-white'
                      }`}>
                        {isOutOfStock ? (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            <span>Esgotado</span>
                          </>
                        ) : (
                          `${product.currentStock} em estoque`
                        )}
                      </span>

                      {/* Package/Unit Pill on image bottom */}
                      <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px] font-medium">
                        <span className="bg-slate-900/80 px-2 py-0.5 rounded font-mono">
                          {product.unit} • {product.itemsPerUnit} un/pct
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className={`font-bold text-xs sm:text-sm line-clamp-2 leading-tight ${
                          isOutOfStock ? 'text-slate-700' : 'text-slate-900'
                        }`}>
                          {product.name}
                        </h4>
                        
                        {product.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                            {product.description}
                          </p>
                        )}

                        {/* Stock Alert Warning if out of stock */}
                        {isOutOfStock && (
                          <div className="mt-2 px-2 py-1 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-800 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>Produto indisponível no estoque</span>
                          </div>
                        )}

                        {/* Wholesale Alert Tag */}
                        {!isOutOfStock && product.wholesalePrice && product.wholesaleMinQty && (
                          <div className="mt-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-900 font-medium flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>Atacado ({product.wholesaleMinQty}+ un): <strong>{formatCurrency(product.wholesalePrice)}</strong> cada</span>
                          </div>
                        )}
                      </div>

                      {/* Pricing, Quick Update and Action Button */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">Preço</p>
                            <p className={`text-base font-black leading-none ${
                              isOutOfStock ? 'text-slate-500 line-through' : 'text-slate-900'
                            }`}>
                              {formatCurrency(currentPrice)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductModalProduct(product);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 ml-1"
                            title="Atualizar dados, preço e estoque deste produto"
                          >
                            <Edit3 className="w-3 h-3 text-indigo-600" />
                            <span>Atualizar</span>
                          </button>
                        </div>

                        {/* Quantity Controls with Out of Stock Protection */}
                        {isOutOfStock ? (
                          <button
                            type="button"
                            onClick={() => handleUnavailableClick(product)}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                            title="Clique para ver alerta de indisponibilidade"
                          >
                            <Ban className="w-3.5 h-3.5 text-rose-600" />
                            <span>Indisponível</span>
                          </button>
                        ) : qtyInCart === 0 ? (
                          <button
                            type="button"
                            onClick={() => updateProductQty(product.id, 1)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar</span>
                          </button>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-300 rounded-xl p-1">
                              <button
                                type="button"
                                onClick={() => updateProductQty(product.id, -1)}
                                className="w-7 h-7 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center font-black transition-colors cursor-pointer shadow-xs"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-7 text-center font-black text-xs text-emerald-950">
                                {qtyInCart}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateProductQty(product.id, 1)}
                                disabled={isMaxReached}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-black transition-colors shadow-xs ${
                                  isMaxReached 
                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                }`}
                                title={isMaxReached ? `Estoque máximo atingido (${product.currentStock})` : 'Adicionar mais 1'}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {isMaxReached && (
                              <span className="text-[9px] font-bold text-amber-700">
                                Máx: {product.currentStock}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Signature */}
          <div className="mt-10 pt-6 pb-4 text-center border-t border-slate-200">
            <p className="text-xs font-bold text-slate-700">App vendas</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Criado por <strong className="text-slate-600 font-bold">Marcia Alves</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Floating Bottom Cart Bar for Mobile */}
      {cartTotalItems > 0 && !isCartOpen && (
        <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-96 z-30 animate-slide-up">
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-black text-sm">
                {cartTotalItems}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Total da Sacola</p>
                <p className="text-base font-black text-emerald-400">{formatCurrency(cartTotal)}</p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <span>Ver Pedido</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Cart & Checkout Modal Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm uppercase tracking-wide">Minha Sacola de Compras</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28 sm:pb-8">
              {/* Customer Info Card */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 flex items-center justify-between">
                <div>
                  <p className="font-bold">{clientUser.name}</p>
                  <p className="text-[11px] text-emerald-700">{formatPhoneDisplay(clientUser.phone)}</p>
                </div>
                <button
                  onClick={() => { setIsCartOpen(false); setIsIdentified(false); }}
                  className="text-[11px] font-bold text-emerald-800 underline cursor-pointer"
                >
                  Alterar
                </button>
              </div>

              {/* OUT OF STOCK ALERT BANNER IN CART */}
              {hasStockError && (
                <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-2xl text-rose-950 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-black text-rose-950">Atenção: Itens Indisponíveis no Estoque!</p>
                      <p className="text-rose-700 mt-0.5 leading-relaxed">
                        Existem produtos esgotados ou com quantidade superior ao estoque em sua sacola. O pedido não pode ser finalizado com itens esgotados.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFixCartStock}
                    className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ajustar Sacola Automaticamente</span>
                  </button>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                  <span>Itens Selecionados ({detailedCart.length})</span>
                  <button
                    onClick={clearClientCart}
                    className="text-rose-600 hover:text-rose-700 text-[11px] flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Esvaziar</span>
                  </button>
                </div>

                {detailedCart.map(item => {
                  const isItemOutOfStock = item.product.currentStock <= 0;
                  const isItemExceeding = item.quantity > item.product.currentStock;

                  return (
                    <div 
                      key={item.product.id} 
                      className={`p-3 rounded-2xl flex flex-col gap-2 border transition-all ${
                        isItemOutOfStock 
                          ? 'bg-rose-50/80 border-rose-300' 
                          : isItemExceeding
                          ? 'bg-amber-50/80 border-amber-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-slate-900 truncate">{item.product.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.quantity} x {formatCurrency(item.unitPrice)}
                            {item.isWholesaleApplied && <span className="text-emerald-700 font-bold ml-1">(Atacado)</span>}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
                            <button
                              onClick={() => updateProductQty(item.product.id, -1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-bold text-xs text-slate-900">{item.quantity}</span>
                            <button
                              onClick={() => updateProductQty(item.product.id, 1)}
                              disabled={isItemOutOfStock || item.quantity >= item.product.currentStock}
                              className={`w-6 h-6 flex items-center justify-center rounded ${
                                isItemOutOfStock || item.quantity >= item.product.currentStock
                                  ? 'text-slate-300 cursor-not-allowed'
                                  : 'text-slate-600 hover:bg-slate-100 cursor-pointer'
                              }`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <p className="font-black text-xs text-slate-900 w-16 text-right">
                            {formatCurrency(item.total)}
                          </p>
                        </div>
                      </div>

                      {/* Item Stock Warning Banner */}
                      {isItemOutOfStock ? (
                        <div className="flex items-center justify-between p-1.5 bg-rose-100/90 border border-rose-300 rounded-xl text-[10px] text-rose-900 font-bold">
                          <span className="flex items-center gap-1">
                            <Ban className="w-3 h-3 text-rose-600" />
                            Produto Esgotado (0 un em estoque)
                          </span>
                          <button
                            type="button"
                            onClick={() => updateProductQty(item.product.id, -item.quantity)}
                            className="text-rose-700 hover:text-rose-950 underline cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      ) : isItemExceeding ? (
                        <div className="flex items-center justify-between p-1.5 bg-amber-100/90 border border-amber-300 rounded-xl text-[10px] text-amber-900 font-bold">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-amber-700" />
                            Estoque insuficiente: máximo {item.product.currentStock} un.
                          </span>
                          <button
                            type="button"
                            onClick={() => setProductExactQty(item.product.id, item.product.currentStock)}
                            className="text-amber-800 hover:text-amber-950 underline cursor-pointer"
                          >
                            Ajustar
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Delivery vs Pickup */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Como deseja receber?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...clientUser, deliveryType: 'ENTREGA' as const };
                      setClientUser(updated);
                      localStorage.setItem(STORAGE_KEY_CLIENT_USER, JSON.stringify(updated));
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      clientUser.deliveryType === 'ENTREGA'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>Entrega no Local</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...clientUser, deliveryType: 'RETIRADA' as const };
                      setClientUser(updated);
                      localStorage.setItem(STORAGE_KEY_CLIENT_USER, JSON.stringify(updated));
                    }}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      clientUser.deliveryType === 'RETIRADA'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Store className="w-4 h-4 text-emerald-600" />
                    <span>Retirar no Balcão</span>
                  </button>
                </div>

                {clientUser.deliveryType === 'ENTREGA' && (
                  <div className="mt-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Endereço Completo para Entrega:
                    </label>
                    <input
                      type="text"
                      placeholder="Rua, Número, Bairro, Ponto de Referência"
                      value={clientUser.address}
                      onChange={e => {
                        const updated = { ...clientUser, address: e.target.value };
                        setClientUser(updated);
                        localStorage.setItem(STORAGE_KEY_CLIENT_USER, JSON.stringify(updated));
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PIX')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'PIX'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pix</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARTAO_CREDITO')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'CARTAO_CREDITO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Cartão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('DINHEIRO')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'DINHEIRO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Dinheiro</span>
                  </button>
                </div>

                {/* Dinheiro Troco Input */}
                {paymentMethod === 'DINHEIRO' && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Precisa de troco para quanto? (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 50,00 ou 100,00"
                      value={cashChangeFor}
                      onChange={e => setCashChangeFor(e.target.value)}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-xs font-medium bg-white outline-none"
                    />
                  </div>
                )}

                {/* Pix Quick Info */}
                {paymentMethod === 'PIX' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1">
                        <QrCode className="w-3.5 h-3.5 text-emerald-700" />
                        Chave Pix: {paymentSettings.pixKey}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedPixKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPixKey ? 'Copiado!' : 'Copiar Chave'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Notes */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Observações do Pedido (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Pode entregar até as 17h, interfone 42..."
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 bg-slate-50 focus:bg-white outline-none resize-none"
                />
              </div>
            </div>

            {/* Drawer Footer / Submit */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
              <div className="space-y-1 text-xs">
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(cartSubtotal)}</span>
                  </div>
                )}
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Desconto Atacado:</span>
                    <span>-{formatCurrency(cartDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total a Pagar:</span>
                  <span className="text-base text-emerald-600">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              {/* Stock Warning Action or WhatsApp Submit Button */}
              {hasStockError ? (
                <div className="space-y-2">
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-bold text-center flex items-center justify-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Ajuste os itens esgotados antes de enviar o pedido</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoFixCartStock}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Ajustar Itens & Continuar</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOrderToWhatsApp}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4 fill-white" />
                  <span>Enviar Pedido no WhatsApp ({formatCurrency(cartTotal)})</span>
                </button>
              )}

              <p className="text-[10px] text-center text-slate-400">
                Seu pedido será enviado formatado diretamente para o WhatsApp do vendedor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Order Completed Success Modal */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-600 text-white p-6 text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-100" />
              </div>
              <h2 className="text-xl font-black">Pedido Enviado com Sucesso!</h2>
              <p className="text-xs text-emerald-100 mt-1">
                Pedido <strong>#{completedOrder.orderCode}</strong> no valor de <strong>{formatCurrency(completedOrder.cartTotal)}</strong>
              </p>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <p className="font-bold text-slate-800">Resumo da Compra:</p>
                <p className="text-slate-600">👤 <strong>Cliente:</strong> {completedOrder.customerName}</p>
                <p className="text-slate-600">📦 <strong>Itens:</strong> {completedOrder.cart.length} produtos ({cartTotalItems} un/pcts)</p>
                <p className="text-slate-600">🛵 <strong>Recebimento:</strong> {completedOrder.deliveryType === 'ENTREGA' ? 'Entrega em Domicílio' : 'Retirada no Balcão'}</p>
                <p className="text-slate-600">💳 <strong>Pagamento:</strong> {completedOrder.paymentMethod}</p>
              </div>

              {/* Pix Info, QR Code & Instant Bank Payment Alert */}
              {completedOrder.paymentMethod === 'PIX' && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-3.5 shadow-xs">
                  {/* Status Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                      <QrCode className="w-4 h-4 text-emerald-700" />
                      Pagamento via Pix
                    </span>
                    
                    {pixPaymentStatus === 'CONFIRMED' ? (
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-black flex items-center gap-1 shadow-xs animate-bounce">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pago no Banco</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black flex items-center gap-1 shadow-xs animate-pulse">
                        <Radio className="w-3.5 h-3.5" />
                        <span>Aguardando Banco</span>
                      </span>
                    )}
                  </div>

                  {/* Bank Webhook Radar Status */}
                  <div className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                    pixPaymentStatus === 'CONFIRMED'
                      ? 'bg-emerald-100/80 border-emerald-400 text-emerald-950'
                      : 'bg-white border-emerald-200 text-slate-700 shadow-xs'
                  }`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${
                        pixPaymentStatus === 'CONFIRMED'
                          ? 'bg-emerald-600'
                          : radarPulseCount % 2 === 0 ? 'bg-amber-500 scale-110' : 'bg-emerald-500 scale-90'
                      } transition-transform duration-300`} />
                      <div className="flex-1">
                        <p className="font-bold text-[11px]">
                          {pixPaymentStatus === 'CONFIRMED'
                            ? `Dinheiro Recebido no ${activeBank.shortName}!`
                            : `Identificando Transferência no ${activeBank.shortName}...`}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                          {pixPaymentStatus === 'CONFIRMED'
                            ? `Autenticação E2E: ${pixE2EId || 'CONFIRMADO'}`
                            : 'O sistema avisa e toca o alerta no mesmo segundo em que o valor cai no banco.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Bank Push Notification Alert Display */}
                  {bankAlert && bankAlert.visible && (
                    <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-xl text-left shadow-lg border border-emerald-400 animate-scale-up space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Bell className="w-3 h-3 text-amber-300 animate-bounce" />
                          Alerta Bancário em Tempo Real
                        </span>
                        <span className="text-[10px] opacity-80">{bankAlert.time}</span>
                      </div>
                      <p className="font-black text-xs pt-1">
                        Transferência Pix de {formatCurrency(bankAlert.amount)} Recebida no {bankAlert.bankTag}!
                      </p>
                      <p className="text-[10px] text-emerald-100">
                        O dinheiro caiu no banco e o pagamento do pedido #{completedOrder.orderCode} foi confirmado com sucesso.
                      </p>
                    </div>
                  )}

                  {/* QR Code */}
                  {pixQrDataUrl && (
                    <div className="relative inline-block">
                      <img
                        src={pixQrDataUrl}
                        alt="QR Code Pix"
                        className={`w-36 h-36 mx-auto rounded-xl border p-1 bg-white shadow-xs transition-all ${
                          pixPaymentStatus === 'CONFIRMED' ? 'border-emerald-500 opacity-60' : 'border-emerald-300'
                        }`}
                      />
                      {pixPaymentStatus === 'CONFIRMED' && (
                        <div className="absolute inset-0 bg-emerald-950/30 rounded-xl flex items-center justify-center">
                          <span className="px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-lg shadow-md flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>PAGO</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleCopyPix}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                    >
                      {copiedPixKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPixKey ? 'Chave Pix Copiada!' : `Copiar Chave Pix (${paymentSettings.pixKey})`}</span>
                    </button>

                    {/* Instant Simulation Action */}
                    {pixPaymentStatus === 'WAITING' && (
                      <button
                        type="button"
                        onClick={() => handleConfirmBankPayment(true)}
                        className="py-2 px-3 bg-emerald-100 hover:bg-emerald-200 active:scale-95 text-emerald-900 border border-emerald-300 font-bold rounded-xl text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Simular Notificação de Pagamento no Banco</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <a
                  href={generateWhatsAppLink(completedOrder, paymentSettings)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Reabrir WhatsApp do Vendedor</span>
                </a>

                <button
                  type="button"
                  onClick={handleCopyOrderText}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer"
                >
                  {copiedOrderText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedOrderText ? 'Mensagem Copiada!' : 'Copiar Texto do Pedido'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCompletedOrder(null);
                    clearClientCart();
                  }}
                  className="w-full py-2.5 text-slate-500 hover:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Fazer Novo Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Setting Quick Modal */}
      {isSettingWhatsappOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">WhatsApp do Vendedor</h3>
              </div>
              <button
                onClick={() => setIsSettingWhatsappOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Digite o número de WhatsApp para onde os clientes enviarão os pedidos do catálogo mobile.
            </p>

            <form onSubmit={handleSaveWhatsapp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Número de Celular / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Ex: 5511999998888 ou 11 98765-4321"
                  value={tempWhatsapp}
                  onChange={e => setTempWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-3 border border-slate-300 rounded-xl text-xs font-medium bg-slate-50 focus:bg-white focus:border-emerald-600 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
              >
                Salvar Número do WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Modal Alerta de Produto Indisponível */}
      {unavailableModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-rose-200 overflow-hidden animate-scale-up">
            <div className="bg-rose-600 text-white p-5 text-center">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-2.5">
                <Ban className="w-7 h-7 text-rose-100" />
              </div>
              <h3 className="text-base font-black uppercase tracking-wide">Produto Indisponível</h3>
              <p className="text-xs text-rose-100 mt-0.5 font-medium">Item sem estoque no momento</p>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <p className="font-black text-slate-900 text-sm mb-1">{unavailableModalProduct.name}</p>
                <p className="text-[11px] text-slate-500">
                  Categoria: <strong className="text-slate-700">{unavailableModalProduct.category}</strong>
                </p>
                <p className="text-[11px] text-slate-500">
                  Embalagem: <strong className="text-slate-700">{unavailableModalProduct.unit} • {unavailableModalProduct.itemsPerUnit} un/pct</strong>
                </p>
                <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-rose-600 font-bold">Estoque atual:</span>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-black rounded-md text-[10px]">
                    0 unidades
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Para garantir que seu pedido seja entregue sem atrasos, o sistema não permite a compra de produtos que estão fora de estoque.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setUnavailableModalProduct(null)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Entendi, ver outros produtos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
