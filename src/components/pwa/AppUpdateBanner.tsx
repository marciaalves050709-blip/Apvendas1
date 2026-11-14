import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

interface AppUpdateBannerProps {
  onOpenUpdateModal?: () => void;
}

export const AppUpdateBanner: React.FC<AppUpdateBannerProps> = ({ onOpenUpdateModal }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Check if user already dismissed banner this session for this specific version
    try {
      if (sessionStorage.getItem('appvendas_update_banner_dismissed_ver') === '62') {
        setDismissed(true);
      }
    } catch {}

    // 2. Listen to custom event when a new service worker is installed/waiting
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
      setDismissed(false);
    };

    window.addEventListener('app-update-available', handleUpdateAvailable);

    // 3. Fallback check: Compare current build ver with stored ver
    try {
      const stored = localStorage.getItem('appvendas_client_build_ver');
      if (stored && stored !== '62') {
        setUpdateAvailable(true);
        setDismissed(false);
      }
    } catch {}

    return () => {
      window.removeEventListener('app-update-available', handleUpdateAvailable);
    };
  }, []);

  if (!updateAvailable || dismissed) {
    return null;
  }

  const handleUpdateNow = () => {
    setIsUpdating(true);
    if (typeof (window as any).__clearAppCacheAndReload === 'function') {
      (window as any).__clearAppCacheAndReload();
    } else {
      try {
        const curUrl = new URL(window.location.href);
        curUrl.searchParams.set('v', '62');
        curUrl.searchParams.set('atualizado', Date.now().toString());
        window.location.replace(curUrl.toString());
      } catch {
        window.location.reload();
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('appvendas_update_banner_dismissed_ver', '62');
    } catch {}
  };

  return (
    <div className="bg-gradient-to-r from-emerald-700 via-teal-800 to-indigo-900 text-white px-3 py-2 border-b border-emerald-500/40 shadow-sm flex items-center justify-between gap-2 shrink-0 select-none animate-in slide-in-from-top-2 duration-200">
      <div 
        className="flex items-center gap-2 min-w-0 cursor-pointer"
        onClick={onOpenUpdateModal || handleUpdateNow}
      >
        <div className="w-7 h-7 rounded-lg bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center text-emerald-200 shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-xs text-white truncate">
              Nova Atualização Disponível (v62)
            </span>
            <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.2 rounded uppercase">
              Recente
            </span>
          </div>
          <p className="text-[10px] text-emerald-100 truncate">
            Toque para aplicar as melhorias no seu aplicativo instalado
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleUpdateNow}
          disabled={isUpdating}
          className="px-3 py-1 bg-white hover:bg-emerald-50 active:scale-95 text-emerald-900 font-black text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 text-emerald-700 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Atualizando...' : 'Atualizar Agora'}</span>
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="w-6 h-6 rounded-md hover:bg-white/10 text-emerald-200 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Dispensar aviso de atualização"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
