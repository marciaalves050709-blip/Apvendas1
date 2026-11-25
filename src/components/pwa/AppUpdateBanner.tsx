import React, { useState, useEffect } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const CLIENT_BUILD_VER = '67';

interface AppUpdateBannerProps {
  onOpenUpdateModal?: () => void;
}

export const AppUpdateBanner: React.FC<AppUpdateBannerProps> = ({ onOpenUpdateModal }) => {
  const { triggerOneClickUpdate } = useApp();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [availableVersion, setAvailableVersion] = useState<string>(CLIENT_BUILD_VER);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 1. Check if user already dismissed banner this session for this specific version
    try {
      const dismissedVer = sessionStorage.getItem('appvendas_update_banner_dismissed_ver');
      if (dismissedVer && dismissedVer !== CLIENT_BUILD_VER) {
        setDismissed(true);
      }
    } catch {}

    // 2. Listen to custom event ONLY when a genuinely newer version is detected on the server or SW
    const handleUpdateAvailable = (ev: Event) => {
      const customEv = ev as CustomEvent<{ version?: string }>;
      const incomingVer = String(customEv?.detail?.version || '').replace(/^v/i, '').trim();
      if (!incomingVer || incomingVer !== CLIENT_BUILD_VER) {
        if (incomingVer) setAvailableVersion(incomingVer);
        setUpdateAvailable(true);
        setDismissed(false);
      }
    };

    window.addEventListener('app-update-available', handleUpdateAvailable);

    // 3. Real-time check against /api/version so installed PWAs detect updates reliably without false positives
    fetch(`/api/version?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.version) {
          const serverVer = String(data.version).replace(/^v/i, '').trim();
          if (serverVer && serverVer !== CLIENT_BUILD_VER) {
            setAvailableVersion(serverVer);
            setUpdateAvailable(true);
            setDismissed(false);
          }
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('app-update-available', handleUpdateAvailable);
    };
  }, []);

  if (!updateAvailable || dismissed) {
    return null;
  }

  const handleUpdateNow = async () => {
    setIsUpdating(true);
    try {
      await triggerOneClickUpdate();
    } catch {
      if (typeof (window as any).__clearAppCacheAndReload === 'function') {
        (window as any).__clearAppCacheAndReload(availableVersion);
      }
    } finally {
      setTimeout(() => setIsUpdating(false), 5000);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('appvendas_update_banner_dismissed_ver', availableVersion);
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
              Nova Atualização Disponível (v{availableVersion})
            </span>
            <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.2 rounded uppercase">
              Em Tempo Real
            </span>
          </div>
          <p className="text-[10px] text-emerald-100 truncate">
            Toque para sincronizar e aplicar a versão mais recente no app instalado
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
