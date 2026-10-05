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
  Crown
} from 'lucide-react';
import { formatCurrency } from '../../utils/pixHelper';

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
    isTrialActive,
    trialDaysRemaining,
    setIsSubscriptionModalOpen,
    clearAllForNewClient,
    loadDemoData
  } = useApp();

  const [showCleanConfirm, setShowCleanConfirm] = useState(false);

  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;

  const getTitle = () => {
    switch (activeTab) {
      case 'client-store': return '📱 Loja & Catálogo do Cliente';
      case 'quick-add-product': return '➕ Adicionar & Gerenciar Produtos';
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
    <header className="h-16 sm:h-20 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0">
      <div className="flex flex-col min-w-0">
        <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight truncate">{getTitle()}</h1>
        <p className="text-xs text-slate-500 hidden md:block">{getSubtitle()}</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Subscription Plan Quick Button */}
        <button
          type="button"
          onClick={() => setIsSubscriptionModalOpen(true)}
          className={`px-3 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 ${
            isSubscribed
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
          }`}
          title="Ver plano e status da assinatura"
        >
          {isSubscribed ? (
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

        {/* Quick Customer Store Tab Button */}
        {activeTab !== 'client-store' && (
          <button
            onClick={() => setActiveTab('client-store')}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Abrir Catálogo / Loja do Cliente para celular"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Loja do Cliente (WhatsApp)</span>
            <span className="sm:hidden">Loja Zap</span>
          </button>
        )}

        {/* Quick Add Product Tab Button */}
        {activeTab !== 'quick-add-product' && (
          <button
            onClick={() => setActiveTab('quick-add-product')}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Cadastrar novo produto no celular"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Produto</span>
          </button>
        )}

        {/* Wipe / Clean for New Client */}
        <button
          type="button"
          onClick={() => setShowCleanConfirm(true)}
          className="px-2.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
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
              <h3 className="text-base font-black text-slate-900">Zerar Sistema para Novo Cliente?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Esta ação vai limpar todos os produtos cadastrados, histórico de vendas e movimentações de estoque. O app ficará totalmente em branco para o novo cliente cadastrar seus próprios produtos.
              </p>
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

