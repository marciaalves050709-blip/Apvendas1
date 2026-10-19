import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, generatePixPayload, generatePixE2EId, BANKS_LIST, sounds, SUBSCRIPTION_CONFIG } from '../../utils/pixHelper';
import { PixRadarScanner } from './PixRadarScanner';
import { 
  Lock, 
  ShieldAlert, 
  QrCode, 
  Copy, 
  Check, 
  Zap, 
  Send, 
  KeyRound, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw, 
  Radio,
  Bell,
  ShieldCheck,
  Building2,
  CheckCheck,
  AlertCircle,
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';

export const AccessPaywall: React.FC = () => {
  const {
    subscription,
    isTrialExpired,
    isBlockedDueToDay5,
    isSubscribed,
    isMasterAdmin,
    isAdmin,
    setAdminMode,
    adminConfig,
    activateSubscription,
    resetTrial,
    nextDueDateFormatted,
    paymentSettings,
    isAccessAllowed,
    isTestBlockMode,
    exitTestBlockMode
  } = useApp();

  const isBlocked = Boolean(isTestBlockMode || (!isAdmin && !isMasterAdmin && !isAccessAllowed));

  const [radarPulseCount, setRadarPulseCount] = useState(0);
  const [selectedBankId, setSelectedBankId] = useState<string>(paymentSettings.receivingBank || 'NUBANK');

  const planPrice = subscription.planPrice || 94.98;

  const currentBank = useMemo(() => {
    return BANKS_LIST.find(b => b.id === selectedBankId) || BANKS_LIST[0];
  }, [selectedBankId]);

  // Live Radar Pulse Animation
  useEffect(() => {
    if (!isBlocked) return;
    const interval = setInterval(() => {
      setRadarPulseCount(c => c + 1);
    }, 1400);
    return () => clearInterval(interval);
  }, [isBlocked]);

  // Only render if access is blocked (either test block, trial expired or Day 5 passed without payment)
  if (!isBlocked) {
    return null;
  }

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAdminBypass = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    const raw = adminPass.trim();
    // Normalize string: remove spaces, hyphens, dots, parentheses
    const pass = raw.replace(/[\s\-\(\)\.]+/g, '').toUpperCase();

    const masterCodes = [
      'MARCIA2026',
      'MARCIA',
      '0507',
      'MARCIA0507',
      'ADMINMARCIA',
      'MESTRA58',
      'MASTER2026',
      'MASTERADMIN',
      'MASTERADMINMARCIA',
      'MARCIAALVES',
      '91993192405',
      '993192405'
    ];

    const isMaster = masterCodes.includes(pass) || 
      pass.includes('MASTERADMIN') || 
      pass.includes('MARCIA') || 
      pass === '0507' || 
      raw.toLowerCase().includes('marciaalves');

    if (isMaster) {
      exitTestBlockMode();
      activateSubscription('MARCIA2026', 'MASTER-ADMIN-MARCIA');
      setShowAdminLogin(false);
      setAdminPass('');
    } else {
      setAdminError('Chave incorreta. Digite sua Chave de Administradora para liberar o acesso.');
    }
  };

  const handleSendWhatsAppProof = () => {
    const cleanPhone = '5591993192405';
    const message = encodeURIComponent(
      `Olá Márcia! Realizei o pagamento via Pix da assinatura do App de Vendas no valor de ${formatCurrency(planPrice)}. Segue meu comprovante para confirmação!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-0 sm:p-6 overflow-y-auto">
      {/* Test Block Mode Banner for Admin */}
      {isTestBlockMode && (
        <div className="w-full max-w-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-4 py-2.5 sm:rounded-t-2xl text-xs font-black flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg shrink-0 border-b-2 border-amber-300">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-black/20 rounded text-sm">🧪</span>
            <span>
              MODO TESTE DE BLOQUEIO (ADMINISTRADORA): Este é o bloqueio total que o usuário não pago vê.
            </span>
          </div>
          <button
            type="button"
            onClick={exitTestBlockMode}
            className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-300 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md shrink-0"
          >
            <span>← Sair do Teste e Voltar ao Administrador</span>
          </button>
        </div>
      )}

      <div className={`w-full max-w-2xl bg-white h-[100dvh] sm:h-auto sm:max-h-[94dvh] ${isTestBlockMode ? 'sm:rounded-b-3xl' : 'sm:rounded-3xl'} shadow-2xl border-0 sm:border-2 border-rose-400 overflow-hidden my-auto animate-scale-up flex flex-col`}>
        {/* Paywall Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 text-white p-5 sm:p-6 text-center relative shrink-0">
          <div className="w-12 h-12 bg-rose-600/30 border-2 border-rose-400/50 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-lg backdrop-blur-md">
            <Lock className="w-6 h-6 text-rose-300" />
          </div>

          <div className="inline-block px-3 py-1 bg-rose-500/20 border border-rose-400/40 text-rose-300 font-black text-[10px] uppercase rounded-full tracking-wider mb-1.5">
            {isBlockedDueToDay5 
              ? '🚨 Vencimento do Dia 05 Ultrapassado' 
              : isTrialExpired 
              ? '⏳ Período de Teste de 2 Dias Concluído' 
              : '⛔ Acesso Bloqueado: Pagamento Pendente'}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {isBlockedDueToDay5 
              ? 'Acesso Bloqueado: Dia 05 Vencido' 
              : isTrialExpired 
              ? 'Acesso Bloqueado: Teste Expirado' 
              : 'Acesso Bloqueado por Não Pagamento'}
          </h2>

          <p className="text-xs sm:text-sm text-rose-200 mt-1 max-w-lg mx-auto leading-relaxed">
            {isBlockedDueToDay5 ? (
              <>
                A sua mensalidade venceu no <strong>dia 05</strong> e o acesso foi suspenso automaticamente por falta de pagamento. Realize o Pix de <strong>{formatCurrency(planPrice)}</strong> para restabelecer seu acesso imediatamente.
              </>
            ) : isTrialExpired ? (
              <>
                Seus 2 dias de teste grátis terminaram. Efetue o pagamento de <strong>{formatCurrency(planPrice)}</strong> via Pix para liberar o acesso imediato com vencimento todo dia 05.
              </>
            ) : (
              <>
                O acesso a esta conta está suspenso por falta de pagamento. Realize o Pix de <strong>{formatCurrency(planPrice)}</strong> ou insira o código de ativação para restabelecer o acesso.
              </>
            )}
          </p>
        </div>

        {/* Paywall Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Price Offer Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Plano Mensal App vendas Pro
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-600" />
                  Vencimento Todo Dia 05
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  {formatCurrency(planPrice)}
                </span>
                <span className="text-xs text-slate-500 font-bold">/mês</span>
              </div>
              <p className="text-[11px] text-emerald-900 font-semibold mt-0.5">
                📅 Vence todo dia 05 de cada mês • Liberação imediata pelo Banco
              </p>
            </div>

            <div className="space-y-1 text-xs text-slate-700 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Estoque Ilimitado & Alertas</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>PDV Caixa com Cupom de Venda</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Bloqueio Automático se não renovar dia 05</span>
              </div>
            </div>
          </div>

          {/* Real-Time Bank Webhook Radar Card */}
          <div className="p-3.5 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-slate-50 text-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  radarPulseCount % 2 === 0 ? 'bg-indigo-600 scale-125' : 'bg-amber-500 scale-95'
                } transition-transform duration-300`} />
                <span className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                  Radar Bancário em Tempo Real
                </span>
              </div>

              {/* Destination Bank Selector */}
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-800 cursor-pointer shadow-xs focus:outline-hidden focus:border-indigo-600"
                >
                  {BANKS_LIST.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.shortName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O sistema monitora a entrada de <strong>{formatCurrency(planPrice)}</strong> na conta do <strong>{currentBank.shortName}</strong>. Assim que o Pix for transferido, o alarme toca e o acesso é liberado no mesmo segundo!
            </p>
          </div>

          {/* Validated Pix Payment Box with Real-time Radar */}
          <PixRadarScanner 
            onPaymentConfirmed={(e2e) => {
              activateSubscription(undefined, `PIX-RADAR-${e2e}`);
            }}
            planPrice={planPrice}
          />

        </div>

        {/* Paywall Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{paymentSettings.merchantName || 'Sistema'} • Liberação Imediata via Pix</span>
          
          {/* Discrete Administrator Access Link */}
          <button
            type="button"
            onClick={() => setShowAdminLogin(true)}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
            title="Acesso da Administradora"
          >
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Acesso da Administradora</span>
          </button>
        </div>

        {/* Master Owner PIN Login Modal */}
        {showAdminLogin && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border-2 border-indigo-500 animate-scale-up space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                    👑
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900">Acesso da Administradora</h4>
                    <p className="text-[10px] text-slate-500">Márcia Alves</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Digite sua Chave Mestra de Administradora para liberar o acesso vitalício.
              </p>

              <form onSubmit={handleAdminBypass} className="space-y-3">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPass}
                    onChange={e => {
                      setAdminPass(e.target.value);
                      setAdminError('');
                    }}
                    placeholder="Sua Chave Mestra"
                    className="w-full pl-3 pr-10 py-2.5 text-xs border border-indigo-300 rounded-xl focus:border-indigo-600 focus:outline-hidden font-mono uppercase font-bold text-slate-900 bg-slate-50 focus:bg-white"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showPassword ? 'Ocultar' : 'Visualizar'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {adminError && <p className="text-[11px] text-rose-600 font-bold">{adminError}</p>}
                
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setAdminPass('');
                      setAdminError('');
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Entrar como Administradora</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
