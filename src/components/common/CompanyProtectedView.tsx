import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import { 
  Lock, 
  ShieldCheck, 
  ArrowLeft, 
  KeyRound, 
  ShoppingCart, 
  Receipt, 
  WalletCards, 
  BarChart3, 
  Package, 
  LayoutDashboard, 
  Users,
  Store,
  CheckCircle2
} from 'lucide-react';

interface CompanyProtectedViewProps {
  tab: ActiveTab;
}

export const CompanyProtectedView: React.FC<CompanyProtectedViewProps> = ({ tab }) => {
  const { 
    unlockCompanyArea, 
    companyPassword, 
    setActiveTab, 
    setIsCompanyPasswordModalOpen,
    showToast,
    currentCompany
  } = useApp();

  const [inputPass, setInputPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const getTabInfo = () => {
    switch (tab) {
      case 'pos':
        return {
          title: 'Frente de Caixa (PDV)',
          subtitle: 'Acesso restrito ao operador ou gestor da empresa para abertura e registro de vendas no balcão.',
          icon: <ShoppingCart className="w-8 h-8 text-amber-500" />
        };
      case 'sales':
        return {
          title: 'Histórico de Vendas',
          subtitle: 'Acesso restrito. Contém relatórios de faturamento, comprovantes, lucros e cancelamento de vendas.',
          icon: <Receipt className="w-8 h-8 text-amber-500" />
        };
      case 'cashier':
        return {
          title: 'Movimento de Caixa',
          subtitle: 'Acesso restrito. Contém fechamento de caixa, sangrias, suprimentos e valores monetários.',
          icon: <WalletCards className="w-8 h-8 text-amber-500" />
        };
      case 'reports':
        return {
          title: 'Relatórios & Lucro Real',
          subtitle: 'Acesso restrito. Contém dados confidenciais de lucro líquido e custos da empresa.',
          icon: <BarChart3 className="w-8 h-8 text-amber-500" />
        };
      case 'inventory':
        return {
          title: 'Controle de Estoque',
          subtitle: 'Acesso restrito para edição de produtos, quantidades e preços internos.',
          icon: <Package className="w-8 h-8 text-amber-500" />
        };
      case 'dashboard':
        return {
          title: 'Painel da Empresa',
          subtitle: 'Acesso restrito com métricas internas de vendas e desempenho.',
          icon: <LayoutDashboard className="w-8 h-8 text-amber-500" />
        };
      case 'customers':
        return {
          title: 'Cadastro de Clientes',
          subtitle: 'Acesso restrito com informações e contatos da base de clientes.',
          icon: <Users className="w-8 h-8 text-amber-500" />
        };
      default:
        return {
          title: 'Área da Empresa',
          subtitle: 'Informações confidenciais restritas aos responsáveis da empresa.',
          icon: <Lock className="w-8 h-8 text-amber-500" />
        };
    }
  };

  const info = getTabInfo();

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const clean = inputPass.trim();
    if (!clean) {
      setErrorMsg('Por favor, digite a senha da empresa.');
      return;
    }

    const success = unlockCompanyArea(clean);
    if (success) {
      showToast('success', 'Acesso Liberado!', `Acesso autorizado a "${info.title}".`);
      setInputPass('');
      setErrorMsg('');
    } else {
      setErrorMsg('Senha incorreta! Dica: a senha inicial padrão é 1234 (ou sua Senha Mestra).');
    }
  };

  return (
    <div className="flex-1 w-full h-full bg-slate-100 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 text-center relative">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-400/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
            {info.icon}
          </div>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-black uppercase tracking-wider">
            🔒 Área com Restrição por Senha
          </span>
          <h2 className="text-xl font-black mt-2 text-white tracking-tight">
            {info.title}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
            {info.subtitle}
          </p>
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-amber-50/80 border-b border-amber-200 flex items-start gap-2.5 text-xs text-amber-950">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            O cliente só tem acesso liberado à <strong>Loja de Vendas</strong>. Dados de <strong>Frente de Caixa</strong>, <strong>Histórico de Vendas</strong>, <strong>Lucros</strong> e <strong>Fornecedores</strong> são protegidos por senha.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleUnlock} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
              <span>Digite a Senha da Empresa</span>
            </label>
            <input
              type="password"
              autoFocus
              placeholder="••••"
              value={inputPass}
              onChange={e => {
                setInputPass(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 text-base font-bold text-center tracking-widest text-slate-900 outline-none transition-all"
            />
            {errorMsg ? (
              <p className="text-xs text-rose-600 font-bold mt-1.5 text-center">
                {errorMsg}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 text-center mt-1.5">
                Senha padrão inicial: <strong className="text-slate-600 font-mono">1234</strong>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Desbloquear Acesso</span>
          </button>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('client-store')}
              className="py-2 px-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ir para Loja do Cliente</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCompanyPasswordModalOpen(true)}
              className="py-2 px-3 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-[11px]"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Trocar Senha</span>
            </button>
          </div>
        </form>

        <div className="text-center py-2.5 text-[10px] text-slate-400 border-t border-slate-100 bg-slate-50">
          {currentCompany?.name || 'appvendas'} • Segurança de Gestão Interna
        </div>
      </div>
    </div>
  );
};
