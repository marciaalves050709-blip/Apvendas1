import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Building2, 
  Store, 
  User, 
  Phone, 
  QrCode, 
  MapPin, 
  Check, 
  Plus, 
  Copy, 
  Trash2, 
  ArrowRight, 
  X, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  ExternalLink,
  Users,
  Smartphone,
  Share2
} from 'lucide-react';
import { formatCurrency } from '../../utils/pixHelper';
import { formatPhoneDisplay } from '../../utils/whatsappHelper';

const PRESET_EMOJIS = ['🏪', '🛒', '📦', '🏬', '🍕', '🍔', '☕', '🧴', '👕', '💊', '🥩', '🥖', '🛍️', '🚚', '💎', '⭐'];

export const CompanySettingsModal: React.FC = () => {
  const { 
    currentCompany, 
    companies, 
    updateCurrentCompany, 
    createCompany, 
    switchCompany, 
    deleteCompany, 
    paymentSettings, 
    updatePaymentSettings, 
    isCompanyModalOpen, 
    setIsCompanyModalOpen, 
    setIsSellerWhatsappModalOpen,
    showToast,
    products 
  } = useApp();

  // Active Tab inside modal: 'edit' | 'list' | 'create'
  const [tab, setTab] = useState<'edit' | 'list' | 'create'>('edit');

  // Form State for editing current company
  const [name, setName] = useState(currentCompany?.name || paymentSettings.merchantName || 'Minha Empresa');
  const [ownerName, setOwnerName] = useState(currentCompany?.ownerName || 'Administrador');
  const [phone, setPhone] = useState(paymentSettings.merchantWhatsapp || '');
  const [city, setCity] = useState(paymentSettings.merchantCity || 'Barcarena PA');
  const [pixKey, setPixKey] = useState(paymentSettings.pixKey || '');
  const [pixKeyType, setPixKeyType] = useState(paymentSettings.pixKeyType || 'CNPJ');
  const [selectedEmoji, setSelectedEmoji] = useState(currentCompany?.logoEmoji || '🏪');

  // Form State for creating a new company workspace
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCategory, setNewCategory] = useState('Comércio & Varejo');
  const [newEmoji, setNewEmoji] = useState('🏪');

  if (!isCompanyModalOpen) return null;

  // Handle Save Current Company
  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('error', 'Nome Obrigatório', 'Digite o nome da sua empresa.');
      return;
    }

    // Update Company metadata
    updateCurrentCompany({
      name: trimmed,
      ownerName: ownerName.trim() || 'Administrador',
      phone: phone.trim(),
      logoEmoji: selectedEmoji
    });

    // Update payment settings which drive receipts, WhatsApp and catalog headers
    updatePaymentSettings({
      merchantName: trimmed,
      merchantWhatsapp: phone.trim(),
      merchantCity: city.trim(),
      pixKey: pixKey.trim(),
      pixKeyType
    });

    showToast('success', 'Empresa Atualizada!', `O nome "${trimmed}" agora aparece em todo o aplicativo.`);
    setIsCompanyModalOpen(false);
  };

  // Handle Create New Company
  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCompanyName.trim();
    if (!trimmed) {
      showToast('error', 'Nome Obrigatório', 'Digite o nome da nova empresa.');
      return;
    }

    const created = createCompany({
      name: trimmed,
      ownerName: newOwnerName.trim() || 'Usuário',
      phone: newPhone.trim(),
      category: newCategory,
      logoEmoji: newEmoji
    });

    // Reset create fields
    setNewCompanyName('');
    setNewOwnerName('');
    setNewPhone('');

    // Switch to edit tab with new company data
    setName(created.name);
    setOwnerName(created.ownerName);
    setSelectedEmoji(created.logoEmoji || '🏪');
    setTab('edit');
    showToast('success', 'Nova Empresa Criada!', `Você agora está gerenciando "${created.name}". Todos os dados são 100% isolados.`);
  };

  // Copy Store Link for specific company
  const handleCopyStoreLink = (companyId: string, companyName: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('empresa', companyId);
    url.searchParams.set('tab', 'client-store');
    navigator.clipboard.writeText(url.toString());
    showToast('info', 'Link Copiado!', `Link exclusivo da loja de "${companyName}" copiado.`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92dvh] max-w-2xl sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-xl shrink-0">
              {currentCompany?.logoEmoji || '🏪'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg text-white truncate">
                  {tab === 'edit' ? 'Nome da Empresa & Dados' : tab === 'list' ? 'Empresas & Usuários' : 'Criar Nova Empresa'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Infinitos Usuários
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                Substitua "appvendas" pelo nome da sua empresa e alterne entre usuários
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsCompanyModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="shrink-0 bg-slate-100 border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setTab('edit')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              tab === 'edit'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Nome da Minha Empresa</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('list')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              tab === 'list'
                ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Trocar Empresa / Usuário ({companies.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('create')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              tab === 'create'
                ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Criar Nova Empresa</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 pb-24 sm:pb-6">
          {tab === 'edit' && (
            <form onSubmit={handleSaveCompany} className="space-y-4">
              {/* Info Card */}
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 leading-relaxed">
                  <strong>Personalização Total:</strong> Ao mudar o nome aqui, ele substitui <strong>"appvendas"</strong> no topo da tela, na barra lateral, nos comprovantes impressos, na loja virtual do cliente e nas mensagens automáticas do WhatsApp!
                </div>
              </div>

              {/* Empresa & Emoji */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Nome da Sua Empresa / Loja (Substitui "appvendas")</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative">
                    <span className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-2xl shadow-inner cursor-pointer" title="Ícone">
                      {selectedEmoji}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mercadinho Central, Padaria Estrela, Distribuidora Silva..."
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none"
                  />
                </div>
                
                {/* Emoji Selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-2 no-scrollbar">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Ícone:</span>
                  {PRESET_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setSelectedEmoji(em)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-transform cursor-pointer ${
                        selectedEmoji === em ? 'bg-indigo-100 border-2 border-indigo-600 scale-110' : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Responsável & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Nome do Dono / Responsável</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Márcia Alves"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp para Pedidos (com DDD)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>
              </div>

              {/* Pix Key & Cidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Chave Pix da Empresa</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={pixKeyType}
                      onChange={e => setPixKeyType(e.target.value as any)}
                      className="px-2 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
                    >
                      <option value="CNPJ">CNPJ</option>
                      <option value="CPF">CPF</option>
                      <option value="PHONE">Celular</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="RANDOM">Aleatória</option>
                    </select>
                    <input
                      type="text"
                      placeholder="12.345.678/0001-90"
                      value={pixKey}
                      onChange={e => setPixKey(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Cidade / UF</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Barcarena PA"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Vendedores & Pix Individual */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      WhatsApp & Pix dos Vendedores
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      Cadastre cada vendedor para receber compras direto no Pix dele com QR Code
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCompanyModalOpen(false);
                    setIsSellerWhatsappModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer transition-colors shadow-xs"
                >
                  Configurar Vendedores
                </button>
              </div>

              {/* Live Preview Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Pré-visualização em Tempo Real:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Na Barra Lateral:</span>
                    <span className="text-sm font-black text-slate-900 uppercase flex items-center gap-1 mt-0.5">
                      <span>{selectedEmoji}</span>
                      <span>{name || 'Nome da Empresa'}</span>
                    </span>
                  </div>
                  <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">No WhatsApp:</span>
                    <span className="text-xs font-mono font-bold text-emerald-800 block mt-0.5">
                      🛒 NOVO PEDIDO - {(name || 'SUA EMPRESA').toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Salvar Nome & Informações da Minha Empresa</span>
                </button>
              </div>
            </form>
          )}

          {tab === 'list' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                  <strong>Isolamento Completo:</strong> O sistema suporta <strong>infinitos usuários e empresas</strong>. Cada empresa possui seu próprio estoque, histórico de vendas, clientes e configurações. As alterações de uma empresa <strong>nunca afetam as outras</strong>!
                </div>
              </div>

              <div className="space-y-2.5">
                {companies.map(comp => {
                  const isActive = comp.id === currentCompany?.id;
                  return (
                    <div
                      key={comp.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/10 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-2xl shrink-0">
                          {comp.logoEmoji || '🏪'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-slate-900 truncate">
                              {comp.name}
                            </h4>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white">
                                Ativa Agora
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            Dono: <strong>{comp.ownerName || 'Administrador'}</strong> {comp.phone ? `• ${formatPhoneDisplay(comp.phone)}` : ''}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ID: {comp.id} • Criada em: {new Date(comp.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleCopyStoreLink(comp.id, comp.name)}
                          title="Copiar link da Loja Virtual desta empresa"
                          className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">Link da Loja</span>
                        </button>

                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => {
                              switchCompany(comp.id);
                              showToast('success', 'Empresa Alternada', `Você agora está gerenciando "${comp.name}".`);
                              setIsCompanyModalOpen(false);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                          >
                            <span>Entrar</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setTab('edit')}
                            className="px-3 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-50"
                          >
                            Editar Dados
                          </button>
                        )}

                        {companies.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir a empresa "${comp.name}"? Todos os seus produtos e vendas isolados serão apagados.`)) {
                                deleteCompany(comp.id);
                              }
                            }}
                            title="Excluir Empresa"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setTab('create')}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Mais uma Empresa / Usuário</span>
                </button>
              </div>
            </div>
          )}

          {tab === 'create' && (
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                  <strong>Novo Banco de Dados Isolado:</strong> A nova empresa terá seu catálogo, clientes, vendas e caixa completamente separados. Você pode cadastrar infinitas lojas e clientes neste app!
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome da Nova Empresa / Loja *
                </label>
                <div className="flex gap-2">
                  <span className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-2xl shadow-inner">
                    {newEmoji}
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mercadinho da Vila, Loja da Ana..."
                    value={newCompanyName}
                    onChange={e => setNewCompanyName(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
                  />
                </div>
                
                <div className="flex items-center gap-1.5 overflow-x-auto pt-2 no-scrollbar">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Ícone:</span>
                  {PRESET_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setNewEmoji(em)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-transform cursor-pointer ${
                        newEmoji === em ? 'bg-emerald-100 border-2 border-emerald-600 scale-110' : 'bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nome do Dono / Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: João Silva"
                    value={newOwnerName}
                    onChange={e => setNewOwnerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    WhatsApp para Pedidos
                  </label>
                  <input
                    type="tel"
                    placeholder="(11) 98888-7777"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ramo / Segmento
                </label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:bg-white focus:border-emerald-600"
                >
                  <option value="Comércio & Varejo">Comércio & Varejo</option>
                  <option value="Descartáveis & Embalagens">Descartáveis & Embalagens</option>
                  <option value="Alimentação & Restaurante">Alimentação & Restaurante</option>
                  <option value="Bebidas & Distribuidora">Bebidas & Distribuidora</option>
                  <option value="Hortifruti & Mercearia">Hortifruti & Mercearia</option>
                  <option value="Moda & Acessórios">Moda & Acessórios</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Criar Empresa com Dados Isolados e Entrar Agora</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
