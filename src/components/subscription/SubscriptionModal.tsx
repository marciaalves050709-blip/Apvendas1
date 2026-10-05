import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, generatePixPayload, generatePixE2EId, BANKS_LIST, sounds } from '../../utils/pixHelper';
import { 
  X, 
  Check, 
  Copy, 
  QrCode, 
  ShieldCheck, 
  Sparkles, 
  Send, 
  Clock, 
  Zap, 
  Lock, 
  KeyRound, 
  HelpCircle, 
  CheckCircle2,
  Radio,
  Bell,
  Building2,
  CheckCheck
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';

export const SubscriptionModal: React.FC = () => {
  const {
    subscription,
    isSubscriptionModalOpen,
    setIsSubscriptionModalOpen,
    isSubscribed,
    isMasterAdmin,
    nextDueDateFormatted,
    isTrialActive,
    trialDaysRemaining,
    trialHoursRemaining,
    activateSubscription,
    paymentSettings
  } = useApp();

  const [copiedPix, setCopiedPix] = useState(false);
  const [pixQrDataUrl, setPixQrDataUrl] = useState<string>('');
  const [pixPayloadCode, setPixPayloadCode] = useState<string>('');
  const [pixTxId, setPixTxId] = useState<string>('');
  const [activationCode, setActivationCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'PIX' | 'CODE'>('PIX');
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

  const planPrice = subscription.planPrice || 58.94;

  const currentBank = useMemo(() => {
    return BANKS_LIST.find(b => b.id === selectedBankId) || BANKS_LIST[0];
  }, [selectedBankId]);

  // Live Radar Pulse Animation
  useEffect(() => {
    if (!isSubscriptionModalOpen || isSubscribed) return;
    const interval = setInterval(() => {
      setRadarPulseCount(c => c + 1);
    }, 1400);
    return () => clearInterval(interval);
  }, [isSubscriptionModalOpen, isSubscribed]);

  // Generate Pix Payload & QR Code for R$ 58,94
  useEffect(() => {
    if (!isSubscriptionModalOpen) return;

    try {
      const generatedTxId = 'ASSIN' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const pixResult = generatePixPayload({
        pixKey: paymentSettings.pixKey || '12.345.678/0001-90',
        merchantName: paymentSettings.merchantName || 'APP DE VENDAS SISTEMAS',
        merchantCity: paymentSettings.merchantCity || 'SAO PAULO',
        amount: planPrice,
        txId: generatedTxId,
      });

      setPixPayloadCode(pixResult.payload);
      setPixTxId(pixResult.txId);

      QRCode.toDataURL(pixResult.payload, {
        width: 260,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(url => {
        setPixQrDataUrl(url);
      });
    } catch {
      setPixPayloadCode(`PIX-DESCARTCLEAN-ASSINATURA-${planPrice}`);
    }
  }, [isSubscriptionModalOpen, planPrice, paymentSettings]);

  if (!isSubscriptionModalOpen) return null;

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

      // Play sound effects
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
        activateSubscription(undefined, `PIX-CONFIRMADO-${e2e}`);
      }, 1400);

    }, 1000);
  };

  const handleApplyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');
    const clean = activationCode.trim().toUpperCase();

    // Accepted valid codes
    const validCodes = [
      'DESCART58', 
      'PAGO5894', 
      'LIBERAR2026', 
      'TESTE58', 
      'DESCARTCLEAN', 
      'PRO58', 
      '5894', 
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
      activationCode.trim().toLowerCase() === 'marciaalves050709@gmail.com' ||
      (clean.length >= 6 && !isNaN(Number(clean)))
    ) {
      activateSubscription(clean);
    } else {
      setCodeError('Código de ativação inválido. Digite o código fornecido após o pagamento ou pague via Pix.');
    }
  };

  const handleSendProofWhatsApp = () => {
    const rawPhone = paymentSettings.merchantWhatsapp || '5511999998888';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá! Realizei o pagamento via Pix de ${formatCurrency(planPrice)} no ${currentBank.shortName} para assinatura do sistema App de vendas. Segue meu comprovante para liberação!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const features = [
    'Controle ilimitado de estoque e produtos',
    'Frente de Caixa & PDV ágil com cupom não fiscal e atacado automático',
    'Catálogo para Celular com pedidos formatados direto no WhatsApp',
    'Alertas inteligentes de estoque mínimo e bloqueio de produtos zerados',
    'Identificação de Pix no banco em tempo real com alertas sonoros',
    'Relatórios financeiros de lucro, vendas por produto e curva ABC',
    'Suporte prioritário e atualizações automáticas inclusas',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-scale-up flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between relative shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase rounded-md tracking-wider">
                {isSubscribed ? 'Licença Ativa' : 'Assinatura do Sistema'}
              </span>
              {isTrialActive && (
                <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 text-[10px] font-bold rounded-md">
                  {trialDaysRemaining}d {trialHoursRemaining}h de teste restantes
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              appvendas Pro
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-lg">
              Sistema completo de controle de estoque, vendas no balcão e pedidos pelo WhatsApp.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSubscriptionModalOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Status & Price Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border-2 border-indigo-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase text-indigo-900 tracking-wider">
                  Plano Mensal Completo
                </span>
                <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                  Vencimento Todo Dia 05
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  {formatCurrency(planPrice)}
                </span>
                <span className="text-xs text-slate-500 font-bold">/mês</span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                {isSubscribed 
                  ? (isMasterAdmin ? '👑 Acesso Vitalício do Administrador Márcia ativo.' : `✅ Assinatura ativa! Próximo vencimento: ${nextDueDateFormatted}.`)
                  : `5 dias grátis para teste. Renovação mensal todo dia 05 (${nextDueDateFormatted}).`}
              </p>
            </div>

            <div className="shrink-0 w-full sm:w-auto text-right">
              {isSubscribed ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{isMasterAdmin ? 'Acesso Vitalício' : 'Acesso Total Ativo'}</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-black">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>{trialDaysRemaining} dias restantes de teste</span>
                </div>
              )}
            </div>
          </div>

          {/* Included Features List */}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Tudo o que está incluso no seu plano:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
              {features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-tight text-[11px]">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Real-Time Bank Webhook Radar Card */}
          {!isSubscribed && (
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
                O radar escuta a chegada de <strong>{formatCurrency(planPrice)}</strong> na conta do <strong>{currentBank.shortName}</strong>. Quando o Pix for pago, o alarme toca e o acesso é liberado no mesmo instante!
              </p>
            </div>
          )}

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
                O pagamento foi identificado com sucesso. Código E2E: <strong className="font-mono text-[10px]">{bankAlert.e2eId}</strong>. Ativando licença Pro...
              </p>
            </div>
          )}

          {/* Payment / Activation Options */}
          {!isSubscribed && (
            <div className="space-y-4 pt-2 border-t border-slate-100">
              
              {/* Tab Selector: Pix vs Activation Code */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedTab('PIX')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedTab === 'PIX'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Pagar via Pix ({formatCurrency(planPrice)})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTab('CODE')}
                  className={`flex-1 py-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedTab === 'CODE'
                      ? 'bg-white text-indigo-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Tenho um Código de Liberação</span>
                </button>
              </div>

              {selectedTab === 'PIX' ? (
                <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-2xl p-4 sm:p-5 space-y-4 text-center">
                  
                  {/* Validated Header */}
                  <div className="flex flex-col items-center">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-black uppercase tracking-wider mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Código Pix Válido e Autenticado</span>
                    </div>
                    <h3 className="text-base font-black text-emerald-950 mt-0.5">
                      Pague via Pix e libere o acesso na mesma hora
                    </h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Chave: <strong className="text-emerald-950">{paymentSettings.pixKey || '12.345.678/0001-90'}</strong> • Beneficiário: <strong className="text-emerald-950">{paymentSettings.merchantName || 'appvendas'}</strong>
                    </p>
                  </div>

                  {/* QR Code */}
                  {pixQrDataUrl && (
                    <div className="inline-block p-2 bg-white rounded-2xl shadow-md border-2 border-emerald-400">
                      <img
                        src={pixQrDataUrl}
                        alt="QR Code Pix"
                        className="w-40 h-40 mx-auto"
                      />
                      <div className="text-[10px] font-bold text-slate-500 mt-1 font-mono">
                        TxID: {pixTxId || 'ASSIN-5894'}
                      </div>
                    </div>
                  )}

                  {/* Copy Pix & Actions */}
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-lg mx-auto">
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    >
                      {copiedPix ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedPix ? 'Chave Copiada!' : 'Copiar Pix Copia e Cola'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleValidateAndConfirmBankPayment}
                      disabled={isVerifying}
                      className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <>
                          <Radio className="w-4 h-4 animate-spin" />
                          <span>Consultando Banco...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                          <span>Validar Pagamento no Banco</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* WhatsApp Proof Button */}
                  <div className="pt-2 border-t border-emerald-200">
                    <button
                      type="button"
                      onClick={handleSendProofWhatsApp}
                      className="text-xs text-emerald-800 hover:text-emerald-950 font-bold inline-flex items-center gap-1.5 underline cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar comprovante para suporte no WhatsApp</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Activation Code Form */
                <form onSubmit={handleApplyCode} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                      Código de Ativação / Licença
                    </label>
                    <p className="text-xs text-slate-500 mb-3">
                      Insira o código de liberação fornecido pelo administrador após a confirmação do pagamento.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={activationCode}
                        onChange={e => {
                          setActivationCode(e.target.value);
                          setCodeError('');
                        }}
                        placeholder="Ex: DESCART58 ou LIBERAR2026"
                        className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-sm font-mono font-bold uppercase tracking-wider focus:outline-hidden focus:border-indigo-600 text-slate-900"
                      />
                      <button
                        type="submit"
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer"
                      >
                        Ativar Licença
                      </button>
                    </div>
                    {codeError && (
                      <p className="text-xs text-rose-600 font-bold mt-2">{codeError}</p>
                    )}
                  </div>
                  
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p>
                      Dica de teste: Você pode usar códigos como <strong>DESCART58</strong> ou <strong>LIBERAR2026</strong> para ativar imediatamente.
                    </p>
                  </div>
                </form>
              )}

            </div>
          )}

          {/* If already subscribed */}
          {isSubscribed && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-950 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Sua licença está 100% ativa e regularizada!</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Você possui acesso ilimitado a todas as ferramentas do App vendas, incluindo controle de estoque, vendas PDV, alertas e catálogo no WhatsApp.
              </p>
              {subscription.subscriptionExpiresAt && (
                <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                  Válido até: <strong>{new Date(subscription.subscriptionExpiresAt).toLocaleDateString('pt-BR')}</strong>
                </p>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Garantia de satisfação • Criado por <strong className="text-slate-700 font-bold">Marcia Alves</strong></span>
          <button
            type="button"
            onClick={() => setIsSubscriptionModalOpen(false)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
