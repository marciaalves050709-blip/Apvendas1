import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 md:bottom-4 left-3 right-3 md:left-auto md:right-4 z-50 flex items-center justify-between gap-3 rounded-2xl bg-slate-900/95 text-white px-3.5 py-2.5 shadow-2xl border border-slate-700 backdrop-blur-md animate-slide-up">
      <div className="flex items-center gap-2.5">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </span>
        <div className="text-xs">
          <span className="font-black text-amber-300 block leading-tight">Modo Offline Ativo</span>
          <span className="text-[10px] text-slate-300 leading-tight">Suas vendas e estoque continuam salvos no celular.</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-lg">
        <Database className="w-3 h-3 text-emerald-400" />
        <span>Salvo local</span>
      </div>
    </div>
  );
};
