import React, { useState } from 'react';
import { Smartphone, Download, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running in standalone installed app, don't show prompt button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  if (variant === 'sidebar') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className="w-full mt-2 p-2.5 bg-gradient-to-r from-indigo-50 to-emerald-50 hover:from-indigo-100 hover:to-emerald-100 border border-indigo-200 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs group"
          title="Instalar no celular como aplicativo"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block font-black text-indigo-950 text-xs leading-tight">Instalar no Celular</span>
              <span className="block text-[10px] text-indigo-600 font-medium leading-tight">Funciona como app nativo</span>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-indigo-600 group-hover:translate-y-0.5 transition-transform" />
        </button>

        <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="px-2.5 sm:px-3 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
        title="Instalar no celular como aplicativo nativo"
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Instalar no Celular</span>
        <span className="sm:hidden">Instalar</span>
      </button>

      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
