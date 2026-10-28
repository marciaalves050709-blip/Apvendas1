import React from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Receipt, 
  WalletCards, 
  Users, 
  BarChart3, 
  RotateCcw,
  Sparkles,
  AlertTriangle,
  ShoppingBag,
  PlusCircle,
  Smartphone,
  ShieldCheck,
  Zap,
  Clock,
  Edit3,
  Building2,
  QrCode,
  Phone,
  Lock,
  Unlock,
  DollarSign,
  Truck,
  KeyRound
} from 'lucide-react';
import { formatCurrency } from '../../utils/pixHelper';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    products, 
    currentShift, 
    resetAllData,
    subscription,
    isSubscribed,
    isAdmin,
    isTrialActive,
    trialDaysRemaining,
    isDueWarningActive,
    daysUntilDue,
    nextDueDateFormatted,
    setIsSubscriptionModalOpen,
    currentCompany,
    companies,
    setIsCompanyModalOpen,
    setIsSellerWhatsappModalOpen,
    activeSeller,
    isCompanyAreaUnlocked,
    lockCompanyArea,
    openCompanyAreaUnlock
  } = useApp();

  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;

  const clientNavItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; special?: boolean }[] = [
    {
      id: 'client-store',
      label: 'Loja do Cliente (WhatsApp)',
      icon: <ShoppingBag className="w-4 h-4 text-emerald-600" />,
      special: true,
    },
    {
      id: 'quick-add-product',
      label: 'Adicionar Produtos',
      icon: <PlusCircle className="w-4 h-4 text-indigo-600" />,
    },
  ];

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; alert?: boolean; locked?: boolean; highlight?: boolean }[] = [
    { 
      id: 'company-costs', 
      label: 'Área Empresa: Custos & Fornecedor', 
      icon: isCompanyAreaUnlocked ? <Unlock className="w-4 h-4 text-amber-500" /> : <Lock className="w-4 h-4 text-amber-600" />,
      locked: !isCompanyAreaUnlocked,
      highlight: true
    },
    { 
      id: 'inventory', 
      label: 'Controle de Estoque', 
      icon: <Package className="w-4 h-4" />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      alert: lowStockCount > 0,
      locked: !isCompanyAreaUnlocked
    },
    { 
      id: 'reports', 
      label: 'Relatórios & Lucro Real', 
      icon: <BarChart3 className="w-4 h-4" />,
      locked: !isCompanyAreaUnlocked
    },
    { 
      id: 'dashboard', 
      label: 'Dashboard Geral', 
      icon: <LayoutDashboard className="w-4 h-4" />,
      locked: !isCompanyAreaUnlocked
    },
    { 
      id: 'pos', 
      label: 'Frente de Caixa (PDV)', 
      icon: <ShoppingCart className="w-4 h-4" /> 
    },
    { 
      id: 'sales', 
      label: 'Histórico de Vendas', 
      icon: <Receipt className="w-4 h-4" /> 
    },
    { 
      id: 'cashier', 
      label: 'Movimento de Caixa', 
      icon: <WalletCards className="w-4 h-4" />,
      badge: currentShift.isOpen ? undefined : 1
    },
    { 
      id: 'customers', 
      label: 'Cadastro de Clientes', 
      icon: <Users className="w-4 h-4" /> 
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header with Dynamic Company Name */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsCompanyModalOpen(true)}
          className="flex items-center gap-2.5 min-w-0 text-left hover:bg-slate-50 p-1.5 -m-1.5 rounded-xl transition-all cursor-pointer group w-full"
          title="Clique para alterar o nome da empresa ou trocar de usuário"
        >
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
            {currentCompany?.logoEmoji || '🏪'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <span className="font-black text-sm tracking-tight uppercase text-slate-900 block leading-tight truncate">
                {currentCompany?.name || 'appvendas'}
              </span>
              <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase truncate">
                {currentCompany?.ownerName || 'Vendas & Estoque'}
              </span>
              {companies.length > 1 && (
                <span className="px-1 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-bold shrink-0">
                  +{companies.length - 1}
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 flex flex-col gap-1.5 overflow-y-auto">
        {/* Mobile & Client Quick Tabs */}
        <div className="px-3 pt-1 pb-1">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1">
            <Smartphone className="w-3 h-3 text-emerald-600" />
            <span>Acesso Celular & Loja</span>
          </p>
        </div>

        {clientNavItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? item.special 
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-indigo-600 text-white shadow-sm'
                  : item.special
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={isActive ? 'text-white' : ''}>
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </div>
            </button>
          );
        })}

        <button
          onClick={() => setIsSellerWhatsappModalOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-950 border border-emerald-200 hover:bg-emerald-100 transition-all cursor-pointer group shadow-2xs"
          title="Configurar WhatsApp e Vendedor"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <Phone className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
            <div className="text-left min-w-0">
              <span className="block text-xs font-bold leading-tight truncate">Vendedor & WhatsApp</span>
              <span className="text-[10px] text-emerald-700 block truncate">{activeSeller?.name || 'Vendedor'}</span>
            </div>
          </div>
          <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-md font-black shrink-0">
            ZAP
          </span>
        </button>

        <div className="px-3 pt-3 pb-1 border-t border-slate-100 mt-1 flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Área da Empresa & Gestão</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (isCompanyAreaUnlocked) {
                  setActiveTab('company-costs');
                } else {
                  openCompanyAreaUnlock('company-costs');
                }
              }}
              className="text-[10px] text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer"
              title="Trocar Senha da Empresa"
            >
              <KeyRound className="w-2.5 h-2.5 text-amber-600" />
              <span>Trocar Senha</span>
            </button>
            {isCompanyAreaUnlocked && (
              <button
                type="button"
                onClick={lockCompanyArea}
                className="text-[10px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5 cursor-pointer"
                title="Bloquear agora e voltar para venda direta ao cliente"
              >
                <Lock className="w-2.5 h-2.5" />
                <span>Bloquear</span>
              </button>
            )}
          </div>
        </div>

        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.locked) {
                  openCompanyAreaUnlock(item.id);
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : item.highlight
                  ? 'bg-amber-50/80 text-amber-950 border border-amber-200/80 hover:bg-amber-100'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={isActive ? 'text-white' : ''}>
                  {item.icon}
                </div>
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {item.locked && (
                  <span className="p-0.5 rounded text-slate-400" title="Protegido por senha">
                    <Lock className="w-3 h-3 text-amber-600" />
                  </span>
                )}

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      item.alert
                        ? 'bg-rose-100 text-rose-700 animate-pulse'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Subscription Plan & Trial Status Card */}
        <div className={`mt-3 p-3 rounded-xl border text-xs transition-all ${
          isDueWarningActive
            ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm animate-pulse-subtle'
            : isSubscribed 
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' 
              : 'bg-indigo-50/80 border-indigo-200 text-indigo-950 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-black text-[11px] uppercase tracking-wide flex items-center gap-1">
              {isDueWarningActive ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-700 animate-bounce" />
                  <span>Vence Dia 05</span>
                </>
              ) : isSubscribed ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Plano Pro Ativo</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Teste Grátis (2 Dias)</span>
                </>
              )}
            </span>

            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
              isDueWarningActive
                ? 'bg-amber-300 text-amber-950'
                : isSubscribed 
                  ? 'bg-emerald-200 text-emerald-900' 
                  : 'bg-amber-200 text-amber-900'
            }`}>
              {isDueWarningActive 
                ? (daysUntilDue === 0 ? 'Vence Hoje' : `${daysUntilDue}d p/ vencer`)
                : isSubscribed 
                  ? 'Em dia' 
                  : `${trialDaysRemaining}d restantes`}
            </span>
          </div>

          <p className="text-[10px] text-slate-600 leading-tight mb-2">
            {isDueWarningActive
              ? `Atenção: vence dia 05 (${nextDueDateFormatted}). Renove para evitar bloqueio imediato.`
              : isSubscribed 
                ? `Próximo vencimento: ${nextDueDateFormatted} (Dia 05).`
                : `Aproveite o teste de 2 dias. Assinatura: ${formatCurrency(subscription.planPrice)}/mês.`}
          </p>

          <button
            type="button"
            onClick={() => setIsSubscriptionModalOpen(true)}
            className={`w-full py-1.5 px-2 rounded-lg font-black text-[11px] flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer ${
              isDueWarningActive
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm active:scale-95'
                : isSubscribed
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
            }`}
          >
            <Zap className={`w-3 h-3 ${isDueWarningActive ? 'fill-slate-950' : 'fill-white'}`} />
            <span>
              {isDueWarningActive 
                ? `Renovar Agora (${formatCurrency(subscription.planPrice)})` 
                : isSubscribed 
                  ? 'Ver Licença' 
                  : `Assinar por ${formatCurrency(subscription.planPrice)}`}
            </span>
          </button>
        </div>

        {/* Quick Tips Box */}
        <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Dica Rápida</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Pressione <strong>F2</strong> para abrir o PDV instantaneamente.
          </p>
        </div>

        {/* PWA Mobile App Install Button */}
        <PWAInstallButton variant="sidebar" />
      </nav>

      {/* Bottom User Bar: Displays the Client's Own User Account */}
      <div className="p-3.5 border-t border-slate-100 bg-white space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsCompanyModalOpen(true)}
            className="flex items-center gap-2.5 min-w-0 text-left hover:bg-slate-50 p-1 -m-1 rounded-xl transition-all cursor-pointer group flex-1"
            title="Clique para editar seu perfil de usuário ou nome da empresa"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
              isAdmin 
                ? 'bg-amber-100 border border-amber-300 text-amber-800' 
                : 'bg-indigo-100 border border-indigo-200 text-indigo-700'
            }`}>
              {isAdmin ? '👑' : currentCompany?.logoEmoji || '👤'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-slate-900 truncate">
                  {isAdmin ? 'Marcia Alves' : (currentCompany?.ownerName && currentCompany?.ownerName !== 'Meu Usuário' && currentCompany?.ownerName !== 'Administrador' ? currentCompany.ownerName : (currentCompany?.name || 'Lojista'))}
                </p>
                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                  isAdmin 
                    ? 'bg-amber-100 text-amber-800' 
                    : isSubscribed
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {isAdmin ? 'ADMIN' : isSubscribed ? 'PRO' : 'LOJISTA'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isAdmin || isSubscribed ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
                <p className="text-[10px] text-slate-500 font-semibold truncate">
                  {isAdmin 
                    ? 'Administrador Mestre' 
                    : isSubscribed 
                    ? 'Licença Pro Ativa' 
                    : `Teste: ${trialDaysRemaining}d restantes`}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* System Version & Company Name */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate font-semibold text-slate-600">{currentCompany?.name || 'appvendas'}</span>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">v1.0</span>
        </div>
      </div>
    </aside>
  );
};
