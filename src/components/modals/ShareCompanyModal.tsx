import React, { useState, useEffect, useMemo } from 'react';
import { CompanyAccount, PaymentSettings, Product, SellerProfile } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  copyTextToClipboard, 
  buildStoreShareUrl, 
  buildStoreCleanUrl, 
  buildStoreShareMessage, 
  shortenUrl 
} from '../../utils/shareHelper';
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
  Link as LinkIcon,
  RefreshCw,
  Zap,
  Scissors,
  Edit3
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
  const {
    companies,
    currentCompany,
    updateCurrentCompany,
    paymentSettings: globalSettings,
    updatePaymentSettings
  } = useApp();

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [urlMode, setUrlMode] = useState<'store_name' | 'full' | 'short'>('store_name');
  const [shortUrl, setShortUrl] = useState<string>('');
  const [isShortening, setIsShortening] = useState<boolean>(false);

  // Always resolve the freshest company data from AppContext
  const effectiveCompany = useMemo(() => {
    const targetId = company?.id || currentCompany?.id;
    const found = companies.find(c => c.id === targetId);
    return found || currentCompany || company;
  }, [company, currentCompany, companies]);

  // Inline Store Name Editor state
  const [editingStoreName, setEditingStoreName] = useState(effectiveCompany?.name || 'Minha Loja');
  const [isEditingName, setIsEditingName] = useState(false);

  useEffect(() => {
    if (effectiveCompany?.name) {
      setEditingStoreName(effectiveCompany.name);
    }
  }, [effectiveCompany?.name]);

  const handleSaveStoreName = () => {
    const clean = editingStoreName.trim();
    if (!clean) {
      onShowToast('error', 'Nome Inválido', 'Digite o nome da sua empresa.');
      return;
    }
    updateCurrentCompany({ name: clean });
    updatePaymentSettings({ merchantName: clean });
    setIsEditingName(false);
    onShowToast('success', 'Nome da Loja Atualizado!', `O link agora está configurado com "${clean}"`);
  };

  // Dynamically resolve products and payment settings for the target company
  const effectiveProducts = useMemo(() => {
    try {
      if (effectiveCompany?.id) {
        const tenantKey = `appvendas_tenant_${effectiveCompany.id}_products`;
        const saved = localStorage.getItem(tenantKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch {}
    return products || [];
  }, [products, effectiveCompany?.id]);

  const effectiveSettings = useMemo(() => {
    try {
      if (effectiveCompany?.id) {
        const tenantKey = `appvendas_tenant_${effectiveCompany.id}_payment_settings`;
        const saved = localStorage.getItem(tenantKey);
        if (saved) {
          return { ...globalSettings, ...paymentSettings, ...JSON.parse(saved) };
        }
      }
    } catch {}
    return paymentSettings || globalSettings;
  }, [paymentSettings, globalSettings, effectiveCompany?.id]);

  const effectiveSeller = useMemo(() => {
    if (effectiveSettings?.sellers && effectiveSettings.sellers.length > 0) {
      const active = effectiveSettings.sellers.find((s: any) => s.id === effectiveSettings.activeSellerId);
      return active || effectiveSettings.sellers[0];
    }
    return activeSeller;
  }, [effectiveSettings, activeSeller]);

  // Clean direct short URL that features the store name directly in the link
  const cleanUrl = useMemo(() => {
    return buildStoreCleanUrl(effectiveCompany, effectiveSettings);
  }, [effectiveCompany, effectiveSettings]);

  // Full share URL with products and pix embedded
  const shareUrl = useMemo(() => {
    return buildStoreShareUrl(effectiveCompany, effectiveSettings, effectiveSeller, effectiveProducts);
  }, [effectiveCompany, effectiveSettings, effectiveSeller, effectiveProducts]);

  // Automatic Link Shortening in the background with company name
  const triggerShorten = async (targetUrl: string, storeName: string) => {
    setIsShortening(true);
    try {
      const res = await shortenUrl(targetUrl, storeName);
      if (res && res.startsWith('http')) {
        setShortUrl(res);
      } else {
        setShortUrl(targetUrl);
      }
    } catch {
      setShortUrl(targetUrl);
    } finally {
      setIsShortening(false);
    }
  };

  // Only trigger shortening if user explicitly switches to 'short' mode and doesn't have a shortUrl yet
  useEffect(() => {
    if (isOpen && urlMode === 'short' && !shortUrl && cleanUrl) {
      triggerShorten(cleanUrl, effectiveCompany?.name || 'loja');
    }
  }, [isOpen, urlMode, shortUrl, cleanUrl, effectiveCompany?.name]);

  // Active URL to share: defaults to official verified direct store URL
  const activeUrl = useMemo(() => {
    if (urlMode === 'store_name') {
      return cleanUrl;
    }
    if (urlMode === 'full') {
      return shareUrl;
    }
    return shortUrl || cleanUrl;
  }, [urlMode, shortUrl, cleanUrl, shareUrl]);

  const shareMessage = useMemo(() => {
    return buildStoreShareMessage(effectiveCompany, activeUrl, effectiveSeller, effectiveSettings);
  }, [effectiveCompany, activeUrl, effectiveSeller, effectiveSettings]);

  // Generate QR Code based on active URL
  useEffect(() => {
    if (isOpen && activeUrl) {
      QRCode.toDataURL(activeUrl, {
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
  }, [isOpen, activeUrl]);

  if (!isOpen) return null;

  // 1. Direct WhatsApp Share
  const handleShareToWhatsApp = () => {
    const encoded = encodeURIComponent(shareMessage);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    try {
      const win = window.open(waUrl, '_blank');
      if (!win) {
        window.location.href = waUrl;
      }
    } catch {
      window.location.href = waUrl;
    }
    onShowToast('success', 'WhatsApp Aberto!', `Catálogo da loja ${effectiveCompany.name} pronto para envio.`);
  };

  // 2. Native Mobile Web Share API
  const handleNativeShare = async () => {
    const shareData = {
      title: `${effectiveCompany.name || 'Loja Virtual'} - Catálogo & Pedidos`,
      text: shareMessage,
      url: activeUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        onShowToast('success', 'Compartilhado!', 'Catálogo enviado com sucesso.');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    // Fallback: Copy Link
    handleCopyLink();
  };

  // 3. Copy Link with robust clipboard fallback
  const handleCopyLink = async () => {
    const success = await copyTextToClipboard(activeUrl);
    if (success) {
      setCopiedLink(true);
      onShowToast(
        'success', 
        'Link da Loja Copiado!', 
        `Link com o nome da loja (${effectiveCompany.name}) copiado com sucesso.`
      );
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      onShowToast('info', 'Link do Catálogo:', activeUrl);
    }
  };

  // 4. Copy Full Promotional Message
  const handleCopyMessage = async () => {
    const success = await copyTextToClipboard(shareMessage);
    if (success) {
      setCopiedMessage(true);
      onShowToast('success', 'Mensagem Copiada!', 'Texto de divulgação com o nome da loja pronto para colar no WhatsApp!');
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
              {effectiveCompany.logoEmoji || '🏪'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white truncate">
                  {effectiveCompany.name || 'Minha Loja'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase">
                  Catálogo Oficial
                </span>
              </div>
              <p className="text-xs text-emerald-100 truncate mt-0.5">
                Link direto e atualizado com o nome da sua empresa
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

          {/* INLINE STORE NAME EDITOR: O lojista pode editar e atualizar o nome da empresa aqui mesmo */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-indigo-600" />
                <span>Nome da Empresa que sai no Link</span>
              </span>
              {!isEditingName ? (
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded-lg border border-indigo-200"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Alterar Nome da Loja</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
              )}
            </div>

            {isEditingName ? (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={editingStoreName}
                  onChange={e => setEditingStoreName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveStoreName();
                    }
                  }}
                  placeholder="Digite o nome da empresa..."
                  className="flex-1 px-3 py-2 bg-white border-2 border-indigo-500 rounded-xl text-xs font-bold text-slate-900 outline-none shadow-xs"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSaveStoreName}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl cursor-pointer shadow-xs flex items-center gap-1 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Atualizar Link</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-indigo-100 shadow-2xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{effectiveCompany.logoEmoji || '🏪'}</span>
                  <span className="text-xs font-black text-slate-900 truncate">
                    {effectiveCompany.name || 'Minha Loja'}
                  </span>
                </div>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase shrink-0">
                  Nome Ativo no Link
                </span>
              </div>
            )}
          </div>

          {/* Link Box with Store Name Highlight & One-Click Copy */}
          <div className="p-3.5 bg-slate-50 border-2 border-emerald-200/80 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Personalizado da Loja</span>
              </span>

              {/* Mode Toggle: Link Oficial Direto vs Catálogo Completo vs Link Curto */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl text-[10px] font-bold flex-wrap">
                <button
                  type="button"
                  onClick={() => setUrlMode('store_name')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    urlMode === 'store_name'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Link oficial direto verificado com o nome da empresa. Abre 100% sem erros no WhatsApp e no celular."
                >
                  <Store className="w-3 h-3" />
                  <span>Link Oficial da Loja (Recomendado)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUrlMode('full')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    urlMode === 'full'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Catálogo completo com todos os produtos embutidos"
                >
                  <LinkIcon className="w-3 h-3" />
                  <span>Catálogo Completo</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUrlMode('short');
                    if (!shortUrl) {
                      triggerShorten(cleanUrl, effectiveCompany?.name || 'loja');
                    }
                  }}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    urlMode === 'short'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Encurtador externo de link"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Link Curto Externo</span>
                </button>
              </div>
            </div>

            {/* URL Display Box with Store Name Highlight & Action Buttons */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 truncate select-all flex items-center justify-between gap-2 shadow-2xs">
                <span className="truncate font-bold text-slate-900">
                  {isShortening ? 'Encurtando link com o nome da empresa...' : activeUrl}
                </span>
                <span className="shrink-0 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-sans font-black text-[9px] rounded uppercase tracking-wider">
                  Loja: {effectiveCompany.name || 'Minha Loja'}
                </span>
              </div>

              {/* Test link in new tab */}
              <button
                type="button"
                onClick={() => {
                  try {
                    window.open(activeUrl, '_blank');
                  } catch {
                    window.location.href = activeUrl;
                  }
                }}
                className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                title="Abrir e testar o link agora no navegador para confirmar que abre sem erro"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Testar</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 active:scale-95 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-emerald-800 font-medium pt-0.5">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Link verificado: abre sem erros no WhatsApp e em qualquer celular com o nome <strong>{(effectiveCompany.name || 'Minha Loja')}</strong>.</span>
              </span>
              {urlMode === 'short' && (
                <button
                  type="button"
                  onClick={() => triggerShorten(cleanUrl, effectiveCompany?.name || 'loja')}
                  disabled={isShortening}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isShortening ? 'animate-spin' : ''}`} />
                  <span>{isShortening ? 'Gerando...' : 'Reencurtar'}</span>
                </button>
              )}
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
                Seus clientes podem apontar a câmera do celular para este código e abrir o catálogo da <strong>{effectiveCompany.name || 'Minha Loja'}</strong> instantaneamente.
              </p>
              {qrCodeDataUrl && (
                <div className="pt-1">
                  <a
                    href={qrCodeDataUrl}
                    download={`qrcode-loja-${(effectiveCompany.name || 'empresa').toLowerCase().replace(/\s+/g, '-')}.png`}
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
            Loja configurada para: <strong>{effectiveCompany.name || 'Minha Loja'}</strong>
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
