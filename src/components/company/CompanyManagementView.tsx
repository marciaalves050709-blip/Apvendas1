import React, { useState, useMemo } from 'react';
import { useApp, checkIsMasterPassword } from '../../context/AppContext';
import { Product, Category, Supplier } from '../../types';
import { formatCurrency } from '../../utils/pixHelper';
import { getProductImage, CATEGORY_EMOJIS, ALL_ACTIVITY_CATEGORIES } from '../../utils/productImages';
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
  AlertTriangle
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
    setProductModalProduct
  } = useApp();

  // Active Sub-tab inside Company Area: 'costs' | 'suppliers' | 'security'
  const [activeSubTab, setActiveSubTab] = useState<'costs' | 'suppliers' | 'security'>('costs');

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

  // Delete supplier with confirmation
  const handleDeleteSupplier = (id: string, name: string) => {
    if (window.confirm(`Deseja realmente excluir o fornecedor "${name}"?\nOs produtos vinculados a ele continuarão no sistema.`)) {
      deleteSupplier(id);
    }
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

        {/* Action: Lock Back to Client Sales Area */}
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
