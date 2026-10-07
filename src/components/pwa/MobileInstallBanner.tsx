import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

export const MobileInstallBanner: React.FC = () => {
  const { isInstalled, isInstallable, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
      setDismissed(isDismissed);
    } catch {
      // ignore
    }
  }, []);

  // Hide if already installed or user dismissed for this session
  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('pwa_banner_dismissed', 'true');
    } catch {
      // ignore
    }
  };

  const handleAction = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white px-3 py-2 border-b border-indigo-700/60 flex items-center justify-between gap-2 shadow-xs shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-200 shrink-0">
            <Smartphone className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-white truncate">
                Usar como Aplicativo no Celular
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded hidden sm:inline">
                Grátis
              </span>
            </div>
            <p className="text-[10px] text-indigo-200 truncate">
              Abra em tela cheia com 1 toque na sua tela inicial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>Instalar</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-6 h-6 rounded-md hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Dispensar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
