import React, { useState, useEffect } from 'react';
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
  Sparkles,
  QrCode,
  ArrowRight,
  MoreVertical
} from 'lucide-react';
import QRCode from 'qrcode';
import { AlertTriangle, Compass } from 'lucide-react';
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
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isTriggering, setIsTriggering] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Generate QR code for mobile scanning
    try {
      const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://appvendas.app';
      QRCode.toDataURL(currentUrl, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(setQrCodeUrl);
    } catch {
      // ignore
    }
  }, [isOpen]);

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
    setIsTriggering(true);
    setTimeout(() => setIsTriggering(false), 300);

    try {
      const res = await install();
      if (res.success) {
        if (res.action === 'prompt') {
          try {
            confetti({
              particleCount: 80,
              spread: 80,
              origin: { y: 0.6 }
            });
          } catch {
            // ignore
          }
          onClose();
        } else if (res.action === 'android_intent') {
          onClose();
        }
      }
    } catch {
      // ignore
    }
  };

  const handleOpenBrowserTab = () => {
    openDirectInstallInBrowser();
    onClose();
  };

  const handleIosShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'appvendas - PDV e Estoque',
          text: 'Instale o appvendas na sua Tela de Início',
          url: window.location.href,
        });
      } catch {
        // user closed share sheet
      }
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
              <h2 className="text-lg font-black tracking-tight text-white leading-tight">
                Instalar no Celular
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
          ) : (
            <div className="space-y-3">
              
              {/* 1. Android Flow */}
              {isAndroid ? (
                <div className="space-y-3">
                  {/* Primary 1-Touch Install Button */}
                  <button
                    type="button"
                    onClick={handleDirectInstall}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <DownloadCloud className="w-5 h-5 text-emerald-200" />
                    <span>Instalar Aplicativo Agora</span>
                  </button>

                  {/* Android Step-by-Step Guide */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2.5">
                    <span className="font-black text-slate-900 block text-xs">
                      Ou instale pelo navegador em 3 passos:
                    </span>
                    <div className="space-y-2 text-slate-700 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                        <span>Toque nos <strong>3 pontinhos ⋮</strong> no canto superior direito do Chrome.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                        <span>Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                        <span>Confirme em <strong>"Instalar"</strong>. O ícone aparecerá no seu celular!</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isIOS ? (
                /* 2. iOS Safari Flow */
                <div className="space-y-3">
                  {isInAppBrowser && (
                    <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-xs space-y-2 text-left">
                      <div className="flex items-center gap-2 font-black text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Você está dentro do WhatsApp ou Instagram</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        No iPhone, a Apple só permite instalar aplicativos diretamente pelo <strong>Safari</strong>:
                      </p>
                      <div className="space-y-1.5 text-[11px] text-amber-900 font-semibold bg-white/80 p-2.5 rounded-xl border border-amber-200">
                        <p>1. Toque nos <strong>3 pontinhos •••</strong> ou no ícone da bússola 🧭 no canto do WhatsApp.</p>
                        <p>2. Selecione <strong>"Abrir no Safari"</strong>.</p>
                        <p>3. No Safari, você poderá adicionar à Tela de Início em 1 toque!</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedLink ? 'Link Copiado! Cole no Safari' : 'Copiar Link para colar no Safari'}</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleIosShare}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all border-2 border-blue-400"
                  >
                    <Share className="w-5 h-5 text-blue-200" />
                    <span>Abrir Menu Compartilhar do iPhone</span>
                  </button>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2.5 text-left">
                    <span className="font-black text-slate-900 block text-xs">
                      Instalação no iPhone em 3 passos simples:
                    </span>
                    <div className="space-y-2.5 text-slate-700 text-[11px]">
                      <div className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-200">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">1</span>
                        <span>Toque no botão <strong>Compartilhar [↑]</strong> na barra inferior do Safari.</span>
                      </div>
                      <div className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-200">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">2</span>
                        <span>Role a lista e toque em <strong>"Adicionar à Tela de Início" ➕</strong>.</span>
                      </div>
                      <div className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-slate-200">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">3</span>
                        <span>Toque em <strong>"Adicionar"</strong> no topo direito da tela.</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 font-bold flex items-center justify-center gap-1.5 text-center">
                    <span>👇 O botão de Compartilhar [↑] fica bem aqui embaixo na barra do Safari</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem('appvendas_pwa_installed', 'true');
                        confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
                      } catch {}
                      onClose();
                    }}
                    className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Já Adicionei à Tela de Início!</span>
                  </button>
                </div>
              ) : (
                /* 3. Computer / Preview / QR Code Flow */
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleDirectInstall}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <DownloadCloud className="w-5 h-5 text-emerald-200" />
                    <span>Instalar Aplicativo Agora</span>
                  </button>

                  {/* QR Code for instant phone install */}
                  {qrCodeUrl && (
                    <div className="p-3 bg-gradient-to-br from-indigo-50/80 to-slate-50 border border-indigo-200 rounded-2xl text-center space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-100 text-indigo-900 rounded-md text-[10px] font-black uppercase tracking-wider">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Instalar Direto no Celular</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Aponte a câmera do seu celular para o QR Code abaixo:
                      </p>
                      <div className="inline-block p-2 bg-white rounded-xl shadow-xs border border-indigo-200">
                        <img src={qrCodeUrl} alt="QR Code Instalação Celular" className="w-36 h-36 mx-auto" />
                      </div>
                    </div>
                  )}

                  {isIframe && (
                    <button
                      type="button"
                      onClick={handleOpenBrowserTab}
                      className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-slate-600" />
                      <span>Abrir em Nova Aba do Navegador</span>
                    </button>
                  )}
                </div>
              )}

            </div>
          )}

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 bg-indigo-50/80 rounded-2xl border border-indigo-100 flex items-start gap-2">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold text-[11px]">Acesso Rápido</strong>
                <span className="text-[10px] text-slate-500">1 toque na tela inicial</span>
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
                <span className="text-[10px] text-slate-500">Não ocupa memória</span>
              </div>
            </div>
          </div>

          {/* Copy Link Footer */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <span className="text-[11px]">Compartilhar link do app:</span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-emerald-700" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
