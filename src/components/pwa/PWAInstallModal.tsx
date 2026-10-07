import React from 'react';
import { 
  X, 
  Smartphone, 
  DownloadCloud, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  Zap, 
  ShieldCheck,
  WifiOff
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-scale-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-lg border border-indigo-300/40 shrink-0">
              <img src="/pwa-192x192.png" alt="appvendas" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div className="min-w-0">
              <div className="inline-block px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase rounded tracking-wider mb-1">
                Aplicativo PWA Oficial
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">
                Instalar no Celular
              </h2>
              <p className="text-xs text-indigo-200">
                appvendas na palma da sua mão
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-slate-800">
          
          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-indigo-50/80 rounded-2xl border border-indigo-100 flex items-start gap-2">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold text-[11px]">Acesso Instantâneo</strong>
                <span className="text-[10px] text-slate-500">Abre em 1 toque na tela inicial</span>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-50/80 rounded-2xl border border-emerald-100 flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold text-[11px]">Tela Cheia</strong>
                <span className="text-[10px] text-slate-500">Sem barra de navegador</span>
              </div>
            </div>

            <div className="p-2.5 bg-amber-50/80 rounded-2xl border border-amber-100 flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold text-[11px]">Modo Offline</strong>
                <span className="text-[10px] text-slate-500">Funciona mesmo sem internet</span>
              </div>
            </div>

            <div className="p-2.5 bg-sky-50/80 rounded-2xl border border-sky-100 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold text-[11px]">Leve e Seguro</strong>
                <span className="text-[10px] text-slate-500">Não ocupa memória do celular</span>
              </div>
            </div>
          </div>

          {/* Conditional Instructions by OS */}
          {isInstalled ? (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-black text-emerald-950">Aplicativo Já Instalado!</h3>
              <p className="text-xs text-emerald-800">
                Você já está usando o appvendas instalado. Ele já tem um ícone próprio na sua tela inicial!
              </p>
            </div>
          ) : isInstallable ? (
            /* Android / Chrome Flow: Direct 1-Click Install */
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={async () => {
                  const success = await install();
                  if (success) onClose();
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <DownloadCloud className="w-5 h-5" />
                <span>Instalar Aplicativo Agora</span>
              </button>
              <p className="text-[11px] text-center text-slate-500">
                Toque no botão acima e confirme em <strong>"Instalar"</strong>.
              </p>
            </div>
          ) : isIOS ? (
            /* iOS Safari Flow: 2-step visual guide */
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-black text-slate-900 text-xs uppercase tracking-wide">
                <span>Passo a passo no iPhone / iPad (Safari):</span>
              </div>

              <div className="space-y-2 text-slate-700">
                <div className="flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <span>Toque no botão de <strong>Compartilhar</strong></span>
                    <div className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-900 font-mono text-[10px]">
                      <Share className="w-3 h-3 text-blue-600" />
                      <span>Compartilhar</span>
                    </div>
                    <span>na barra inferior do Safari.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <span>Role para baixo e selecione </span>
                    <strong className="text-slate-900">"Adicionar à Tela de Início"</strong>
                    <div className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-slate-100 rounded text-slate-900 font-mono text-[10px]">
                      <PlusSquare className="w-3 h-3 text-emerald-600" />
                      <span>Tela de Início</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 bg-white rounded-xl border border-slate-200">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <span>Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto! O appvendas aparecerá junto com seus outros aplicativos.</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* General browser / desktop flow */
            <div className="space-y-3 pt-1">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                <p className="font-bold text-slate-800">
                  Como instalar pelo navegador:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
                  <li>Abra o menu do navegador (os <strong>três pontinhos ⋮</strong> no canto superior).</li>
                  <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                  <li>Confirme a instalação.</li>
                </ol>
              </div>
              
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer"
              >
                Entendido
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            Dúvidas? Acesse pelo Google Chrome no Android ou Safari no iPhone.
          </p>
        </div>

      </div>
    </div>
  );
};
