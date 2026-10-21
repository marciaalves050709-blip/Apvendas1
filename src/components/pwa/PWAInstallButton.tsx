import React, { useState } from 'react';
import { Smartphone, Download, Check, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';
import confetti from 'canvas-confetti';

interface PWAInstallButtonProps {
  variant?: 'header' | 'sidebar' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstalled, isInstallable, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [isPressing, setIsPressing] = useState(false);

  // If already running in standalone installed app, show installed state or hide
  if (isInstalled) {
    return (
      <span className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs select-none">
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline">App Instalado</span>
      </span>
    );
  }

  const handleClick = async () => {
    // Immediate tactile feedback, never stuck spinning
    setIsPressing(true);
    setTimeout(() => setIsPressing(false), 300);

    try {
      // If native prompt is available, launch it directly!
      if (isInstallable) {
        const res = await install();
        if (res.success && res.action === 'prompt') {
          try {
            confetti({
              particleCount: 80,
              spread: 80,
              origin: { y: 0.6 }
            });
          } catch {
            // ignore
          }
          return;
        }
        if (res.action === 'android_intent') {
          return;
        }
      }

      // If browser doesn't have native beforeinstallprompt (e.g. iOS or in-app browser or Chrome throttled),
      // open the install guidance modal immediately with zero wait!
      setShowModal(true);
    } catch {
      setShowModal(true);
    }
  };

  if (variant === 'sidebar') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`w-full mt-2 p-2.5 bg-gradient-to-r ${
            isIOS 
              ? 'from-blue-50 via-indigo-50 to-slate-50 hover:from-blue-100 hover:to-indigo-100 border-blue-300/80' 
              : 'from-emerald-50 via-teal-50 to-indigo-50 hover:from-emerald-100 hover:to-indigo-100 border-emerald-300/80'
          } border rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer shadow-2xs group active:scale-98 ${
            isPressing ? 'scale-95 bg-emerald-100' : ''
          }`}
          title={isIOS ? "Instalar aplicativo diretamente no seu iPhone" : "Instalar diretamente como aplicativo no celular ou computador"}
        >
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${isIOS ? 'bg-blue-600' : 'bg-emerald-600'} text-white flex items-center justify-center shadow-xs`}>
              <Smartphone className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <span className="block font-black text-slate-900 text-xs leading-tight">
                {isIOS ? 'Instalar no iPhone' : 'Instalar como App'}
              </span>
              <span className={`block text-[10px] ${isIOS ? 'text-blue-700' : 'text-emerald-700'} font-medium leading-tight`}>
                {isIOS ? 'Adicionar à Tela de Início' : 'Instale por dentro do app'}
              </span>
            </div>
          </div>
          <Download className={`w-3.5 h-3.5 ${isIOS ? 'text-blue-700' : 'text-emerald-700'} group-hover:translate-y-0.5 transition-transform`} />
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
        className={`px-2.5 sm:px-3 py-2 ${
          isIOS 
            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-blue-700/20' 
            : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-emerald-700/20'
        } active:scale-95 text-white rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
          isPressing ? 'scale-95' : ''
        }`}
        title={isIOS ? "Instalar aplicativo diretamente no iPhone" : "Instalar como aplicativo nativo no celular ou computador"}
      >
        <Smartphone className="w-3.5 h-3.5 text-blue-200" />
        <span>{isIOS ? 'Instalar no iPhone' : 'Instalar como App'}</span>
      </button>

      <PWAInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
