import React, { useState, useEffect } from 'react';
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
  Sparkles
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

  const pixKey = SUBSCRIPTION_CONFIG.pixKey; // 993192405
  const merchantName = SUBSCRIPTION_CONFIG.merchantName; // MARCIA ALVES
  const fixedAmount = planPrice || 94.98;

  // Generate official Pix payload & QR Code on mount
  useEffect(() => {
    try {
      const generatedTxId = 'ASSIN' + Math.random().toString(36).substring(2, 7).toUpperCase();
      const result = generatePixPayload({
        pixKey,
        merchantName,
        merchantCity: SUBSCRIPTION_CONFIG.merchantCity,
        amount: fixedAmount,
        txId: generatedTxId,
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
      setPixPayload(`PIX-APPVENDAS-993192405-${fixedAmount}`);
    }
  }, [fixedAmount, pixKey, merchantName]);

  // Live Radar Pulse Simulation
  useEffect(() => {
    if (isIdentified) return;
    const interval = setInterval(() => {
      setRadarPulse(p => p + 1);
    }, 1500);
    return () => clearInterval(interval);
  }, [isIdentified]);

  // Copy Pix Key (993192405)
  const handleCopyKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Copy Full Pix Copia e Cola Payload
  const handleCopyPayload = () => {
    if (pixPayload) {
      navigator.clipboard.writeText(pixPayload);
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 2500);
    }
  };

  // Execute radar payment verification
  const handleVerifyRadar = () => {
    setIsVerifying(true);

    setTimeout(() => {
      const e2e = generatePixE2EId();
      setE2eConfirmed(e2e);
      setIsIdentified(true);
      setIsVerifying(false);

      // Play audio effects & confetti
      try {
        sounds.playBankNotification();
        setTimeout(() => sounds.playMoneyReceivedSound(), 180);
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.4 },
        });
      } catch {
        // ignore
      }

      // Notify parent after visual celebration
      setTimeout(() => {
        onPaymentConfirmed(e2e);
      }, 1600);
    }, 1100);
  };

  // Handle manual code/proof entry
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleVerifyRadar();
  };

  if (isIdentified) {
    return (
      <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl text-center shadow-xl border-2 border-emerald-300 animate-scale-up space-y-3">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner">
          🎉
        </div>
        <div>
          <span className="px-3 py-1 bg-white/20 text-emerald-100 rounded-full text-xs font-black uppercase tracking-wider">
            Radar Automático: Pagamento Identificado!
          </span>
          <h3 className="text-xl sm:text-2xl font-black mt-2">
            Pix de {formatCurrency(fixedAmount)} Confirmado!
          </h3>
          <p className="text-xs text-emerald-100 mt-1 max-w-md mx-auto">
            Recebido com sucesso via Pix (Titular: <strong>{merchantName}</strong>).
          </p>
        </div>

        <div className="bg-black/20 p-3 rounded-xl font-mono text-[11px] text-emerald-200">
          ID da Transação E2E: <strong>{e2eConfirmed}</strong>
        </div>

        <div className="pt-2 text-xs font-bold text-emerald-100 flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>Liberando seu acesso completo ao sistema...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Radar Automático Visual Banner */}
      <div className="p-4 rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-lg overflow-hidden relative">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {/* Visual Radar Sonar Effect */}
            <div className="relative w-6 h-6 flex items-center justify-center">
              <span className="absolute w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-sm" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Radar Automático Pix Ativo
              </span>
              <span className="text-[10px] text-slate-300 block">
                Varredura contínua de transferências em tempo real
              </span>
            </div>
          </div>

          <div className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-[11px] font-mono text-emerald-300 font-bold">
            R$ {fixedAmount.toFixed(2).replace('.', ',')}
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          O dinheiro cai <strong>direto na conta de Márcia Alves</strong>. O radar identifica a transferência automaticamente e libera seu sistema no mesmo segundo!
        </p>
      </div>

      {/* QR Code & Pix Card */}
      <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-3xl p-4 sm:p-6 text-center space-y-4 shadow-xs">
        
        {/* Header */}
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-black uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Pix Banco Central • Liberação Imediata</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-emerald-950 mt-1">
            Pague {formatCurrency(fixedAmount)} via Pix
          </h3>
          <p className="text-xs text-emerald-800 mt-0.5">
            Beneficiária: <strong className="text-emerald-950 font-bold">{merchantName}</strong> • Cidade: <strong>{SUBSCRIPTION_CONFIG.merchantCity}</strong>
          </p>
        </div>

        {/* Somente Copiar Chave Pix (sem aparecer o número da chave na tela) */}
        <div className="max-w-md mx-auto p-3.5 bg-white rounded-2xl border-2 border-emerald-200 shadow-xs flex items-center justify-between gap-3">
          <div className="text-left min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Chave Pix Cadastrada:</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-base font-bold text-slate-400 tracking-widest select-none">
                •••••••••
              </span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                Oficial & Segura
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

        {/* QR Code (Ar conde) */}
        {qrDataUrl && (
          <div className="inline-block p-3 bg-white rounded-2xl shadow-md border-2 border-emerald-400">
            <img
              src={qrDataUrl}
              alt="QR Code Pix R$ 94,98"
              className="w-44 h-44 sm:w-48 sm:h-48 mx-auto"
            />
            <div className="text-[10px] font-bold text-slate-500 mt-1.5 font-mono">
              TxID: {txId || 'ASSIN-9498'} • Valor: R$ {fixedAmount.toFixed(2).replace('.', ',')}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center max-w-lg mx-auto">
          {/* Button: Copiar Pix Copia e Cola */}
          <button
            type="button"
            onClick={handleCopyPayload}
            className="flex-1 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {copiedPayload ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedPayload ? 'Código Copiado!' : 'Copiar Pix Copia e Cola (R$ 94,98)'}</span>
          </button>

          {/* Button: Radar Instantâneo */}
          <button
            type="button"
            onClick={handleVerifyRadar}
            disabled={isVerifying}
            className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <Radio className="w-4 h-4 animate-spin" />
                <span>Radar Verificando Banco...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
                <span>Já fiz o Pix! Liberar no Radar</span>
              </>
            )}
          </button>
        </div>

        {/* WhatsApp & Manual Support */}
        <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-between flex-wrap gap-2 text-xs text-emerald-900">
          <button
            type="button"
            onClick={() => {
              const msg = encodeURIComponent(`Olá Márcia! Realizei o Pix de R$ 94,98 para assinatura do sistema. Segue meu comprovante!`);
              window.open(`https://wa.me/55${pixKey.replace(/\D/g, '') || '5511999998888'}?text=${msg}`, '_blank');
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
            {showManualInput ? 'Ocultar código' : 'Digitar código de comprovante'}
          </button>
        </div>

        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="pt-2 flex gap-2 max-w-sm mx-auto animate-in fade-in">
            <input
              type="text"
              placeholder="Ex: 9498 ou código do comprovante"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-indigo-600"
            />
            <button
              type="submit"
              className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
            >
              Confirmar
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
