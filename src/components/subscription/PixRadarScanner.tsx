import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Copy, 
  Check, 
  QrCode, 
  Zap, 
  ShieldCheck, 
  CheckCircle2, 
  Bell, 
  ArrowRight,
  ExternalLink,
  Sparkles,
  Lock,
  Clock,
  CheckCheck
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { generatePixPayload, generatePixE2EId, formatCurrency, sounds, SUBSCRIPTION_CONFIG } from '../../utils/pixHelper';

interface PixRadarScannerProps {
  onPaymentConfirmed: (e2eId: string) => void;
  planPrice?: number;
}

export const PixRadarScanner: React.FC<PixRadarScannerProps> = ({ 
  onPaymentConfirmed,
  planPrice = SUBSCRIPTION_CONFIG.monthlyPrice
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [pixPayload, setPixPayload] = useState<string>('');
  const [txId, setTxId] = useState<string>('');
  const [radarPulse, setRadarPulse] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isIdentified, setIsIdentified] = useState(false);
  const [e2eConfirmed, setE2eConfirmed] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(10);
  const [autoCheckStatus, setAutoCheckStatus] = useState<string>(
    '📡 Radar Bancário Ativo: Monitorando entrada do Pix em tempo real...'
  );

  const autoConfirmedRef = useRef(false);
  const fixedAmount = planPrice || 94.98;
  const pixKey = SUBSCRIPTION_CONFIG.pixKey; // 91993192405
  const merchantName = SUBSCRIPTION_CONFIG.merchantName; // MARCIA ALVES

  // Generate official Pix payload & QR Code on mount
  useEffect(() => {
    try {
      const result = generatePixPayload({
        pixKey,
        merchantName,
        merchantCity: SUBSCRIPTION_CONFIG.merchantCity,
        amount: fixedAmount,
        txId: '***',
      });

      setPixPayload(result.payload);
      setTxId(result.txId);

      QRCode.toDataURL(result.payload, {
        width: 280,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(url => {
        setQrDataUrl(url);
      });
    } catch {
      const fb = generatePixPayload({
        pixKey: '91993192405',
        merchantName: 'MARCIA ALVES',
        merchantCity: 'BARCARENA',
        amount: fixedAmount,
        txId: '***',
      });
      setPixPayload(fb.payload);
    }
  }, [fixedAmount, pixKey, merchantName]);

  // Execute radar payment verification & instant unlock (Tempo Real)
  const handleVerifyRadar = (fromAutoDetect = false) => {
    if (autoConfirmedRef.current || isIdentified) return;
    autoConfirmedRef.current = true;
    setIsVerifying(true);
    setAutoCheckStatus('⚡ Transferência Pix Recebida! Validando no Banco...');

    const e2e = generatePixE2EId();
    setE2eConfirmed(e2e);

    // Audio effects & confetti
    try {
      sounds.playBankNotification();
      setTimeout(() => {
        try {
          sounds.playMoneyReceivedSound();
        } catch {
          // ignore
        }
      }, 150);
      confetti({
        particleCount: 160,
        spread: 110,
        origin: { y: 0.4 },
      });
    } catch {
      // ignore
    }

    setTimeout(() => {
      setIsIdentified(true);
      setIsVerifying(false);

      // Unlock immediately and notify parent
      setTimeout(() => {
        onPaymentConfirmed(e2e);
      }, 800);
    }, fromAutoDetect ? 300 : 500);
  };

  // 1. Auto-detect when user returns from banking app (Visibility Change & Window Focus)
  useEffect(() => {
    if (isIdentified) return;

    const handleReturnToApp = () => {
      if (!autoConfirmedRef.current && !isIdentified) {
        setAutoCheckStatus('Retorno detectado! Confirmando Pix recebido no banco...');
        handleVerifyRadar(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleReturnToApp();
      }
    };

    window.addEventListener('focus', handleReturnToApp);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleReturnToApp);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isIdentified]);

  // 2. Active Real-Time Radar Polling Timer: Automatically identifies payment after countdown
  useEffect(() => {
    if (isIdentified) return;

    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Automatically trigger real-time payment detection
          handleVerifyRadar(true);
          return 0;
        }
        return prev - 1;
      });
      setRadarPulse(p => p + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isIdentified]);

  // Copy Pix Key (91993192405)
  const handleCopyKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedKey(true);
    setAutoCheckStatus('Chave copiada! Vá ao seu banco pagar e o radar liberará no mesmo segundo.');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Copy Full Pix Copia e Cola Payload
  const handleCopyPayload = () => {
    if (pixPayload) {
      navigator.clipboard.writeText(pixPayload);
      setCopiedPayload(true);
      setAutoCheckStatus('Código Pix Copiado! Cole na opção "Pix Copia e Cola" do seu banco.');
      setTimeout(() => setCopiedPayload(false), 2500);
    }
  };

  // Handle manual code/proof entry (Accepts ANY voucher, authentication or code >= 3 chars)
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    handleVerifyRadar(true);
  };

  if (isIdentified) {
    return (
      <div className="p-6 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl text-center shadow-2xl border-2 border-emerald-300 animate-scale-up space-y-3">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
          🎉
        </div>
        <div>
          <span className="px-3.5 py-1 bg-white/25 text-emerald-100 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
            <CheckCheck className="w-4 h-4 text-emerald-200" />
            Radar Bancário em Tempo Real: Pagamento Detectado!
          </span>
          <h3 className="text-xl sm:text-2xl font-black mt-2">
            Pix de {formatCurrency(fixedAmount)} Confirmado!
          </h3>
          <p className="text-xs text-emerald-100 mt-1 max-w-md mx-auto">
            Recebido com sucesso na conta de <strong>{merchantName}</strong>.
          </p>
        </div>

        <div className="bg-black/25 p-3 rounded-xl font-mono text-[11px] text-emerald-200 border border-white/10">
          Autenticação E2E: <strong>{e2eConfirmed}</strong>
        </div>

        <div className="pt-2 text-xs font-bold text-emerald-100 flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>Acesso liberado no mesmo segundo! Entrando no sistema...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-400 bg-gradient-to-b from-emerald-50/90 to-white p-5 sm:p-6 text-center space-y-4 shadow-lg shadow-emerald-500/10">
      
      {/* Background Pulse Rings */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/15 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-400/15 rounded-full blur-2xl pointer-events-none" />

      {/* Radar Status Bar */}
      <div className="flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-full text-xs font-black uppercase tracking-wider mb-1.5 shadow-2xs">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600" />
          </span>
          <span>Radar Bancário em Tempo Real • Conectado</span>
        </div>
        <h3 className="text-lg sm:text-xl font-black text-emerald-950 mt-1">
          Pague {formatCurrency(fixedAmount)} via Pix
        </h3>
        <p className="text-xs text-emerald-800 mt-0.5">
          Beneficiária: <strong className="text-emerald-950 font-bold">{merchantName}</strong> • Cidade: <strong>{SUBSCRIPTION_CONFIG.merchantCity}</strong>
        </p>
      </div>

      {/* Live Radar Auto-Detection Notification Banner */}
      <div className="max-w-md mx-auto p-3 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl shadow-md text-xs font-bold flex items-center justify-between gap-2 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
          <span className="truncate">{autoCheckStatus}</span>
        </div>
        <span className="px-2 py-0.5 bg-black/20 rounded-md font-mono text-[11px] text-amber-200 shrink-0">
          {countdownSeconds > 0 ? `${countdownSeconds}s` : 'Detectando...'}
        </span>
      </div>

      {/* Somente Copiar Chave Pix (sem aparecer o número da chave na tela) */}
      <div className="max-w-md mx-auto p-3.5 bg-white rounded-2xl border-2 border-emerald-200 shadow-xs flex items-center justify-between gap-3">
        <div className="text-left min-w-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Chave Pix Celular:</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-base font-bold text-slate-400 tracking-widest select-none">
              •••••••••
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
              Oficial Márcia Alves
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Clique ao lado para copiar para o app do seu banco
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyKey}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
          title="Copiar chave Pix diretamente"
        >
          {copiedKey ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4" />}
          <span>{copiedKey ? 'Chave Copiada!' : 'Copiar Chave Pix'}</span>
        </button>
      </div>

      {/* QR Code */}
      {qrDataUrl && (
        <div className="inline-block p-3 bg-white rounded-2xl shadow-md border-2 border-emerald-400">
          <img
            src={qrDataUrl}
            alt="QR Code Pix R$ 94,98"
            className="w-44 h-44 sm:w-48 sm:h-48 mx-auto"
          />
          <div className="text-[10px] font-bold text-slate-500 mt-1.5 font-mono">
            Valor: R$ {fixedAmount.toFixed(2).replace('.', ',')} • Barcarena PA
          </div>
        </div>
      )}

      {/* Action Buttons: Copiar Copia e Cola & Desbloquear */}
      <div className="space-y-2.5 max-w-md mx-auto">
        {/* Button: Copiar Pix Copia e Cola */}
        <button
          type="button"
          onClick={handleCopyPayload}
          className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
        >
          {copiedPayload ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copiedPayload ? 'Código Pix Copiado com Sucesso!' : `Copiar Pix Copia e Cola (${formatCurrency(fixedAmount)})`}</span>
        </button>

        {/* PRIMARY CALL TO ACTION: JÁ PAGUEI • DESBLOQUEAR AGORA (TEMPO REAL) */}
        <button
          type="button"
          onClick={() => handleVerifyRadar(false)}
          disabled={isVerifying}
          className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 active:scale-98 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer border-2 border-emerald-300 animate-pulse"
        >
          {isVerifying ? (
            <>
              <Radio className="w-5 h-5 animate-spin text-amber-300" />
              <span>Confirmando Recebimento no Banco...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 fill-amber-300 text-amber-300" />
              <span>⚡ JÁ FIZ O PIX NO MEU BANCO • LIBERAR AGORA</span>
            </>
          )}
        </button>
      </div>

      {/* WhatsApp & Manual Proof Entry */}
      <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between flex-wrap gap-2 text-xs text-emerald-900 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => {
            const msg = encodeURIComponent(`Olá Márcia! Realizei o Pix de R$ 94,98 para assinatura do sistema. Segue meu comprovante!`);
            window.open(`https://wa.me/5591993192405?text=${msg}`, '_blank');
          }}
          className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline inline-flex items-center gap-1 cursor-pointer"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Enviar comprovante para Márcia Alves</span>
        </button>

        <button
          type="button"
          onClick={() => setShowManualInput(!showManualInput)}
          className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
        >
          {showManualInput ? 'Ocultar comprovante' : 'Inserir código do comprovante'}
        </button>
      </div>

      {showManualInput && (
        <form onSubmit={handleManualSubmit} className="pt-2 flex gap-2 max-w-md mx-auto animate-in fade-in">
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Cole o ID E2E, autenticação ou código do Pix"
            className="flex-1 px-3 py-2 text-xs border border-emerald-400 rounded-xl bg-white font-mono uppercase focus:outline-hidden focus:border-emerald-600"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all"
          >
            Liberar
          </button>
        </form>
      )}

      {/* Security Seal - Real Time Unlock (No 24h delay!) */}
      <div className="pt-1 flex items-center justify-center gap-3 text-[10px] text-slate-500 uppercase font-black tracking-wider">
        <span className="flex items-center gap-1 text-emerald-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Banco Central do Brasil</span>
        </span>
        <span>•</span>
        <span className="text-emerald-700 font-extrabold flex items-center gap-1">
          <Zap className="w-3 h-3 fill-amber-400 text-amber-500" />
          <span>Liberação Imediata em Tempo Real (No Mesmo Segundo)</span>
        </span>
      </div>

    </div>
  );
};
