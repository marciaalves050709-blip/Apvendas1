import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShoppingCart, 
  Plus, 
  ArrowDownToLine, 
  RefreshCw, 
  Search, 
  Bell, 
  ShoppingBag, 
  PlusCircle, 
  ShieldCheck, 
  Zap, 
  Clock,
  Sparkles,
  Trash2,
  Crown,
  Package,
  Edit3,
  Building2,
  Users,
  QrCode,
  Share2,
  Phone,
  Lock,
  Unlock,
  KeyRound
} from 'lucide-react';
import { formatCurrency } from '../../utils/pixHelper';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

export const Header: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    setProductModalProduct, 
    setStockModalProduct, 
    products, 
    showToast,
    subscription,
    isSubscribed,
    isMasterAdmin,
    isAdmin,
    isTrialActive,
    trialDaysRemaining,
    isDueWarningActive,
    daysUntilDue,
    nextDueDateFormatted,
    setIsSubscriptionModalOpen,
    clearAllForNewClient,
    loadDemoData,
    currentCompany,
    companies,
    setIsCompanyModalOpen,
    setIsSellerWhatsappModalOpen,
    activeSeller,
    openAdminPasswordModal,
    isCompanyAreaUnlocked,
    lockCompanyArea,
    openCompanyAreaUnlock
  } = useApp();

  const [showCleanConfirm, setShowCleanConfirm] = useState(false);

  const handleShareApp = async () => {
    const shareUrl = `${window.location.origin}/?tab=client-store`;
    const shareData = {
      title: `${currentCompany?.name || 'appvendas'} - Catálogo & Loja Virtual`,
      text: `Acesse o catálogo da ${currentCompany?.name || 'nossa loja'} e faça seus pedidos diretamente pelo WhatsApp!`,
      url: shareUrl
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showToast('success', 'Compartilhado com Sucesso!', 'Link do catálogo compartilhado.');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast('success', '🔗 Link Copiado!', 'Link do catálogo copiado! Envie para seus clientes no WhatsApp.');
      }
    } catch {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('success', '🔗 Link Copiado!', 'Link do catálogo copiado! Envie para seus clientes no WhatsApp.');
      } catch {
        showToast('info', 'Link do Catálogo:', shareUrl);
      }
    }
  };

  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;

  const getTitle = () => {
    switch (activeTab) {
      case 'client-store': return '📱 Loja & Catálogo do Cliente';
      case 'quick-add-product': return '➕ Adicionar & Gerenciar Produtos';
      case 'company-costs': return '🔒 Área Empresa: Custos & Fornecedores';
      case 'dashboard': return 'Visão Geral';
      case 'inventory': return 'Controle de Estoque';
      case 'pos': return 'Ponto de Venda & Frente de Caixa';
      case 'sales': return 'Histórico de Vendas & Comprovantes';
      case 'cashier': return 'Fechamento & Movimento de Caixa';
      case 'customers': return 'Clientes & Fornecedores';
      case 'reports': return 'Relatórios Financeiros & Lucratividade';
      default: return 'Visão Geral';
    }
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'client-store': return 'Área simplificada para o cliente digitar nome e WhatsApp, comprar e mandar o pedido no seu Zap';
      case 'quick-add-product': return 'Cadastre produtos rapidamente com preço de varejo, atacado, custo e foto';
      case 'company-costs': return 'Área restrita por senha com custos de compra, margens de lucro reais e gestão de fornecedores';
      case 'dashboard': return 'Resumo operacional de vendas, estoque e movimentações em tempo real';
      case 'inventory': return 'Catálogo de produtos, controle de estoque e alertas de reposição';
      case 'pos': return 'Registre vendas ágeis com cálculo automático de atacado e cupom não fiscal';
      case 'sales': return 'Consulte vendas anteriores, estorne transações e reimprima comprovantes';
      case 'cashier': return 'Abertura, conferência de sangrias, suprimentos e balanço diário';
      case 'customers': return 'Base de clientes e fornecedores';
      case 'reports': return 'Margens de lucro por produto, curva ABC e projeção de compra';
      default: return '';
    }
  };

  return (
    <header className="h-14 sm:h-20 bg-white border-b border-slate-200 px-3 sm:px-8 flex items-center justify-between shrink-0">
      <div className="flex flex-col min-w-0 pr-2">
        <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">{getTitle()}</h1>
        <p className="text-xs text-slate-500 hidden md:block">{getSubtitle()}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Company Name & Multi-User Switcher Button */}
        <button
          type="button"
          onClick={() => setIsCompanyModalOpen(true)}
          className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-100 hover:bg-indigo-50 hover:border-indigo-300 text-slate-800 hover:text-indigo-900 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 max-w-[130px] sm:max-w-[210px]"
          title="Clique para mudar o nome da sua empresa ou trocar de usuário"
        >
          <span className="text-sm shrink-0">{currentCompany?.logoEmoji || '🏪'}</span>
          <span className="truncate">{currentCompany?.name || 'appvendas'}</span>
          <Edit3 className="w-3 h-3 text-slate-400 shrink-0" />
        </button>

        {/* Botão de Autenticação da Administradora (Quando não autenticada) */}
        {!isMasterAdmin && !isAdmin && (
          <button
            type="button"
            onClick={() => openAdminPasswordModal()}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-amber-500/15 via-amber-400/25 to-yellow-500/20 hover:from-amber-500/25 hover:to-amber-500/35 text-amber-950 border border-amber-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Acesso da Administradora: Clique para validar sua Senha Mestra"
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Sou Administradora</span>
            <span className="sm:hidden font-black">Admin</span>
          </button>
        )}

        {/* Subscription Plan / Admin Status Quick Button */}
        <button
          type="button"
          onClick={() => setIsSubscriptionModalOpen(true)}
          className={`px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
            isMasterAdmin || isAdmin
              ? 'bg-gradient-to-r from-amber-50 to-emerald-50 text-amber-950 border border-amber-300 hover:border-amber-400'
              : isDueWarningActive
              ? 'bg-amber-400 hover:bg-amber-500 text-slate-950 border-2 border-amber-600 animate-pulse'
              : isSubscribed
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
          }`}
          title={
            isMasterAdmin || isAdmin
              ? 'Plano Pro Vitalício (Isento de Cobrança)'
              : isDueWarningActive
              ? `Mensalidade vence dia 05 (${nextDueDateFormatted}). Clique para renovar!`
              : 'Ver status da licença'
          }
        >
          {isMasterAdmin || isAdmin ? (
            <>
              <Crown className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Admin Vitalício (Grátis)</span>
              <span className="sm:hidden font-black">Admin 👑</span>
            </>
          ) : isDueWarningActive ? (
            <>
              <Clock className="w-3.5 h-3.5 text-slate-950 animate-bounce" />
              <span className="hidden sm:inline font-black">Vence Dia 05 ({daysUntilDue === 0 ? 'Hoje' : `${daysUntilDue}d`})</span>
              <span className="sm:hidden font-black">Dia 05 ⚠️</span>
            </>
          ) : isSubscribed ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Licença Pro</span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span className="hidden sm:inline">Teste: {trialDaysRemaining}d</span>
              <span className="sm:hidden">{trialDaysRemaining}d</span>
            </>
          )}
        </button>

        {/* Quick App Refresh & Cache Clear */}
        <button
          onClick={async () => {
            showToast('info', 'Atualizando Aplicativo...', 'Limpando cache e carregando a versão mais recente...');
            try {
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const r of regs) {
                  await r.update();
                }
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                for (const k of keys) {
                  if (k !== 'appvendas-pwa-v21') {
                    await caches.delete(k);
                  }
                }
              }
            } catch {}
            setTimeout(() => {
              window.location.reload();
            }, 300);
          }}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          title="Recarregar e atualizar aplicativo para a versão mais recente"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Share App / Catalog Link */}
        <button
          type="button"
          onClick={handleShareApp}
          className="flex px-2 sm:px-3 py-1.5 sm:py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 hover:border-indigo-300 rounded-xl font-bold text-xs items-center gap-1 sm:gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
          title="Compartilhar link atualizado do catálogo para clientes"
        >
          <Share2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="hidden sm:inline">Enviar Link do Catálogo</span>
          <span className="sm:hidden font-bold">Enviar Link</span>
        </button>

        {/* PWA Install Button for Mobile & Desktop */}
        <PWAInstallButton />

        {/* Quick Customer Store Tab Button (Mobile & Desktop) */}
        {activeTab !== 'client-store' && (
          <button
            onClick={() => setActiveTab('client-store')}
            className="flex px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs items-center gap-1 sm:gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Abrir Catálogo / Loja do Cliente"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Loja do Cliente</span>
            <span className="sm:hidden font-bold">Loja</span>
          </button>
        )}

        {/* Company Area Lock/Unlock Button */}
        {isCompanyAreaUnlocked ? (
          <button
            type="button"
            onClick={lockCompanyArea}
            className="flex px-2 sm:px-3 py-1.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs items-center gap-1 sm:gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Bloquear agora e voltar para a visualização do cliente (ocultar Frente de Caixa, Vendas e Custos)"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bloquear Gestão</span>
            <span className="sm:hidden font-bold">Bloquear</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openCompanyAreaUnlock('company-costs')}
            className="flex px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold text-xs items-center gap-1 sm:gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            title="Acessar Área Restrita da Empresa (Frente de Caixa, Histórico de Vendas, Custos e Fornecedores)"
          >
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Área Empresa 🔒</span>
            <span className="sm:hidden font-bold">Empresa</span>
          </button>
        )}

        {/* Trocar Senha da Empresa Quick Button */}
        <button
          type="button"
          onClick={() => openCompanyAreaUnlock('company-costs')}
          className="flex px-2 sm:px-2.5 py-1.5 sm:py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl font-bold text-xs items-center gap-1 sm:gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
          title="Alterar a Senha da Empresa (Custos & Fornecedores)"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="hidden sm:inline">Trocar Senha</span>
          <span className="sm:hidden font-bold">Senha</span>
        </button>

        {/* WhatsApp do Vendedor Quick Button */}
        <button
          onClick={() => setIsSellerWhatsappModalOpen(true)}
          className="flex px-2 sm:px-3 py-1.5 sm:py-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 rounded-xl font-bold text-xs items-center gap-1 sm:gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
          title="Alterar Vendedor e WhatsApp de Atendimento"
        >
          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="hidden sm:inline">Vendedor:</span>
          <span className="font-extrabold text-emerald-700 truncate max-w-[80px] sm:max-w-[110px]">
            {activeSeller?.name || 'Vendedor'}
          </span>
        </button>

        {/* Quick Back to Inventory when in Store (Mobile & Desktop) */}
        {activeTab === 'client-store' && (
          <button
            onClick={() => setActiveTab('inventory')}
            className="flex px-2 sm:px-3 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs items-center gap-1 sm:gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Ir para Estoque para Atualizar Produtos"
          >
            <Package className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atualizar Produtos</span>
            <span className="sm:hidden font-bold">Estoque</span>
          </button>
        )}

        {/* Quick Add Product Tab Button (Desktop) */}
        {activeTab !== 'quick-add-product' && (
          <button
            onClick={() => setActiveTab('quick-add-product')}
            className="hidden md:flex px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Cadastrar novo produto"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Produto</span>
          </button>
        )}

        {/* Wipe / Clean for New Client */}
        <button
          type="button"
          onClick={() => setShowCleanConfirm(true)}
          className="hidden sm:flex px-2.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl font-bold text-xs items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          title="Zerar catálogo de produtos e vendas para entregar ao cliente"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden lg:inline">Zerar p/ Cliente</span>
        </button>

        {lowStockCount > 0 && activeTab !== 'inventory' && (
          <button
            onClick={() => setActiveTab('inventory')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-medium text-xs hover:bg-rose-100 transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
            <span>{lowStockCount} críticos</span>
          </button>
        )}

        {activeTab !== 'pos' && (
          <button
            onClick={() => setActiveTab('pos')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden md:inline">PDV Caixa</span>
          </button>
        )}
      </div>

      {/* Clean For New Client Modal */}
      {showCleanConfirm && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            
            <div>
              <h3 className="text-base font-black text-slate-900">Zerar Catálogo & Vendas?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Esta ação vai limpar produtos, histórico de vendas e movimentações. O app ficará limpo em branco para novos cadastros.
              </p>
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Suas configurações de loja e conta continuam <strong>100% preservadas</strong>.</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between font-medium text-slate-600">
                <span>Produtos atuais:</span>
                <span className="font-bold text-slate-900">{products.length} itens</span>
              </div>
              <div className="flex items-center justify-between font-medium text-slate-600">
                <span>Estado após limpeza:</span>
                <span className="font-bold text-emerald-600">0 produtos (Em branco)</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCleanConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllForNewClient();
                  setShowCleanConfirm(false);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Limpar Tudo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

