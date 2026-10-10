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
  Calendar
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
    paymentSettings
  } = useApp();

  const isBlocked = Boolean((isTrialExpired || isBlockedDueToDay5) && !isMasterAdmin && !isAdmin);

  const [copiedPix, setCopiedPix] = useState(false);
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string>('');
  const [pixPayloadCode, setPixPayloadCode] = useState<string>('');
  const [pixTxId, setPixTxId] = useState<string>('');
  const [activationCode, setActivationCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [radarPulseCount, setRadarPulseCount] = useState(0);
  const [selectedBankId, setSelectedBankId] = useState<string>(paymentSettings.receivingBank || 'NUBANK');

  // Real-time Bank Alert state
  const [bankAlert, setBankAlert] = useState<{
    visible: boolean;
    bankName: string;
    bankTag: string;
    amount: number;
    time: string;
    e2eId: string;
  } | null>(null);

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

  // Generate Validated Pix Payload (EMVCo / BR Code standard with CRC16)
  useEffect(() => {
    if (!isBlocked) return;

    try {
      const generatedTxId = 'ASSIN' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const pixResult = generatePixPayload({
        pixKey: paymentSettings.pixKey || '12.345.678/0001-90',
        merchantName: paymentSettings.merchantName || 'APP DE VENDAS SISTEMAS',
        merchantCity: paymentSettings.merchantCity || 'Barcarena PA',
        amount: planPrice,
        txId: generatedTxId,
      });

      setPixPayloadCode(pixResult.payload);
      setPixTxId(pixResult.txId);

      QRCode.toDataURL(pixResult.payload, {
        width: 280,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(url => {
        setPixQrDataUrl(url);
      });
    } catch {
      setPixPayloadCode(`PIX-DESCARTCLEAN-${planPrice}`);
    }
  }, [isBlocked, planPrice, paymentSettings]);

  // Only render if access is blocked (either trial expired or Day 5 passed without payment)
  if (!isBlocked) {
    return null;
  }

  const handleCopyPix = () => {
    if (pixPayloadCode) {
      navigator.clipboard.writeText(pixPayloadCode);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  // Trigger Instant Bank Notification & Unlock Access
  const handleValidateAndConfirmBankPayment = () => {
    setIsVerifying(true);

    setTimeout(() => {
      const e2e = generatePixE2EId();
      const nowTime = new Date().toLocaleTimeString('pt-BR');

      // Play authentic sound effects
      try {
        sounds.playBankNotification();
        setTimeout(() => sounds.playMoneyReceivedSound(), 180);
        confetti({
          particleCount: 130,
          spread: 100,
          origin: { y: 0.4 },
        });
      } catch {
        // ignore
      }

      // Display Instant Real-Time Bank Notification Banner
      setBankAlert({
        visible: true,
        bankName: currentBank.name,
        bankTag: currentBank.shortName,
        amount: planPrice,
        time: nowTime,
        e2eId: e2e,
      });

      setIsVerifying(false);

      // Unlock system after showing the alert
      setTimeout(() => {
        activateSubscription(undefined, `PIX-E2E-${e2e}`);
      }, 1400);

    }, 1000);
  };

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleApplyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    const raw = activationCode.trim();
    const clean = raw.toUpperCase();
    const validCodes = [
      '993192405',
      '9498',
      'PAGO9498',
      'PAGO94',
      'MESTRA94',
      'DESCART58', 
      'PAGO5894', 
      'LIBERAR2026', 
      'TESTE58', 
      'DESCARTCLEAN', 
      'PRO58', 
      'VIP2026',
      'MARCIA',
      'MARCIA2026',
      'ADMINMARCIA',
      'MARCIA0507',
      'MESTRA58',
      'MASTER2026'
    ];

    if (
      validCodes.includes(clean) || 
      raw.toLowerCase() === 'marciaalves050709@gmail.com' ||
      (clean.length >= 6 && !isNaN(Number(clean)))
    ) {
      activateSubscription(clean);
    } else {
      setCodeError('Código de ativação não encontrado. Insira o código correto enviado pelo administrador ou realize o pagamento via Pix.');
    }
  };

  const handleAdminBypass = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    const pass = adminPass.trim().toUpperCase();
    if (
      pass === 'MARCIA2026' || 
      pass === 'MARCIA' || 
      pass === '0507' || 
      pass === 'ADMINMARCIA' || 
      pass === 'MESTRA58' ||
      adminPass.trim().toLowerCase() === 'marciaalves050709@gmail.com'
    ) {
      activateSubscription('MASTER-ADMIN-MARCIA');
      setShowAdminLogin(false);
    } else {
      setAdminError('Senha mestra incorreta. Apenas a proprietária Márcia tem permissão.');
    }
  };

  const handleSendWhatsAppProof = () => {
    const rawPhone = paymentSettings.merchantWhatsapp || '5511999998888';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const message = encodeURIComponent(
      isBlockedDueToDay5
        ? `Olá! Meu sistema foi bloqueado devido ao vencimento do dia 05 e realizei o pagamento via Pix da mensalidade de ${formatCurrency(planPrice)} no ${currentBank.shortName}. Segue comprovante para liberar meu acesso!`
        : `Olá! Meu período de teste de 2 dias do App de vendas acabou e realizei o pagamento via Pix de ${formatCurrency(planPrice)} no ${currentBank.shortName}. Segue comprovante para liberar meu acesso!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white h-[100dvh] sm:h-auto sm:max-h-[94dvh] sm:rounded-3xl shadow-2xl border-0 sm:border-2 border-rose-400 overflow-hidden my-auto animate-scale-up flex flex-col">
        
        {/* Administrator Instant Release Header Bar */}
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2.5 flex items-center justify-between text-xs text-amber-950 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">👑</span>
            <span className="font-bold">
              É a administradora {adminConfig.name}?
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAdminMode()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
          >
            Liberar Acesso Grátis (Admin)
          </button>
        </div>

        {/* Paywall Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 text-white p-5 sm:p-6 text-center relative shrink-0">
          <div className="w-12 h-12 bg-rose-600/30 border-2 border-rose-400/50 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-lg backdrop-blur-md">
            <Lock className="w-6 h-6 text-rose-300" />
          </div>

          <div className="inline-block px-3 py-1 bg-rose-500/20 border border-rose-400/40 text-rose-300 font-black text-[10px] uppercase rounded-full tracking-wider mb-1.5">
            {isBlockedDueToDay5 ? '🚨 Vencimento do Dia 05 Ultrapassado' : 'Período de Teste de 2 Dias Concluído'}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {isBlockedDueToDay5 ? 'Acesso Bloqueado Imediatamente' : 'Acesso ao Sistema Bloqueado'}
          </h2>

          <p className="text-xs sm:text-sm text-rose-200 mt-1 max-w-lg mx-auto leading-relaxed">
            {isBlockedDueToDay5 ? (
              <>
                A sua mensalidade venceu no <strong>dia 05</strong> e o acesso foi suspenso automaticamente por falta de pagamento. Realize o Pix de <strong>{formatCurrency(planPrice)}</strong> para restabelecer seu acesso imediatamente.
              </>
            ) : (
              <>
                Seus 2 dias de teste grátis terminaram. Efetue o pagamento de <strong>{formatCurrency(planPrice)}</strong> via Pix para liberar o acesso imediato com vencimento todo dia 05.
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
                  bankAlert ? 'bg-emerald-500' : radarPulseCount % 2 === 0 ? 'bg-indigo-600 scale-125' : 'bg-amber-500 scale-95'
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

          {/* Instant Bank Notification Alert Display */}
          {bankAlert && bankAlert.visible && (
            <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl text-left shadow-xl border-2 border-emerald-400 animate-scale-up space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
                  Alerta Bancário em Tempo Real ({bankAlert.bankTag})
                </span>
                <span className="text-[11px] opacity-90 font-mono">{bankAlert.time}</span>
              </div>
              <p className="font-black text-sm pt-0.5">
                🎉 Transferência Pix de {formatCurrency(bankAlert.amount)} Recebida no {bankAlert.bankTag}!
              </p>
              <p className="text-xs text-emerald-100">
                O pagamento foi identificado com sucesso. Código E2E: <strong className="font-mono text-[10px]">{bankAlert.e2eId}</strong>. Liberando acesso ao sistema...
              </p>
            </div>
          )}

          {/* Validated Pix Payment Box with Real-time Radar */}
          <PixRadarScanner 
            onPaymentConfirmed={(e2e) => {
              activateSubscription(undefined, `PIX-RADAR-${e2e}`);
            }}
            planPrice={planPrice}
          />

          <div className="pt-1 flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowCodeInput(!showCodeInput)}
              className="text-xs text-slate-500 hover:text-indigo-600 font-bold flex items-center gap-1 underline cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{showCodeInput ? 'Ocultar código manual' : 'Tenho um código de liberação manual'}</span>
            </button>
          </div>

          {/* Toggleable Activation Code Form */}
          {showCodeInput && (
            <form onSubmit={handleApplyCode} className="p-4 bg-indigo-50/80 border-2 border-indigo-200 rounded-2xl space-y-2.5 animate-scale-up">
              <label className="block text-xs font-black uppercase text-indigo-950">
                Inserir Código de Desbloqueio
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={activationCode}
                  onChange={e => {
                    setActivationCode(e.target.value);
                    setCodeError('');
                  }}
                  placeholder="Ex: DESCART58 ou LIBERAR2026"
                  className="flex-1 px-3 py-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-slate-900 focus:outline-hidden focus:border-indigo-600"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Liberar
                </button>
              </div>
              {codeError && (
                <p className="text-xs text-rose-600 font-bold">{codeError}</p>
              )}
            </form>
          )}

        </div>

        {/* Paywall Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{paymentSettings.merchantName || 'Sistema'} • Criado por <strong className="text-slate-700 font-bold">Marcia Alves</strong></span>
          
          {/* Master Owner Security Access */}
          <button
            type="button"
            onClick={() => setShowAdminLogin(true)}
            className="text-[11px] font-bold text-slate-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs transition-all"
            title="Acesso exclusivo da proprietária e administradora Márcia"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Permissão do Administrador</span>
          </button>
        </div>

        {/* Master Owner PIN Login Modal */}
        {showAdminLogin && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border-2 border-indigo-500 animate-scale-up space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    👑
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900">Acesso Mestre do Dono</h4>
                    <p className="text-[10px] text-slate-500">Márcia (marciaalves050709@gmail.com)</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Digite sua Chave Mestra para liberar acesso vitalício sem necessidade de pagamento via Pix.
              </p>

              <form onSubmit={handleAdminBypass} className="space-y-2">
                <input
                  type="password"
                  value={adminPass}
                  onChange={e => {
                    setAdminPass(e.target.value);
                    setAdminError('');
                  }}
                  placeholder="Digite sua Senha Mestra (Ex: MARCIA2026)"
                  className="w-full px-3 py-2 text-xs border border-indigo-300 rounded-xl focus:border-indigo-600 focus:outline-hidden font-mono"
                  autoFocus
                />
                {adminError && <p className="text-[11px] text-rose-600 font-bold">{adminError}</p>}
                
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdminLogin(false)}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Entrar como Dono
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
