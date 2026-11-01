import React, { useState, useEffect } from 'react';
import { CompanyAccount, PaymentSettings, Product, SellerProfile } from '../../types';
import { copyTextToClipboard, buildStoreShareUrl, buildStoreShareMessage } from '../../utils/shareHelper';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Send, 
  QrCode, 
  ExternalLink, 
  Smartphone, 
  Store,
  Sparkles,
  MessageCircle,
  Link as LinkIcon
} from 'lucide-react';
import QRCode from 'qrcode';

interface ShareCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: CompanyAccount;
  paymentSettings?: PaymentSettings;
  activeSeller?: SellerProfile;
  products?: Product[];
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const ShareCompanyModal: React.FC<ShareCompanyModalProps> = ({
  isOpen,
  onClose,
  company,
  paymentSettings,
  activeSeller,
  products = [],
  onShowToast
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  const shareUrl = buildStoreShareUrl(company, paymentSettings, activeSeller, products);
  const shareMessage = buildStoreShareMessage(company, shareUrl, activeSeller);

  // Generate QR Code for scanning
  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 240,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
      .then(url => setQrCodeDataUrl(url))
      .catch(() => setQrCodeDataUrl(''));
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  // 1. Direct WhatsApp Share
  const handleShareToWhatsApp = () => {
    const encoded = encodeURIComponent(shareMessage);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
    onShowToast('success', 'WhatsApp Aberto!', 'Selecione seus clientes ou grupos para enviar o catálogo.');
  };

  // 2. Native Mobile Web Share API
  const handleNativeShare = async () => {
    const shareData = {
      title: `${company.name || 'Loja Virtual'} - Catálogo & Pedidos`,
      text: shareMessage,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        onShowToast('success', 'Compartilhado!', 'Catálogo enviado com sucesso.');
        return;
      } catch (err: any) {
        // If aborted by user, do nothing
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback: Copy Link
    handleCopyLink();
  };

  // 3. Copy Link with robust clipboard fallback
  const handleCopyLink = async () => {
    const success = await copyTextToClipboard(shareUrl);
    if (success) {
      setCopiedLink(true);
      onShowToast('success', 'Link Copiado!', 'Link do catálogo copiado. Envie para seus clientes!');
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      onShowToast('info', 'Link do Catálogo:', shareUrl);
    }
  };

  // 4. Copy Full Promotional Message
  const handleCopyMessage = async () => {
    const success = await copyTextToClipboard(shareMessage);
    if (success) {
      setCopiedMessage(true);
      onShowToast('success', 'Mensagem Copiada!', 'Texto completo de divulgação copiado para colar no WhatsApp ou redes!');
      setTimeout(() => setCopiedMessage(false), 2500);
    } else {
      onShowToast('info', 'Mensagem Pronta', 'Copie o texto acima.');
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl max-h-[92dvh] rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scale-up">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl shadow-inner shrink-0">
              {company.logoEmoji || '🏪'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white truncate">
                  Divulgar {company.name || 'Minha Empresa'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase">
                  Catálogo Online
                </span>
              </div>
              <p className="text-xs text-emerald-100 truncate mt-0.5">
                Compartilhe o link da sua loja para clientes comprarem no WhatsApp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-800">

          {/* Quick Primary Actions: WhatsApp & Mobile Share */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. Botão Enviar no WhatsApp */}
            <button
              type="button"
              onClick={handleShareToWhatsApp}
              className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Divulgar no WhatsApp</span>
            </button>

            {/* 2. Botão Compartilhar Geral (Celular / Redes) */}
            <button
              type="button"
              onClick={handleNativeShare}
              className="py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartilhar no Celular</span>
            </button>
          </div>

          {/* Link Box with One-Click Copy */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Link Direto da Loja para Clientes</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Acesso direto dos clientes</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 truncate select-all">
                {shareUrl}
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 active:scale-95 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>
          </div>

          {/* Promotional Text Preview Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Mensagem Pronta para Envio / Status</span>
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedMessage ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedMessage ? 'Mensagem Copiada!' : 'Copiar Texto Completo'}</span>
              </button>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-sans leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto">
              {shareMessage}
            </div>
          </div>

          {/* QR Code Section for Printing / Counter display */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
            {qrCodeDataUrl ? (
              <div className="p-2 bg-white rounded-2xl border border-slate-200 shadow-xs shrink-0">
                <img 
                  src={qrCodeDataUrl} 
                  alt="QR Code da Loja" 
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                />
              </div>
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-slate-200 flex items-center justify-center shrink-0">
                <QrCode className="w-8 h-8 text-slate-400" />
              </div>
            )}

            <div className="space-y-1 text-center sm:text-left min-w-0">
              <span className="text-xs font-black text-slate-900 block flex items-center justify-center sm:justify-start gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>QR Code para Balcão & Redes Sociais</span>
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Seus clientes podem apontar a câmera do celular para este código e abrir o catálogo da <strong>{company.name}</strong> instantaneamente.
              </p>
              {qrCodeDataUrl && (
                <div className="pt-1">
                  <a
                    href={qrCodeDataUrl}
                    download={`qrcode-loja-${(company.name || 'empresa').toLowerCase().replace(/\s+/g, '-')}.png`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    Baixar imagem do QR Code
                  </a>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Loja configurada para: <strong>{company.name}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
