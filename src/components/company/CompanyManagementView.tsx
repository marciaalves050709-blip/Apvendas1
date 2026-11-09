import React, { useState, useMemo, useEffect } from 'react';
import { useApp, checkIsMasterPassword } from '../../context/AppContext';
import { Product, Category, Supplier, BankProvider, SellerProfile } from '../../types';
import { formatCurrency, generatePixPayload, BANKS_LIST, sounds } from '../../utils/pixHelper';
import { getProductImage, CATEGORY_EMOJIS, ALL_ACTIVITY_CATEGORIES } from '../../utils/productImages';
import QRCode from 'qrcode';
import { 
  Building2, 
  Lock, 
  Unlock, 
  DollarSign, 
  Truck, 
  TrendingUp, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  FileText, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  KeyRound, 
  ShieldCheck, 
  Layers, 
  Package, 
  ShoppingBag, 
  ExternalLink, 
  MessageCircle, 
  Tag,
  AlertTriangle,
  UserPlus,
  CheckCircle2,
  Sparkles,
  Send,
  Copy,
  Clock,
  UserCheck,
  QrCode,
  CreditCard,
  Share2
} from 'lucide-react';

export const CompanyManagementView: React.FC = () => {
  const {
    products,
    updateProduct,
    suppliers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    lockCompanyArea,
    companyPassword,
    setCompanyPassword,
    showToast,
    setActiveTab,
    setProductModalProduct,
    extendedTrialClients,
    addExtendedTrialClient,
    removeExtendedTrialClient,
    extendTrialForCurrentDevice,
    paymentSettings,
    updatePaymentSettings,
    activeSeller,
    updateSeller,
    sellers,
    setIsSellerWhatsappModalOpen,
    currentCompany,
    updateCurrentCompany,
    openShareModal
  } = useApp();

  // Active Sub-tab inside Company Area: 'costs' | 'suppliers' | 'pix-whatsapp' | 'extend-trial' | 'security'
  const [activeSubTab, setActiveSubTab] = useState<'costs' | 'suppliers' | 'pix-whatsapp' | 'extend-trial' | 'security'>('costs');

  // Extend Trial for Client state
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [lastLiberatedClient, setLastLiberatedClient] = useState<any>(null);
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);

  // Pix & WhatsApp Configuration state for the Company
  const [pixKeyInput, setPixKeyInput] = useState(activeSeller?.pixKey || paymentSettings.pixKey || '');
  const [pixKeyTypeInput, setPixKeyTypeInput] = useState<SellerProfile['pixKeyType']>(activeSeller?.pixKeyType || paymentSettings.pixKeyType || 'PHONE');
  const [merchantNameInput, setMerchantNameInput] = useState(activeSeller?.merchantName || paymentSettings.merchantName || currentCompany?.name || 'Minha Loja');
  const [merchantCityInput, setMerchantCityInput] = useState(activeSeller?.merchantCity || paymentSettings.merchantCity || 'Barcarena PA');
  const [receivingBankInput, setReceivingBankInput] = useState<BankProvider>(activeSeller?.receivingBank || paymentSettings.receivingBank || 'NUBANK');
  const [sellerNameInput, setSellerNameInput] = useState(activeSeller?.name || 'Atendente');
  const [whatsappInput, setWhatsappInput] = useState(activeSeller?.whatsapp || paymentSettings.merchantWhatsapp || '');

  // Live QR Code for Company Pix
  const [pixPreviewQrUrl, setPixPreviewQrUrl] = useState<string>('');
  const [pixPreviewPayload, setPixPreviewPayload] = useState<string>('');
  const [copiedCompanyPix, setCopiedCompanyPix] = useState(false);

  // Sync inputs if activeSeller changes
  useEffect(() => {
    if (activeSeller) {
      setPixKeyInput(activeSeller.pixKey || paymentSettings.pixKey || '');
      setPixKeyTypeInput(activeSeller.pixKeyType || paymentSettings.pixKeyType || 'PHONE');
      setMerchantNameInput(activeSeller.merchantName || paymentSettings.merchantName || currentCompany?.name || 'Minha Loja');
      setMerchantCityInput(activeSeller.merchantCity || paymentSettings.merchantCity || 'Barcarena PA');
      setReceivingBankInput(activeSeller.receivingBank || paymentSettings.receivingBank || 'NUBANK');
      setSellerNameInput(activeSeller.name || 'Atendente');
      setWhatsappInput(activeSeller.whatsapp || paymentSettings.merchantWhatsapp || '');
    }
  }, [activeSeller, paymentSettings, currentCompany]);

  // Live QR Code Generation for Company Pix
  useEffect(() => {
    const key = pixKeyInput.trim();
    if (!key) {
      setPixPreviewPayload('');
      setPixPreviewQrUrl('');
      return;
    }
    const name = (merchantNameInput.trim() || currentCompany?.name || 'MINHA LOJA').toUpperCase();
    const city = (merchantCityInput.trim() || 'Barcarena PA');
    try {
      const payloadObj = generatePixPayload({
        pixKey: key,
        merchantName: name,
        merchantCity: city,
        amount: 25.00,
        txId: '***'
      });
      setPixPreviewPayload(payloadObj.payload);
      QRCode.toDataURL(payloadObj.payload, {
        width: 220,
        margin: 1.5,
        color: { dark: '#0f172a', light: '#ffffff' }
      }).then(url => setPixPreviewQrUrl(url)).catch(() => setPixPreviewQrUrl(''));
    } catch {
      setPixPreviewPayload('');
      setPixPreviewQrUrl('');
    }
  }, [pixKeyInput, merchantNameInput, merchantCityInput, currentCompany]);

  const handleSaveCompanyPix = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = pixKeyInput.trim();
    if (!cleanKey) {
      showToast('error', 'Chave Pix Obrigatória', 'Informe a Chave Pix da empresa.');
      return;
    }
    const cleanWhatsapp = whatsappInput.trim();
    if (!cleanWhatsapp) {
      showToast('error', 'WhatsApp Obrigatório', 'Informe o número do WhatsApp para receber pedidos.');
      return;
    }

    const updatedData = {
      name: sellerNameInput.trim() || 'Atendente',
      whatsapp: cleanWhatsapp,
      pixKey: cleanKey,
      pixKeyType: pixKeyTypeInput,
      merchantName: merchantNameInput.trim() || currentCompany?.name || 'Minha Loja',
      merchantCity: merchantCityInput.trim() || 'Barcarena PA',
      receivingBank: receivingBankInput
    };

    if (activeSeller?.id) {
      updateSeller(activeSeller.id, updatedData);
    }
    const cleanStoreName = merchantNameInput.trim() || currentCompany?.name || 'Minha Loja';
    updateCurrentCompany({
      name: cleanStoreName
    });
    updatePaymentSettings({
      pixKey: cleanKey,
      pixKeyType: pixKeyTypeInput,
      merchantName: cleanStoreName,
      merchantCity: merchantCityInput.trim() || 'Barcarena PA',
      merchantWhatsapp: cleanWhatsapp,
      receivingBank: receivingBankInput
    });

    try {
      sounds.playMoneyReceivedSound();
    } catch {}

    showToast('success', 'Chave Pix da Empresa Atualizada!', 'A nova chave Pix e WhatsApp já estão ativos na loja do cliente.');
  };

  // Search & Category Filter for Costs Table
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Inline editing for Cost Price
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [tempCostValue, setTempCostValue] = useState<string>('');

  // Supplier Modal state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supName, setSupName] = useState('');
  const [supTradeName, setSupTradeName] = useState('');
  const [supDoc, setSupDoc] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supCategory, setSupCategory] = useState('Distribuidora');
  const [supLeadDays, setSupLeadDays] = useState('3');

  // Security tab state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Financial calculations
  const totalStockCost = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.costPrice * p.currentStock), 0);
  }, [products]);

  const totalStockSaleValue = useMemo(() => {
    return products.reduce((acc, p) => acc + (p.salePrice * p.currentStock), 0);
  }, [products]);

  const totalPotentialProfit = totalStockSaleValue - totalStockCost;

  const averageMargin = useMemo(() => {
    if (totalStockCost <= 0) return 0;
    return ((totalPotentialProfit / totalStockCost) * 100);
  }, [totalStockCost, totalPotentialProfit]);

  // Filter products for costs table
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchTerm, selectedCategory]);

  // Save quick inline cost price
  const handleSaveQuickCost = (productId: string) => {
    const parsed = parseFloat(tempCostValue.replace(',', '.'));
    if (isNaN(parsed) || parsed < 0) {
      showToast('error', 'Valor Inválido', 'Digite um valor de custo válido.');
      return;
    }
    updateProduct(productId, { costPrice: parsed });
    setEditingCostId(null);
    showToast('success', 'Custo Atualizado', 'Novo preço de custo salvo com sucesso.');
  };

  // Supplier modal handlers
  const handleOpenNewSupplier = () => {
    setEditingSupplier(null);
    setSupName('');
    setSupTradeName('');
    setSupDoc('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupCategory('Distribuidora');
    setSupLeadDays('3');
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupName(sup.name);
    setSupTradeName('');
    setSupDoc(sup.document);
    setSupContact(sup.contactPerson);
    setSupPhone(sup.phone);
    setSupEmail(sup.email);
    setSupCategory(sup.category);
    setSupLeadDays(sup.leadTimeDays ? sup.leadTimeDays.toString() : '3');
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = supName.trim();
    if (!trimmed) {
      showToast('error', 'Nome Obrigatório', 'Preencha a razão social ou nome do fornecedor.');
      return;
    }

    const payload = {
      name: trimmed,
      document: supDoc.trim(),
      contactPerson: supContact.trim(),
      phone: supPhone.trim(),
      email: supEmail.trim(),
      category: supCategory,
      leadTimeDays: parseInt(supLeadDays) || 3,
    };

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, payload);
      showToast('success', 'Fornecedor Atualizado', `Dados de "${trimmed}" foram atualizados.`);
    } else {
      addSupplier(payload);
      showToast('success', 'Fornecedor Cadastrado', `Fornecedor "${trimmed}" cadastrado com sucesso.`);
    }

    setIsSupplierModalOpen(false);
  };

  // Open WhatsApp to order/quote with supplier
  const handleContactSupplierWhatsApp = (phone: string, supplierName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      showToast('error', 'Sem Telefone', 'Cadastre o WhatsApp do fornecedor para enviar mensagens.');
      return;
    }
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const text = encodeURIComponent(`Olá, ${supplierName}! Gostaria de solicitar uma cotação/pedido de reposição de mercadorias da nossa empresa.`);
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  // Delete supplier
  const handleDeleteSupplier = (id: string, name: string) => {
    deleteSupplier(id);
    showToast('info', 'Fornecedor Excluído', `O fornecedor "${name}" foi removido.`);
  };

  // Change company password (requires valid current password or master password)
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const currTrimmed = currentPassword.trim();
    const isMaster = checkIsMasterPassword(currTrimmed);
    const isCurrentMatch = currTrimmed === companyPassword;
    const isDefaultFallback = currTrimmed === '1234';

    if (!isMaster && !isCurrentMatch && !isDefaultFallback) {
      showToast('error', 'Senha Atual Incorreta', 'Digite a senha atual da empresa ou a senha mestra para autorizar a alteração.');
      return;
    }

    const cleanNew = newPassword.trim();
    if (!cleanNew) {
      showToast('error', 'Senha Obrigatória', 'Digite a nova senha.');
      return;
    }

    if (cleanNew.length < 4) {
      showToast('error', 'Senha Muito Curta', 'A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (cleanNew !== confirmPassword.trim()) {
      showToast('error', 'Senhas Diferentes', 'A confirmação de senha não confere.');
      return;
    }

    setCompanyPassword(cleanNew);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    showToast('success', 'Senha da Empresa Atualizada!', 'A nova senha foi gravada com sucesso. Apenas quem souber esta senha poderá acessar fornecedores e custos de venda.');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top Banner: Confidential Company Security Status Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-4 sm:px-6 py-3 shrink-0 flex items-center justify-between gap-3 shadow-md border-b border-indigo-950">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
            <Unlock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-xs sm:text-sm text-white truncate">
                Área da Empresa: Fornecedores & Custos de Venda
              </span>
              <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase rounded-md tracking-wider">
                Área Confidencial
              </span>
            </div>
            <p className="text-[10px] text-slate-300 truncate">
              O cliente não tem acesso a esta tela. Informações de custo e fornecedor são estritamente sigilosas.
            </p>
          </div>
        </div>

        {/* Actions: Divulgar, Edit Pix & Lock Back to Client Sales Area */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => openShareModal(currentCompany)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Divulgar e compartilhar o catálogo desta empresa para clientes"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Divulgar Empresa</span>
            <span className="sm:hidden">Divulgar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('pix-whatsapp')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Configurar a chave Pix e WhatsApp da empresa"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Configurar Pix da Empresa</span>
            <span className="sm:hidden">Pix</span>
          </button>

          <button
            type="button"
            onClick={lockCompanyArea}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Bloquear imediatamente e voltar para a Loja do Cliente"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bloquear e Voltar ao Cliente</span>
            <span className="sm:hidden">Bloquear</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="p-4 sm:p-6 pb-2 shrink-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Custo Total do Estoque */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Investimento em Custo
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 block mt-0.5 font-mono">
              {formatCurrency(totalStockCost)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Custo total do estoque parado
            </span>
          </div>

          {/* Card 2: Valor de Venda Potencial */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Valor Total em Vendas
            </span>
            <span className="text-base sm:text-lg font-black text-emerald-700 block mt-0.5 font-mono">
              {formatCurrency(totalStockSaleValue)}
            </span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">
              Faturamento bruto esperado
            </span>
          </div>

          {/* Card 3: Lucro Bruto Estimado */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Lucro Bruto Previsto
            </span>
            <span className="text-base sm:text-lg font-black text-indigo-700 block mt-0.5 font-mono">
              {formatCurrency(totalPotentialProfit)}
            </span>
            <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
              Margem Média: +{averageMargin.toFixed(0)}%
            </span>
          </div>

          {/* Card 4: Fornecedores Cadastrados */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Fornecedores Ativos
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 block mt-0.5 font-mono">
              {suppliers.length} Parceiros
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {products.length} produtos cadastrados
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="px-4 sm:px-6 pt-2 shrink-0 border-b border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubTab('costs')}
          className={`py-2.5 px-4 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'costs'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4 text-indigo-600" />
          <span>Tabela de Custos & Margem de Venda ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('suppliers')}
          className={`py-2.5 px-4 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'suppliers'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 text-emerald-600" />
          <span>Gestão de Fornecedores ({suppliers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pix-whatsapp')}
          className={`py-2.5 px-4 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'pix-whatsapp'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4 text-emerald-600" />
          <span>Configurar Pix & WhatsApp da Empresa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('extend-trial')}
          className={`py-2.5 px-4 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'extend-trial'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Liberar Teste (+2 Dias)</span>
          {extendedTrialClients.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
              {extendedTrialClients.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('security')}
          className={`py-2.5 px-4 rounded-t-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeSubTab === 'security'
              ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-600" />
          <span>Alterar Senha da Empresa</span>
        </button>
      </div>

      {/* Sub-Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-6">
        {/* ======================= TAB 1: CUSTOS & MARGEM ======================= */}
        {activeSubTab === 'costs' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar produto por nome, código ou fornecedor..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>

              {/* Category Filter Chips / Select */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="ALL">Todas as Atividades ({products.length})</option>
                  {ALL_ACTIVITY_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_EMOJIS[cat] || '📦'} {cat}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setProductModalProduct('new')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Produto</span>
                </button>
              </div>
            </div>

            {/* Products Cost Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-3">Atividade / Categoria</th>
                      <th className="py-3 px-3">Preço de Custo (R$)</th>
                      <th className="py-3 px-3">Preço de Venda (R$)</th>
                      <th className="py-3 px-3">Lucro Unitário</th>
                      <th className="py-3 px-3">Margem %</th>
                      <th className="py-3 px-3">Fornecedor</th>
                      <th className="py-3 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredProducts.map(prod => {
                      const cost = prod.costPrice || 0;
                      const sale = prod.salePrice || 0;
                      const unitProfit = sale - cost;
                      const marginPct = cost > 0 ? ((unitProfit / cost) * 100) : 0;
                      const isEditingThis = editingCostId === prod.id;

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Produto e Foto */}
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={getProductImage(prod.category, prod.imageUrl)}
                                alt={prod.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate max-w-[200px]">{prod.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">SKU: {prod.sku}</p>
                              </div>
                            </div>
                          </td>

                          {/* Categoria / Atividade */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md font-bold text-[11px] text-slate-700 inline-flex items-center gap-1">
                              <span>{CATEGORY_EMOJIS[prod.category] || '📦'}</span>
                              <span>{prod.category}</span>
                            </span>
                          </td>

                          {/* Preço de Custo (Com edição rápida inline) */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isEditingThis ? (
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 text-xs">R$</span>
                                <input
                                  type="text"
                                  autoFocus
                                  value={tempCostValue}
                                  onChange={e => setTempCostValue(e.target.value)}
                                  className="w-20 px-2 py-1 bg-white border-2 border-indigo-600 rounded-lg text-xs font-mono font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveQuickCost(prod.id)}
                                  className="p-1 bg-emerald-600 text-white rounded-md cursor-pointer hover:bg-emerald-700"
                                  title="Salvar Custo"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCostId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Cancelar"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCostId(prod.id);
                                  setTempCostValue(prod.costPrice.toFixed(2));
                                }}
                                className="font-mono font-bold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer flex items-center gap-1 group"
                                title="Clique para alterar o custo"
                              >
                                <span>{formatCurrency(cost)}</span>
                                <Edit2 className="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-600" />
                              </button>
                            )}
                          </td>

                          {/* Preço de Venda */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-emerald-700">
                            {formatCurrency(sale)}
                          </td>

                          {/* Lucro Unitário */}
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-indigo-700">
                            +{formatCurrency(unitProfit)}
                          </td>

                          {/* Margem % */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              marginPct >= 50
                                ? 'bg-emerald-100 text-emerald-800'
                                : marginPct >= 25
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              +{marginPct.toFixed(0)}%
                            </span>
                          </td>

                          {/* Fornecedor (Com seleção rápida) */}
                          <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                            <select
                              value={prod.supplierId || ''}
                              onChange={e => {
                                const selectedId = e.target.value;
                                const sup = suppliers.find(s => s.id === selectedId);
                                updateProduct(prod.id, {
                                  supplierId: selectedId || undefined,
                                  supplierName: sup ? sup.name : undefined
                                });
                                showToast(
                                  'success', 
                                  'Fornecedor Vinculado', 
                                  sup ? `"${sup.name}" associado a "${prod.name}".` : `Fornecedor desvinculado de "${prod.name}".`
                                );
                              }}
                              className="px-2 py-1 bg-slate-50 hover:bg-white border border-slate-200 hover:border-indigo-400 focus:border-indigo-600 rounded-lg text-[11px] font-semibold text-slate-700 outline-none cursor-pointer max-w-[140px] truncate"
                              title="Selecione o fornecedor deste produto"
                            >
                              <option value="">(Sem fornecedor)</option>
                              {suppliers.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Ações */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setProductModalProduct(prod)}
                              className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 font-bold text-[11px] rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          Nenhum produto encontrado com os filtros atuais.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 2: FORNECEDORES ======================= */}
        {activeSubTab === 'suppliers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  Fornecedores Cadastrados ({suppliers.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Parceiros de compra e fabricantes de mercadorias da sua empresa
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenNewSupplier}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Cadastrar Fornecedor</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map(sup => {
                const suppliedProductsCount = products.filter(p => p.supplierId === sup.id || p.supplierName === sup.name).length;

                return (
                  <div key={sup.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-black text-sm text-slate-900 truncate">{sup.name}</h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block mt-1">
                            {sup.category || 'Distribuidora'}
                          </span>
                        </div>

                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
                          {suppliedProductsCount} produtos
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100 mt-2">
                        {sup.document && (
                          <p className="flex items-center gap-1.5 font-mono text-[11px]">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>CNPJ: {sup.document}</span>
                          </p>
                        )}
                        {sup.contactPerson && (
                          <p className="flex items-center gap-1.5 text-[11px]">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Contato: {sup.contactPerson}</span>
                          </p>
                        )}
                        {sup.phone && (
                          <p className="flex items-center gap-1.5 text-[11px]">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp: <strong>{sup.phone}</strong></span>
                          </p>
                        )}
                        {sup.email && (
                          <p className="flex items-center gap-1.5 text-[11px]">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{sup.email}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      {sup.phone && (
                        <button
                          type="button"
                          onClick={() => handleContactSupplierWhatsApp(sup.phone, sup.name)}
                          className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Pedir Cotação</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditSupplier(sup)}
                        className="py-1.5 px-3 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteSupplier(sup.id, sup.name)}
                        className="p-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        title="Excluir fornecedor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {suppliers.length === 0 && (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                  <Truck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Nenhum fornecedor cadastrado ainda</p>
                  <p className="text-xs text-slate-500 mt-1">Cadastre seus parceiros para gerenciar custos de reposição.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= TAB: CONFIGURAR PIX & WHATSAPP ======================= */}
        {activeSubTab === 'pix-whatsapp' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-scale-up">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
                  💳
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-md">
                      Área da Empresa
                    </span>
                    <span className="text-xs text-emerald-200 font-bold">
                      Gestão Exclusiva do Lojista
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                    Configuração de Pix & WhatsApp de Vendas
                  </h3>
                  <p className="text-xs text-emerald-100 max-w-lg mt-0.5">
                    Defina a chave Pix onde você recebe o dinheiro dos clientes e o número de WhatsApp que recebe os pedidos gerados no catálogo.
                  </p>
                </div>
              </div>

              {/* Quick Button to Open Multi-Seller Modal */}
              <button
                type="button"
                onClick={() => setIsSellerWhatsappModalOpen(true)}
                className="px-4 py-2.5 bg-white text-slate-900 hover:bg-emerald-50 active:scale-95 text-xs font-black rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-2 shrink-0"
              >
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Gerenciar Múltiplos Vendedores</span>
              </button>
            </div>

            {/* Banner de Divulgação da Empresa no WhatsApp & Redes */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-2 border-emerald-300 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                  📢
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 flex-wrap">
                    <span>Divulgar Catálogo & Link desta Empresa</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase">
                      WhatsApp & Redes
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 max-w-xl leading-relaxed">
                    Envie o catálogo da <strong>{currentCompany.name}</strong> para seus clientes comprarem online, escolherem entrega ou retirada e pagarem pelo Pix direto no WhatsApp!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openShareModal(currentCompany)}
                className="w-full sm:w-auto px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Divulgar Minha Loja no WhatsApp</span>
              </button>
            </div>

            {/* Main Form & Live Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Column */}
              <form onSubmit={handleSaveCompanyPix} className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                    Dados do Pix da Empresa
                  </h4>
                </div>

                {/* Pix Key and Key Type */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Chave Pix da Empresa *</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Usada pelos clientes para pagar</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 91993192405 ou email@loja.com ou 00.000.000/0001-00"
                      value={pixKeyInput}
                      onChange={e => setPixKeyInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-600 shadow-2xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Tipo da Chave Pix
                      </label>
                      <select
                        value={pixKeyTypeInput}
                        onChange={e => setPixKeyTypeInput(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-emerald-600"
                      >
                        <option value="PHONE">Telefone / Celular</option>
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                        <option value="EMAIL">E-mail</option>
                        <option value="RANDOM">Chave Aleatória (EVP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Banco de Recebimento
                      </label>
                      <select
                        value={receivingBankInput}
                        onChange={e => setReceivingBankInput(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer focus:bg-white focus:border-emerald-600"
                      >
                        {BANKS_LIST.map(bank => (
                          <option key={bank.id} value={bank.id}>
                            {bank.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Nome do Titular / Beneficiário
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Minha Loja ou Nome Completo"
                        value={merchantNameInput}
                        onChange={e => setMerchantNameInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Cidade do Titular da Conta
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Barcarena PA"
                        value={merchantCityInput}
                        onChange={e => setMerchantCityInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
                      WhatsApp para Receber os Pedidos
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                        <span>Número do WhatsApp *</span>
                        <span className="text-[10px] text-slate-400">com DDD</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Ex: 5591993192405 ou (91) 99319-2405"
                        value={whatsappInput}
                        onChange={e => setWhatsappInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-emerald-600 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Nome do Atendente / Vendedor
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Atendente Comercial"
                        value={sellerNameInput}
                        onChange={e => setSellerNameInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Salvar Chave Pix & WhatsApp da Empresa</span>
                  </button>
                </div>
              </form>

              {/* Preview Column */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-4 text-center">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Prévia do QR Code Pix</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Ao Vivo
                    </span>
                  </div>

                  {pixPreviewQrUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-white border-2 border-emerald-300 rounded-2xl shadow-sm inline-block">
                        <img
                          src={pixPreviewQrUrl}
                          alt="QR Code Pix"
                          className="w-44 h-44 object-contain rounded-lg mx-auto"
                        />
                      </div>

                      <div className="text-center">
                        <p className="text-xs font-black text-slate-900">
                          {merchantNameInput || currentCompany?.name || 'Minha Empresa'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Chave: <strong>{pixKeyInput}</strong>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Banco: {BANKS_LIST.find(b => b.id === receivingBankInput)?.name || 'Nubank'}
                        </p>
                      </div>

                      {pixPreviewPayload && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(pixPreviewPayload);
                            setCopiedCompanyPix(true);
                            showToast('success', 'Código Copiado!', 'Código Pix Copia e Cola copiado com sucesso.');
                            setTimeout(() => setCopiedCompanyPix(false), 2500);
                          }}
                          className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {copiedCompanyPix ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                          <span>{copiedCompanyPix ? 'Código Copiado!' : 'Copiar Código Copia e Cola'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 px-4 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">Nenhuma chave Pix configurada</p>
                      <p className="text-[11px] text-slate-400 mt-1">Preencha o formulário ao lado para gerar o QR Code oficial da sua empresa.</p>
                    </div>
                  )}
                </div>

                {/* Info Card */}
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-black text-emerald-900">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Segurança da Empresa</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Apenas a empresa autenticada por senha tem permissão para alterar a chave Pix e o WhatsApp de recebimento. Seus clientes só visualizam a chave no momento de pagar e não podem alterá-la.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: LIBERAR TESTE (+2 DIAS) ======================= */}
        {activeSubTab === 'extend-trial' && (
          <div className="max-w-2xl mx-auto space-y-5 animate-scale-up">
            <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/15 to-emerald-500/10 border-2 border-emerald-300 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-emerald-200">
                <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-sm">
                  ✨
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <span>Área Vitalícia da Administradora: Liberar Cliente</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full uppercase">
                      +2 Dias Grátis
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600">
                    Cadastre o nome e celular/WhatsApp do cliente para estender o teste do aplicativo por mais 2 dias.
                  </p>
                </div>
              </div>

              {/* Form to Liberate Client */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newClientName.trim()) {
                    showToast('error', 'Nome Obrigatório', 'Informe o nome do cliente a ser liberado.');
                    return;
                  }
                  if (!newClientPhone.trim()) {
                    showToast('error', 'Celular Obrigatório', 'Informe o celular/WhatsApp do cliente.');
                    return;
                  }
                  const liberated = addExtendedTrialClient(newClientName.trim(), newClientPhone.trim(), 2);
                  setLastLiberatedClient(liberated);
                  setNewClientName('');
                  setNewClientPhone('');
                  showToast('success', 'Cliente Liberado (+2 Dias)', `O teste para ${liberated.clientName} foi estendido por mais 2 dias.`);
                }} 
                className="space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nome do Cliente / Empresa *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: João da Farmácia"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Celular / WhatsApp do Cliente *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: (91) 99319-2405 ou 91993192405"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:border-emerald-600 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Gera liberação imediata e link exclusivo pronto para WhatsApp</span>
                  </span>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Liberar +2 Dias de Teste</span>
                  </button>
                </div>
              </form>

              {/* Card do Último Cliente Liberado */}
              {lastLiberatedClient && (
                <div className="p-3.5 bg-emerald-100/90 border border-emerald-300 rounded-2xl space-y-2 animate-scale-up">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-slate-900">{lastLiberatedClient.clientName}</span>
                        <span className="text-[11px] text-emerald-800 block font-mono">{lastLiberatedClient.clientPhone}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-bold rounded-md">
                      Liberado com Sucesso (+2 Dias)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const cleanPhone = lastLiberatedClient.clientPhone.replace(/\D/g, '');
                        const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                        const directUrl = `${window.location.origin}/?tab=client-store&trial=extended&cliente=${encodeURIComponent(lastLiberatedClient.clientName)}`;
                        const text = encodeURIComponent(
                          `Olá ${lastLiberatedClient.clientName}! Seu acesso de teste foi liberado pela Administradora Márcia por mais 2 dias grátis!\n\n` +
                          `Acesse agora o aplicativo no link abaixo:\n${directUrl}`
                        );
                        window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
                      }}
                      className="flex-1 min-w-[200px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar no WhatsApp do Cliente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const directUrl = `${window.location.origin}/?tab=client-store&trial=extended&cliente=${encodeURIComponent(lastLiberatedClient.clientName)}`;
                        navigator.clipboard.writeText(directUrl);
                        setCopiedClientId(lastLiberatedClient.id);
                        showToast('success', 'Link Copiado!', 'Link exclusivo de liberação copiado.');
                        setTimeout(() => setCopiedClientId(null), 2500);
                      }}
                      className="px-3 py-2 bg-white hover:bg-slate-100 active:scale-95 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      {copiedClientId === lastLiberatedClient.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedClientId === lastLiberatedClient.id ? 'Copiado!' : 'Copiar Link'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Lista Completa de Clientes Liberados */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Clientes Liberados no Sistema ({extendedTrialClients.length})
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">
                  Total de permissões ativas
                </span>
              </div>

              {extendedTrialClients.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                  Nenhum cliente liberado ainda. Preencha o formulário acima para liberar +2 dias de teste.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {extendedTrialClients.map((client) => {
                    const isCopied = copiedClientId === client.id;
                    const expDate = new Date(client.expiresAt);
                    const isStillActive = expDate.getTime() > Date.now();

                    return (
                      <div
                        key={client.id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">{client.clientName}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isStillActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isStillActive ? 'Ativo' : 'Expirado'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono block">{client.clientPhone}</span>
                          <span className="text-[10px] text-slate-400">
                            Expira em: {expDate.toLocaleDateString('pt-BR')} às {expDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const cleanPhone = client.clientPhone.replace(/\D/g, '');
                              const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                              const directUrl = `${window.location.origin}/?tab=client-store&trial=extended&cliente=${encodeURIComponent(client.clientName)}`;
                              const text = encodeURIComponent(
                                `Olá ${client.clientName}! Seu acesso de teste foi liberado pela Administradora Márcia por mais 2 dias grátis!\n\n` +
                                `Acesse agora o aplicativo no link abaixo:\n${directUrl}`
                              );
                              window.open(`https://wa.me/${phoneWithCountry}?text=${text}`, '_blank');
                            }}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const directUrl = `${window.location.origin}/?tab=client-store&trial=extended&cliente=${encodeURIComponent(client.clientName)}`;
                              navigator.clipboard.writeText(directUrl);
                              setCopiedClientId(client.id);
                              showToast('success', 'Link Copiado!', 'Link copiado.');
                              setTimeout(() => setCopiedClientId(null), 2500);
                            }}
                            className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs cursor-pointer"
                            title="Copiar Link"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              removeExtendedTrialClient(client.id);
                              showToast('info', 'Liberação Removida', `A extensão de teste de ${client.clientName} foi removida.`);
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs cursor-pointer"
                            title="Excluir liberação"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= TAB 3: SEGURANÇA & SENHA ======================= */}
        {activeSubTab === 'security' && (
          <div className="max-w-lg mx-auto bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900">
                  Configurar Senha da Empresa
                </h4>
                <p className="text-xs text-slate-500">
                  Protege o preço de custo e fornecedores dos clientes
                </p>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-950 leading-relaxed">
              <strong>Como Funciona:</strong> Quando um cliente ou atendente estiver usando o catálogo de vendas, a Área da Empresa permanece bloqueada. Digitando esta senha, você tem acesso aos custos reais, relatórios financeiros e fornecedores.
            </div>

            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Senha Atual da Empresa *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Padrão inicial: 1234</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="****************"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 tracking-widest"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nova Senha da Empresa *
                </label>
                <input
                  type="password"
                  required
                  placeholder="****************"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 tracking-widest"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirmar Nova Senha *
                </label>
                <input
                  type="password"
                  required
                  placeholder="****************"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none focus:bg-white focus:border-indigo-600 tracking-widest"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-[11px] text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Apenas a Empresa Tem Acesso:</strong> Clientes que abrem a loja de compras só veem preços de venda. Esta senha protege o cadastro de fornecedores, custos de reposição e lucratividade real.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Salvar Nova Senha</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm">
                  {editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-3.5 overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Razão Social / Nome da Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Distribuidora Central Ltda"
                  value={supName}
                  onChange={e => setSupName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    CNPJ ou CPF
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={supDoc}
                    onChange={e => setSupDoc(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium outline-none focus:bg-white focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pessoa de Contato / Vendedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Representante"
                    value={supContact}
                    onChange={e => setSupContact(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    WhatsApp para Pedidos
                  </label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={supPhone}
                    onChange={e => setSupPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    E-mail do Fornecedor
                  </label>
                  <input
                    type="email"
                    placeholder="vendas@fornecedor.com"
                    value={supEmail}
                    onChange={e => setSupEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Categoria do Fornecedor
                  </label>
                  <select
                    value={supCategory}
                    onChange={e => setSupCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    {ALL_ACTIVITY_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Prazo de Entrega (Dias)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={supLeadDays}
                    onChange={e => setSupLeadDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md cursor-pointer"
                >
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
