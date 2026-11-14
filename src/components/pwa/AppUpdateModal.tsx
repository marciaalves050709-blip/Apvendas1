import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  CheckCircle2, 
  Smartphone, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle,
  ExternalLink,
  Store,
  Layers
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useApp } from '../../context/AppContext';

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({ isOpen, onClose }) => {
  const { isInstalled, isStandalone, isIOS, isAndroid } = usePWAInstall();
  const { currentCompany, showToast } = useApp();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen) return null;

  const handleForceUpdate = () => {
    setIsUpdating(true);
    showToast('info', 'Atualizando Aplicativo...', 'Limpando arquivos antigos e ativando a versão mais recente...');

    setTimeout(() => {
      if (typeof (window as any).__clearAppCacheAndReload === 'function') {
        (window as any).__clearAppCacheAndReload();
      } else {
        try {
          const curUrl = new URL(window.location.href);
          curUrl.searchParams.set('atualizado', Date.now().toString());
          window.location.href = curUrl.toString();
        } catch {
          window.location.href = window.location.pathname + '?atualizado=' + Date.now();
        }
      }
    }, 400);
  };

  const isRunningAsApp = isInstalled || isStandalone;

  return (
    <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg max-h-[92dvh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scale-up">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-950 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-200 shrink-0 shadow-inner">
              <RefreshCw className={`w-5 h-5 text-emerald-400 ${isUpdating ? 'animate-spin' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white truncate">
                  Atualizar Aplicativo
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase">
                  Versão 62
                </span>
              </div>
              <p className="text-xs text-indigo-200 truncate mt-0.5">
                {isRunningAsApp ? 'Aplicativo Instalado no Celular (PWA)' : 'Atualização Direta do Sistema'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800 text-xs">

          {/* Device & Installation Status Box */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-black text-xs text-indigo-950 truncate">
                  {isRunningAsApp 
                    ? 'Aplicativo Instalado na Tela de Início' 
                    : isIOS 
                      ? 'Navegador Safari (iPhone)' 
                      : isAndroid 
                        ? 'Navegador Chrome (Android)' 
                        : 'Navegador Web'}
                </div>
                <div className="text-[11px] text-indigo-700 font-medium truncate">
                  {currentCompany?.name ? `Loja: ${currentCompany.name}` : 'Sistema de Vendas & Catálogo'}
                </div>
              </div>
            </div>

            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-lg shrink-0 flex items-center gap-1 border border-emerald-300">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Conectado</span>
            </span>
          </div>

          {/* Primary Action: One-Click Instant Update */}
          <div className="p-4 bg-gradient-to-br from-emerald-50 via-teal-50 to-indigo-50 border-2 border-emerald-300 rounded-2xl text-center space-y-3 shadow-xs">
            <div>
              <h4 className="font-black text-sm text-slate-900">
                Deseja atualizar para a versão mais recente agora?
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                Ao clicar no botão abaixo, o aplicativo limpa caches antigos e carrega as últimas correções do link encurtado, produtos e catálogo instantaneamente.
              </p>
            </div>

            <button
              type="button"
              onClick={handleForceUpdate}
              disabled={isUpdating}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-black text-sm uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-white ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Atualizando Aplicativo...' : 'Atualizar Aplicativo Agora (1 Clique)'}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-800 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Seus produtos, vendas e dados continuam 100% salvos.</span>
            </div>
          </div>

          {/* What's New in this Update */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-1.5 text-slate-900 font-black text-[11px] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>O que há de novo na versão 62:</span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-[11px]">
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-start gap-2 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold">Links Encurtados Sempre com o Nome da Empresa</strong>
                  <span className="text-slate-600 leading-relaxed">
                    Todos os links compartilhados no WhatsApp, redes sociais ou QR Code levam o nome da sua empresa e carregam os produtos atualizados para novos usuários.
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-start gap-2 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold">Sincronização em Tempo Real (Live Push SSE)</strong>
                  <span className="text-slate-600 leading-relaxed">
                    Quando você cadastra, edita ou ajusta preços e estoque, as alterações aparecem na hora nos aplicativos instalados dos clientes sem precisar desinstalar.
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-start gap-2 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 block font-bold">Isolamento por Empresa e Cadeado Automático</strong>
                  <span className="text-slate-600 leading-relaxed">
                    Cada empresa mantém seu próprio catálogo separado e o cadeado da Área da Empresa fecha automaticamente ao voltar para a loja do cliente.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Clear step-by-step instructions for already installed apps on mobile */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-slate-800 font-black text-[11px] uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>Como o app instalado no celular é atualizado:</span>
            </div>

            <div className="space-y-2 text-[11px] text-slate-600 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-black flex items-center justify-center shrink-0 text-[10px]">
                  1
                </span>
                <span>
                  <strong>Pelo botão "Atualizar":</strong> Toque no botão verde acima. O app limpa a memória temporária e recarrega na hora com a versão mais recente.
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-black flex items-center justify-center shrink-0 text-[10px]">
                  2
                </span>
                <span>
                  <strong>Fechando e abrindo o app:</strong> Feche o aplicativo na tela de aplicativos recentes do seu celular e abra-o novamente pelo ícone da tela inicial.
                </span>
              </div>

              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0 text-[10px]">
                  ✓
                </span>
                <span>
                  <strong>Não precisa desinstalar:</strong> Você nunca precisa desinstalar o app. O aplicativo na sua tela de início atualiza sozinho e mantém todos os seus dados intactos.
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Versão do Sistema: <strong>v62 (Novembro/2026)</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
