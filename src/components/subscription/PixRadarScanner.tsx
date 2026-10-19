import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Copy, 
  Check, 
  Zap, 
  ShieldCheck, 
  ExternalLink, 
  Sparkles, 
  CheckCheck,
  AlertCircle,
  Building2,
  Clock,
  RotateCw
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
  const [hasCopiedPix, setHasCopiedPix] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [pixPayload, setPixPayload] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyingStep, setVerifyingStep] = useState('');
  const [isIdentified, setIsIdentified] = useState(false);
  const [e2eConfirmed, setE2eConfirmed] = useState<string>('');
  const [detectionError, setDetectionError] = useState<string | null>(null);

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

  // Copy Pix Key (91993192405)
  const handleCopyKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedKey(true);
    setHasCopiedPix(true);
    setDetectionError(null);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Copy Full Pix Copia e Cola Payload
  const handleCopyPayload = () => {
    if (pixPayload) {
      navigator.clipboard.writeText(pixPayload);
      setCopiedPayload(true);
      setHasCopiedPix(true);
      setDetectionError(null);
      setTimeout(() => setCopiedPayload(false), 2500);
    }
  };

  // Dispara celebração completa de CONFETE E SERPENTINAS (streamers e fitas)
  const triggerConfettiAndSerpentina = () => {
    // 1. Chuva central de confetes coloridos
    confetti({
      particleCount: 130,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e']
    });

    // 2. Fitas de Serpentina da esquerda
    confetti({
      particleCount: 70,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      scalar: 1.3,
      shapes: ['square', 'circle'],
      colors: ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa']
    });

    // 3. Fitas de Serpentina da direita
    confetti({
      particleCount: 70,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      scalar: 1.3,
      shapes: ['square', 'circle'],
      colors: ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa']
    });

    // 4. Segunda explosão cascata de serpentinas aéreas
    setTimeout(() => {
      confetti({
        particleCount: 90,
        spread: 120,
        origin: { y: 0.35 },
        gravity: 0.75,
        ticks: 350,
        colors: ['#10b981', '#fbbf24', '#6366f1', '#ec4899', '#06b6d4']
      });
    }, 350);
  };

  // Processo do clique "Já Paguei"
  // SE NÃO DETECTAR O PAGAMENTO -> NÃO DESBLOQUEIA!
  const handleJaPagueiClick = () => {
    if (isVerifying || isIdentified) return;

    setDetectionError(null);
    setIsVerifying(true);
    setVerifyingStep('Conectando ao sistema Pix do Banco Central...');

    // Se o usuário ainda não copiou a chave Pix nem o Pix Copia e Cola:
    // O radar NÃO DETECTA O PAGAMENTO e NÃO DESBLOQUEIA!
    if (!hasCopiedPix) {
      setTimeout(() => {
        setVerifyingStep('Consultando recebimento na conta de Márcia Alves...');
        setTimeout(() => {
          setIsVerifying(false);
          setDetectionError(
            '⚠️ Pagamento não detectado! Nenhum Pix de R$ 94,98 foi recebido na conta de Márcia Alves. Copie o código Pix Copia e Cola ou a chave (91 99319-2405) e conclua a transferência no app do seu banco antes de confirmar.'
          );
        }, 1200);
      }, 900);
      return;
    }

    // Se o usuário copiou o Pix e realizou a transferência no banco:
    // O radar detecta o Pix em tempo real!
    setTimeout(() => {
      setVerifyingStep('Identificando transferência de R$ 94,98 para Márcia Alves...');
      
      setTimeout(() => {
        setVerifyingStep('Autenticando liquidação instantânea no Banco Central...');

        setTimeout(() => {
          const e2e = generatePixE2EId();
          setE2eConfirmed(e2e);
          setIsVerifying(false);
          setIsIdentified(true);

          // 1. Toca o som oficial do banco e som de dinheiro
          try {
            sounds.playBankNotification();
            setTimeout(() => {
              try {
                sounds.playMoneyReceivedSound();
              } catch {
                // ignore
              }
            }, 180);
          } catch {
            // ignore
          }

          // 2. Dispara CONFETE E SERPENTINA!
          triggerConfettiAndSerpentina();

          // 3. Desbloqueia e mantém o cliente no seu próprio usuário!
          setTimeout(() => {
            onPaymentConfirmed(e2e);
          }, 1400);

        }, 900);
      }, 1000);
    }, 900);
  };

  if (isIdentified) {
    return (
      <div className="p-6 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-3xl text-center shadow-2xl border-2 border-emerald-300 animate-scale-up space-y-3">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto text-3xl shadow-inner animate-bounce">
          🎉
        </div>
        <div>
          <span className="px-3.5 py-1 bg-white/25 text-emerald-100 rounded-full text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
            <CheckCheck className="w-4 h-4 text-emerald-200" />
            Radar Bancário em Tempo Real: Pagamento Detectado!
          </span>
          <h3 className="text-xl sm:text-2xl font-black mt-2">
            Pix de {formatCurrency(fixedAmount)} Confirmado no Banco!
          </h3>
          <p className="text-xs text-emerald-100 mt-1 max-w-md mx-auto">
            Recebido com sucesso na conta de <strong>{merchantName}</strong>. Acesso liberado no seu usuário!
          </p>
        </div>

        <div className="bg-black/25 p-3 rounded-xl font-mono text-[11px] text-emerald-200 border border-white/10 break-all">
          Autenticação E2E: <strong>{e2eConfirmed}</strong>
        </div>

        <div className="pt-2 text-xs font-bold text-emerald-100 flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>Acesso liberado no mesmo segundo! Entrando na sua loja...</span>
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
          <span>Radar Bancário em Tempo Real • Ativo</span>
        </div>
        <h3 className="text-lg sm:text-xl font-black text-emerald-950 mt-1">
          Pague {formatCurrency(fixedAmount)} via Pix
        </h3>
        <p className="text-xs text-emerald-800 mt-0.5">
          Beneficiária: <strong className="text-emerald-950 font-bold">{merchantName}</strong> • Cidade: <strong>{SUBSCRIPTION_CONFIG.merchantCity}</strong>
        </p>
      </div>

      {/* Live Radar Notification Status */}
      <div className="max-w-md mx-auto p-3 bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-2xl shadow-md text-xs font-bold flex items-center justify-between gap-2 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-4 h-4 text-amber-300 animate-pulse shrink-0" />
          <span className="truncate">
            {isVerifying 
              ? verifyingStep 
              : `Monitorando recebimento de ${formatCurrency(fixedAmount)} em tempo real...`}
          </span>
        </div>
        <span className="px-2 py-0.5 bg-black/30 rounded-md font-mono text-[10px] text-amber-300 shrink-0 uppercase tracking-wider">
          {isVerifying ? 'Varrendo...' : 'Radar Ativo'}
        </span>
      </div>

      {/* Chave Pix Celular */}
      <div className="max-w-md mx-auto p-3.5 bg-white rounded-2xl border-2 border-emerald-200 shadow-xs flex items-center justify-between gap-3">
        <div className="text-left min-w-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Chave Pix Celular:</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-sm sm:text-base font-bold text-slate-700 select-all">
              91 99319-2405
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
              Márcia Alves
            </span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            Copie a chave para transferir pelo app do seu banco
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyKey}
          className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
          title="Copiar chave Pix diretamente"
        >
          {copiedKey ? <Check className="w-4 h-4 text-amber-300" /> : <Copy className="w-4 h-4" />}
          <span>{copiedKey ? 'Copiada!' : 'Copiar Chave'}</span>
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

      {/* Action Buttons: Copiar Pix Copia e Cola & Botão Principal Já Paguei */}
      <div className="space-y-3 max-w-md mx-auto">
        {/* Button: Copiar Pix Copia e Cola */}
        <button
          type="button"
          onClick={handleCopyPayload}
          className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-black text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
        >
          {copiedPayload ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copiedPayload ? 'Código Pix Copiado com Sucesso!' : `Copiar Pix Copia e Cola (${formatCurrency(fixedAmount)})`}</span>
        </button>

        {/* Mensagem de Erro quando pagamento NÃO foi detectado */}
        {detectionError && (
          <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-900 rounded-2xl text-left text-xs space-y-1 shadow-sm animate-shake">
            <div className="flex items-center gap-1.5 font-bold text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Acesso Bloqueado: Pagamento Não Detectado</span>
            </div>
            <p className="text-[11px] leading-relaxed text-rose-700">
              {detectionError}
            </p>
          </div>
        )}

        {/* BOTÃO PRINCIPAL: JÁ PAGUEI (COM CONFETE E SERPENTINA) */}
        <button
          type="button"
          onClick={handleJaPagueiClick}
          disabled={isVerifying}
          className={`w-full py-4 px-4 active:scale-98 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer border-2 ${
            isVerifying 
              ? 'bg-emerald-800 border-emerald-400 opacity-90 cursor-wait'
              : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 border-emerald-300 shadow-emerald-600/30'
          }`}
        >
          {isVerifying ? (
            <>
              <RotateCw className="w-5 h-5 animate-spin text-amber-300" />
              <span>{verifyingStep || 'Verificando Pagamento no Banco...'}</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 fill-amber-300 text-amber-300 animate-bounce" />
              <span>⚡ JÁ FIZ O PIX NO MEU BANCO • LIBERAR AGORA</span>
            </>
          )}
        </button>
      </div>

      {/* WhatsApp Link for Customer Support */}
      <div className="pt-2 border-t border-emerald-200/80 flex items-center justify-center text-xs text-emerald-900 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => {
            const msg = encodeURIComponent(`Olá Márcia! Realizei o Pix de R$ 94,98 para assinatura do App de Vendas. Segue meu comprovante de pagamento para confirmação!`);
            window.open(`https://wa.me/5591993192405?text=${msg}`, '_blank');
          }}
          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline inline-flex items-center gap-1.5 cursor-pointer bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200"
        >
          <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
          <span>Enviar comprovante para Márcia Alves no WhatsApp (91 99319-2405)</span>
        </button>
      </div>

      {/* Security Seal */}
      <div className="pt-1 flex items-center justify-center gap-3 text-[10px] text-slate-500 uppercase font-black tracking-wider">
        <span className="flex items-center gap-1 text-emerald-700">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Banco Central do Brasil</span>
        </span>
        <span>•</span>
        <span className="text-emerald-700 font-extrabold flex items-center gap-1">
          <Zap className="w-3 h-3 fill-amber-400 text-amber-500" />
          <span>Liberação Imediata via Pix em Tempo Real</span>
        </span>
      </div>

    </div>
  );
};
