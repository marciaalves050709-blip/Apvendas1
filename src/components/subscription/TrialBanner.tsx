import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/pixHelper';
import { 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Zap, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Settings2,
  Lock,
  Crown
} from 'lucide-react';

export const TrialBanner: React.FC = () => {
  const {
    subscription,
    isTrialActive,
    isTrialExpired,
    isBlockedDueToDay5,
    isSubscribed,
    isMasterAdmin,
    isAdmin,
    setAdminMode,
    setClientTestMode,
    adminConfig,
    trialDaysRemaining,
    trialHoursRemaining,
    isDueWarningActive,
    daysUntilDue,
    nextDueDateFormatted,
    setIsSubscriptionModalOpen,
    resetTrial,
    simulateTrialExpired,
    simulateTrialDay,
    simulateDay5Warning,
    simulateDay5Blocked,
    blockUnpaidUser,
    renewSubscription
  } = useApp();

  const [showSimMenu, setShowSimMenu] = useState(false);

  // Administrator View: Completely exempt from charges and countdowns
  if (isMasterAdmin || isAdmin) {
    return (
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white px-3 sm:px-6 py-2 border-b border-indigo-800/60 shrink-0 shadow-xs select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 shadow-xs">
              <Crown className="w-4 h-4 text-amber-400" />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-md font-black text-[10px] uppercase tracking-wider flex items-center gap-1">
                  👑 Administradora: {adminConfig.name}
                </span>
                <span className="font-black text-emerald-400 text-xs truncate flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Acesso Vitalício Gratuito (Isenta de Cobrança)
                </span>
              </div>
              <p className="text-[10px] text-slate-300 hidden md:block mt-0.5">
                Você nunca será cobrada. A mensalidade de R$ 94,98/mês vence todo dia 05 para clientes, com aviso prévio e bloqueio automático se não renovarem.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>Minha Licença Mestra</span>
            </button>

            {/* Test Unpaid Blocking Action */}
            <button
              type="button"
              onClick={() => blockUnpaidUser()}
              className="p-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              title="Testar bloqueio imediato de usuário que não pagou"
            >
              <Lock className="w-3.5 h-3.5 text-rose-300" />
              <span className="hidden sm:inline">Testar Bloqueio (Não Pagou)</span>
            </button>

            {/* Test Client Mode Toggle */}
            <button
              type="button"
              onClick={() => setClientTestMode()}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-lg text-[10px] font-medium transition-all flex items-center gap-1 cursor-pointer"
              title="Testar como cliente/lojista (com teste de 2 dias e cobrança todo dia 05)"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden lg:inline text-[10px]">Testar Modo Cliente</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isSubscribed && !isAdmin && !isMasterAdmin) {
    // AccessPaywall covers the entire screen for unpaid users
    return null;
  }

  // 1) WARNING BANNER: Proactively informing that payment is about to expire on Day 5!
  if (isSubscribed && isDueWarningActive) {
    return (
      <div className="bg-gradient-to-r from-amber-900 via-orange-950 to-amber-950 text-white px-3 sm:px-6 py-2.5 border-b-2 border-amber-500 shrink-0 shadow-md select-none animate-pulse-subtle">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/30 border border-amber-400 flex items-center justify-center text-amber-300 shrink-0 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-300 animate-bounce" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-amber-400 text-slate-950 rounded-md font-black text-[10px] uppercase tracking-wider">
                  ⚠️ Vencimento do Dia 05 Próximo
                </span>
                <span className="font-black text-amber-200 text-xs truncate">
                  {daysUntilDue === 0
                    ? 'Sua mensalidade vence HOJE (Dia 05)! Renove para não bloquear.'
                    : `Sua mensalidade de ${formatCurrency(subscription.planPrice)} vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'} (${nextDueDateFormatted})!`}
                </span>
              </div>
              <p className="text-[11px] text-amber-100/90 hidden sm:block mt-0.5">
                O aplicativo bloqueia imediatamente se a renovação não for confirmada no dia 05. Faça o Pix para garantir seu acesso contínuo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-slate-950" />
              <span>Renovar Agora ({formatCurrency(subscription.planPrice)})</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2) Normal Subscribed Banner: Payment is completely up to date
  if (isSubscribed) {
    return (
      <div className="bg-emerald-950 text-white px-4 py-1.5 text-xs flex items-center justify-between border-b border-emerald-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Mensalidade em Dia ({formatCurrency(subscription.planPrice)}/mês)
          </span>
          <span className="hidden md:inline text-emerald-300 text-[11px]">
            • Próximo vencimento: <strong>{nextDueDateFormatted} (Dia 05)</strong>. Bloqueio automático se não renovado.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="text-[11px] font-bold text-emerald-200 hover:text-white underline cursor-pointer"
          >
            Ver Detalhes do Plano
          </button>
        </div>
      </div>
    );
  }

  // Active Trial Banner (2 Days Free Trial)
  const totalDays = subscription.trialDurationDays || 2;
  const daysPassed = Math.max(0, totalDays - trialDaysRemaining);

  return (
    <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white px-3 sm:px-6 py-2 border-b border-indigo-800/60 shrink-0 shadow-xs select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
        
        {/* Left Side: Countdown info */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-600/80 border border-indigo-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow-xs">
            <Clock className="w-4 h-4 animate-pulse" />
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-md font-black text-[10px] uppercase tracking-wider">
                🎁 Teste Grátis (2 Dias)
              </span>
              <span className="font-bold text-slate-100 text-xs truncate">
                Restam <strong className="text-amber-300 font-black">{trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'} e {trialHoursRemaining}h</strong> de teste gratuito
              </span>
            </div>
            <p className="text-[10px] text-slate-300 hidden md:block mt-0.5">
              Experimente todas as funções grátis. Após os 2 dias, a assinatura é de apenas <strong>{formatCurrency(subscription.planPrice)}</strong>.
            </p>
          </div>
        </div>

        {/* Right Side: Days Dots + Subscribe CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* 2-day visual steps */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-white/10 rounded-lg text-[10px] font-semibold text-slate-300">
            <span className="mr-1 text-[9px] uppercase font-bold text-indigo-200">Dia:</span>
            {[1, 2].map(day => {
              const isPast = day <= daysPassed;
              const isCurrent = day === daysPassed + 1;
              return (
                <span
                  key={day}
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                    isPast
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300/50 animate-pulse'
                      : 'bg-white/20 text-white/60'
                  }`}
                  title={`Dia ${day} de 2`}
                >
                  {day}
                </span>
              );
            })}
          </div>

          {/* Main Subscribe Action Button */}
          <button
            type="button"
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-400/40"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
            <span>Assinar por {formatCurrency(subscription.planPrice)}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
