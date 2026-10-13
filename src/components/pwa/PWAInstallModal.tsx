import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  DownloadCloud, 
  Share, 
  PlusSquare, 
  CheckCircle2, 
  Zap, 
  ShieldCheck,
  WifiOff,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import confetti from 'canvas-confetti';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    isAndroid, 
    isIframe, 
    isInAppBrowser, 
    install,
    openDirectInstallInBrowser 
  } = usePWAInstall();

  const [copiedLink, setCopiedLink] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleDirectInstall = async () => {
    setIsInstalling(true);
    try {
      const res = await install();
      if (res.success) {
        if (res.outcome === 'accepted' || res.action === 'prompt') {
          try {
            confetti({
              particleCount: 75,
              spread: 80,
              origin: { y: 0.6 }
            });
          } catch {
            // ignore
          }
          onClose();
        } else if (res.action === 'opened_window' || res.action === 'ios_share' || res.action === 'android_intent') {
          onClose();
        }
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleOpenBrowserTab = () => {
    const opened = openDirectInstallInBrowser();
    if (opened) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-scale-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-indigo-950 to-slate-950 text-white p-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-lg border border-emerald-400/40 shrink-0">
              <img src="/pwa-192x192.png" alt="appvendas" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase rounded tracking-wider mb-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Aplicativo Oficial</span>
              </div>
              <h2 className="text-lg font-black tracking-tight text-white">
                Instalar Aplicativo
              </h2>
              <p className="text-xs text-indigo-200">
                Acesse o appvendas direto da sua tela inicial
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-slate-800">
          
          {/* Main Action Callout */}
          {isInstalled ? (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-black text-emerald-950">Aplicativo Já Instalado!</h3>
              <p className="text-xs text-emerald-800">
                Você já possui o appvendas instalado. Ele já tem um ícone próprio na sua tela inicial!
              </p>
            </div>
          ) : isIframe ? (
            /* Running inside test frame / AI Studio preview: 1-Click Launch & Install */
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">Instalar no Dispositivo</h4>
                  <p className="text-xs text-slate-600">
                    Clique no botão abaixo para abrir a janela de instalação direta no seu celular ou computador:
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenBrowserTab}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-black text-sm rounded-xl shadow-md shadow-emerald-700/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <DownloadCloud className="w-5 h-5 text-emerald-200" />
                <span>Abrir e Instalar Aplicativo Agora</span>
              </button>

              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-emerald-200/60">
                <span>Ou copie o link para compartilhar:</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Regular Browser Flow: Direct Install Button */
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={handleDirectInstall}
                disabled={isInstalling}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-75"
              >
                {isInstalling ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <DownloadCloud className="w-5 h-5 text-emerald-200" />
                )}
                <span>
                  {isInstalling 
                    ? 'Preparando Instalação...' 
                    : isIOS 
                      ? 'Adicionar à Tela de Início (iPhone)' 
                      : 'Instalar Aplicativo Agora'}
                </span>
              </button>
              <p className="text-[11px] text-center text-slate-500">
                Toque no botão verde acima para instalar diretamente no seu celular ou computador.
              </p>
            </div>
          )}

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-indigo-50/80 rounded-2xl border border-indigo-100 flex items-start gap-2">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold text-[11px]">Acesso Rápido</strong>
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

          {/* In-App Browser Warning (WhatsApp / Instagram / Facebook WebView) */}
          {isInAppBrowser && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-2 text-amber-950">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="font-bold text-[11px]">
                  Navegador interno do WhatsApp / Instagram detectado
                </p>
              </div>
              <p className="text-[10px] text-amber-900 leading-relaxed">
                Navegadores internos de redes sociais não permitem instalação nativa. Toque no botão abaixo para abrir diretamente no navegador do seu celular:
              </p>
              <button
                type="button"
                onClick={handleDirectInstall}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir no Google Chrome / Safari</span>
              </button>
            </div>
          )}

          {/* Detailed OS Steps */}
          {isIOS ? (
            /* iOS Safari Step-by-Step */
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wide">
                <span>Passo a passo no iPhone / iPad (Safari):</span>
              </div>

              <div className="space-y-2 text-slate-700">
                <div className="flex items-start gap-2 p-2 bg-white rounded-xl border border-slate-200">
                  <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                    1
                  </div>
                  <div>
                    <span>Toque no botão <strong>Compartilhar</strong></span>
                    <div className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.2 bg-slate-100 rounded text-slate-900 font-mono text-[10px]">
                      <Share className="w-3 h-3 text-blue-600" />
                      <span>Compartilhar</span>
                    </div>
                    <span>na barra inferior do Safari.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 bg-white rounded-xl border border-slate-200">
                  <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <span>Role a tela e toque em </span>
                    <strong className="text-slate-900">"Adicionar à Tela de Início"</strong>
                    <div className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.2 bg-slate-100 rounded text-slate-900 font-mono text-[10px]">
                      <PlusSquare className="w-3 h-3 text-emerald-600" />
                      <span>Tela de Início</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 bg-white rounded-xl border border-slate-200">
                  <div className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0">
                    3
                  </div>
                  <div>
                    <span>Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto!</span>
                  </div>
                </div>
              </div>
            </div>
          ) : !isInstalled && !isIframe && (
            /* Android / Chrome helper */
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Também disponível pelo menu do Chrome:</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Toque no menu <strong>⋮ (três pontinhos)</strong> no topo do Google Chrome e escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
              </p>
            </div>
          )}

          {/* Action Footer Button */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 font-bold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-xs rounded-xl cursor-pointer transition-all"
            >
              Fechar
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            Compatível com Android (Chrome / Samsung), iPhone (Safari) e Computadores (Chrome / Edge).
          </p>
        </div>

      </div>
    </div>
  );
};
