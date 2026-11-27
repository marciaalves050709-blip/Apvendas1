import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Smartphone, 
  DownloadCloud, 
  Share, 
  CheckCircle2, 
  Zap, 
  ShieldCheck,
  WifiOff,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Building2,
  Phone,
  AlertTriangle
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { useApp, getTenantKey } from '../../context/AppContext';
import { CompanyAccount, PaymentSettings, Product, SellerProfile } from '../../types';
import {
  buildStoreCleanUrl,
  buildStoreShareUrl,
  collectCompanyPhones,
  copyTextToClipboard,
  getPublicShareOrigin,
  normalizePhoneDigits,
  normalizeStoreSlugShared,
  shortenUrl,
  syncStoreToServer
} from '../../utils/shareHelper';
import confetti from 'canvas-confetti';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    iosBrowser,
    isAndroid, 
    isIframe, 
    isInAppBrowser, 
    install,
    openDirectInstallInBrowser 
  } = usePWAInstall();

  const { companies, currentCompany, paymentSettings, activeSeller, products, showToast } = useApp();

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(currentCompany?.id || 'empresa_principal');
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [companyStoreUrl, setCompanyStoreUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [installFeedback, setInstallFeedback] = useState<string>('');
  const [isTriggering, setIsTriggering] = useState(false);

  // Sync default selected company when modal opens
  useEffect(() => {
    if (isOpen && currentCompany?.id) {
      setSelectedCompanyId(currentCompany.id);
      setInstallFeedback('');
    }
  }, [isOpen, currentCompany?.id]);

  // Resolve target company, products, settings & sellers (supports multi-tenant isolation)
  const targetCompany: CompanyAccount = useMemo(() => {
    const found = (companies || []).find(c => c.id === selectedCompanyId);
    return found || currentCompany;
  }, [companies, selectedCompanyId, currentCompany]);

  const targetSettings: PaymentSettings = useMemo(() => {
    if (!targetCompany || targetCompany.id === currentCompany?.id) {
      return paymentSettings;
    }
    try {
      const saved = localStorage.getItem(getTenantKey('payment_settings', targetCompany.id));
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      ...paymentSettings,
      merchantName: targetCompany.name,
      merchantWhatsapp: targetCompany.phone || '',
      sellers: []
    };
  }, [targetCompany, currentCompany?.id, paymentSettings]);

  const targetProducts: Product[] = useMemo(() => {
    if (!targetCompany || targetCompany.id === currentCompany?.id) {
      return products || [];
    }
    try {
      const saved = localStorage.getItem(getTenantKey('products', targetCompany.id));
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  }, [targetCompany, currentCompany?.id, products]);

  const targetChannels = useMemo(() => {
    return collectCompanyPhones(targetCompany, targetSettings, targetCompany.id === currentCompany?.id ? activeSeller : null);
  }, [targetCompany, targetSettings, currentCompany?.id, activeSeller]);

  useEffect(() => {
    if (targetChannels.length > 0) {
      const stillExists = targetChannels.some(c => normalizePhoneDigits(c.phone) === normalizePhoneDigits(selectedPhone));
      if (!stillExists) {
        const active = targetChannels.find(c => c.isActive) || targetChannels[0];
        setSelectedPhone(active.phone);
      }
    } else {
      setSelectedPhone('');
    }
  }, [targetChannels, selectedPhone]);

  const selectedChannel = useMemo(() => {
    if (targetChannels.length === 0) return null;
    return targetChannels.find(c => normalizePhoneDigits(c.phone) === normalizePhoneDigits(selectedPhone)) || targetChannels[0];
  }, [targetChannels, selectedPhone]);

  const targetSeller: SellerProfile | undefined = useMemo(() => {
    if (selectedChannel?.sellerId && Array.isArray(targetSettings?.sellers)) {
      const found = targetSettings.sellers.find(s => s.id === selectedChannel.sellerId);
      if (found) return found;
    }
    if (targetCompany?.id === currentCompany?.id && activeSeller) {
      return activeSeller;
    }
    if (selectedChannel) {
      return {
        id: selectedChannel.channelKey,
        name: selectedChannel.label,
        whatsapp: selectedChannel.phone,
        pixKey: targetSettings?.pixKey || '',
        pixKeyType: targetSettings?.pixKeyType || 'PHONE',
        merchantName: targetCompany?.name || 'Loja',
        merchantCity: targetSettings?.merchantCity || 'Barcarena PA',
        receivingBank: targetSettings?.receivingBank || 'NUBANK',
        isDefault: true
      };
    }
    return undefined;
  }, [selectedChannel, targetSettings, targetCompany, currentCompany?.id, activeSeller]);

  const targetSlug = useMemo(
    () => normalizeStoreSlugShared(targetCompany?.slug || targetCompany?.name),
    [targetCompany?.slug, targetCompany?.name]
  );

  // Clean URL per company + linked channel for external sharing (public origin, NEVER exposes phone numbers)
  const directInstallPageUrl = useMemo(() => {
    const origin = getPublicShareOrigin();
    const canalQuery = selectedChannel?.channelKey ? `?canal=${encodeURIComponent(selectedChannel.channelKey)}` : '';
    return `${origin}/loja/${encodeURIComponent(targetSlug)}${canalQuery}`;
  }, [targetSlug, selectedChannel?.channelKey]);

  // Device-local install URL (uses active browser origin so newly created companies/products & Safari/iOS Web Clips always hit the live backend)
  const deviceInstallPageUrl = useMemo(() => {
    const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : getPublicShareOrigin();
    const canalQuery = selectedChannel?.channelKey ? `?canal=${encodeURIComponent(selectedChannel.channelKey)}` : '';
    return `${origin}/loja/${encodeURIComponent(targetSlug)}${canalQuery}`;
  }, [targetSlug, selectedChannel?.channelKey]);

  const deviceInstallActionUrl = useMemo(() => {
    return `${deviceInstallPageUrl}${deviceInstallPageUrl.includes('?') ? '&' : '?'}install=1`;
  }, [deviceInstallPageUrl]);

  const cleanCompanyStoreUrl = useMemo(
    () => buildStoreCleanUrl(targetCompany, targetSettings),
    [targetCompany, targetSettings]
  );

  const fullStoreShareUrl = useMemo(
    () => buildStoreShareUrl(targetCompany, targetSettings, targetSeller, targetProducts, selectedChannel?.phone),
    [targetCompany, targetSettings, targetSeller, targetProducts, selectedChannel?.phone]
  );

  // Sync manifest & server store snapshot whenever modal opens or company/channel selection changes
  useEffect(() => {
    if (!isOpen || !targetCompany) return;
    let cancelled = false;
    setCompanyStoreUrl(directInstallPageUrl || cleanCompanyStoreUrl);

    // Update <link rel="manifest"> dynamically so browser picks up this exact company & channel manifest
    if (typeof document !== 'undefined') {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      const isGeneric = ['Minha Loja', 'Minha Empresa', 'appvendas'].includes((targetCompany.name || '').trim());
      if (manifestLink && !isGeneric && targetSlug) {
        const canalSuffix = selectedChannel?.channelKey ? `&canal=${encodeURIComponent(selectedChannel.channelKey)}` : '';
        manifestLink.setAttribute(
          'href',
          `/manifest.webmanifest?slug=${encodeURIComponent(targetSlug)}&nome=${encodeURIComponent(targetCompany.name)}${canalSuffix}`
        );
      }
      const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appleTitle && !isGeneric && targetCompany.name) {
        appleTitle.setAttribute('content', targetCompany.name.trim().slice(0, 12));
      }
    }

    syncStoreToServer(targetCompany, targetSettings, targetSeller, targetProducts, { setAsActive: false }).catch(() => {});

    shortenUrl(fullStoreShareUrl, targetCompany?.name || 'loja', {
      company: targetCompany,
      paymentSettings: targetSettings,
      activeSeller: targetSeller,
      products: targetProducts,
      zap: selectedChannel?.phone || targetSeller?.whatsapp || targetSettings?.merchantWhatsapp || targetCompany?.phone
    }).then((short) => {
      if (!cancelled && short && !short.includes('?p=')) {
        setCompanyStoreUrl(short);
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [
    isOpen,
    targetCompany,
    targetSettings,
    targetSeller,
    targetProducts,
    targetSlug,
    selectedChannel?.channelKey,
    selectedChannel?.phone,
    directInstallPageUrl,
    cleanCompanyStoreUrl,
    fullStoreShareUrl
  ]);

  useEffect(() => {
    if (!isOpen || !companyStoreUrl) return;
    try {
      QRCode.toDataURL(companyStoreUrl, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(setQrCodeUrl);
    } catch {
      // ignore
    }
  }, [isOpen, companyStoreUrl]);

  if (!isOpen) return null;

  const displayBrandName = (targetCompany?.name && targetCompany.name !== 'Minha Loja' && targetCompany.name !== 'appvendas')
    ? targetCompany.name
    : 'Catálogo Oficial';

  const handleCopyLink = async () => {
    const ok = await copyTextToClipboard(companyStoreUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const currentPathMatchesCompany =
    typeof window !== 'undefined' &&
    window.location.pathname.toLowerCase().includes(`/loja/${targetSlug.toLowerCase()}`);
  const currentSearch = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const currentCanal = currentSearch?.get('canal') || '';
  const targetCanal = selectedChannel?.channelKey || '';
  const sameCompanyAndChannel = currentPathMatchesCompany && (!targetCanal || currentCanal === targetCanal);
  const needsPagePreparationOnIOS = isIframe || isInAppBrowser || iosBrowser === 'firefox' || !sameCompanyAndChannel;

  const triggerSyncBackground = () => {
    void syncStoreToServer(targetCompany, targetSettings, targetSeller, targetProducts, { setAsActive: false });
  };

  const handleDirectInstall = async () => {
    setIsTriggering(true);
    setInstallFeedback('');
    setTimeout(() => setIsTriggering(false), 400);

    try {
      // Fire store sync in background WITHOUT awaiting before window.open so Safari/mobile popup blocker never blocks the tap!
      triggerSyncBackground();

      // Inside AI Studio preview iframe or installing a different company/channel -> open its own dedicated tab synchronously
      if (isIframe || !sameCompanyAndChannel) {
        const opened = openDirectInstallInBrowser(deviceInstallPageUrl);
        if (opened) {
          setInstallFeedback(`Abrimos a página oficial de "${displayBrandName}" em uma nova aba. Toque em "Instalar Aplicativo Agora" ou nos 3 pontinhos (⋮) -> "Instalar aplicativo" para criar o ícone exclusivo!`);
          showToast('success', 'Abrindo Instalador da Empresa', `Instalador de "${displayBrandName}" aberto em nova aba.`);
          return;
        }
      }

      const res = await install(deviceInstallPageUrl);
      if (res.success && (res.action === 'prompt' || res.action === 'android_intent')) {
        try {
          confetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.6 }
          });
        } catch {}
        onClose();
        return;
      }

      // Browser throttled native prompt -> guide user clearly instead of silent no-op
      setInstallFeedback(
        isAndroid
          ? 'No Chrome do celular, toque nos 3 pontinhos (⋮) no canto superior direito e escolha "Instalar aplicativo" ou "Adicionar à tela inicial".'
          : 'Clique no ícone de instalação na barra de endereços do navegador (canto superior direito) ou em "Abrir Página de Instalação em Nova Aba" para instalar.'
      );
    } catch {
      setInstallFeedback('Use o botão "Abrir Página de Instalação em Nova Aba" ou toque nos 3 pontinhos (⋮) do navegador -> "Instalar aplicativo".');
    }
  };

  const handleOpenBrowserTab = () => {
    triggerSyncBackground();
    const opened = openDirectInstallInBrowser(deviceInstallPageUrl);
    if (!opened && typeof window !== 'undefined') {
      window.location.href = deviceInstallActionUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-scale-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-indigo-950 to-slate-950 text-white p-5 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-lg border border-emerald-400/40 shrink-0 flex items-center justify-center">
              <img src="/apple-touch-icon.png" alt={displayBrandName} className="w-full h-full object-cover rounded-xl" />
            </div>
            <div className="min-w-0 pr-6">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase rounded tracking-wider mb-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>{isIOS ? 'iPhone / iOS' : 'App Exclusivo da Loja'}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight truncate">
                Instalar {targetCompany?.logoEmoji || '🏪'} {displayBrandName}
              </h2>
              <p className="text-xs text-indigo-200 truncate">
                {selectedChannel ? `Canal: ${selectedChannel.label} (Protegido)` : 'Ícone próprio na tela inicial do celular'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-3.5 text-slate-800 max-h-[82dvh] overflow-y-auto">
          
          {/* Company & Linked Channel Picker (ZERO phone digits visible!) */}
          {(companies.length > 1 || targetChannels.length > 0) && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
              {companies.length > 0 && (
                <div>
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Empresa para Instalar</span>
                  </label>
                  <select
                    value={targetCompany?.id || ''}
                    onChange={(e) => {
                      setSelectedCompanyId(e.target.value);
                      setInstallFeedback('');
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.logoEmoji || '🏪'} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetChannels.length > 0 && (
                <div>
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Telefone / Atendente Vinculado ({targetChannels.length})</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {targetChannels.map((ch, idx) => {
                      const active = normalizePhoneDigits(ch.phone) === normalizePhoneDigits(selectedChannel?.phone);
                      return (
                        <button
                          key={ch.channelKey}
                          type="button"
                          onClick={() => {
                            setSelectedPhone(ch.phone);
                            setInstallFeedback('');
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            active
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-emerald-50'
                          }`}
                        >
                          <span>Canal {idx + 1}: {ch.label}</span>
                          <span className={`text-[9px] ${active ? 'text-emerald-100' : 'text-slate-400'}`}>• Oculto</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback alert when browser requires manual menu step or opened new tab */}
          {installFeedback && (
            <div className="p-3 bg-indigo-50 border-2 border-indigo-300 rounded-2xl text-xs text-indigo-950 font-semibold leading-relaxed animate-scale-up">
              {installFeedback}
            </div>
          )}

          {/* Main Action Callout */}
          {isInstalled ? (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-center space-y-2.5">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-black text-emerald-950">Modo Aplicativo Ativo!</h3>
              <p className="text-xs text-emerald-800">
                Você já está usando o aplicativo instalado. Para instalar outra empresa ou canal separadamente no {isIOS ? 'iPhone (Safari)' : 'navegador'}:
              </p>
              <a
                href={deviceInstallActionUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={triggerSyncBackground}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Instalar "{displayBrandName}" no {isIOS ? 'Safari' : 'Navegador'}</span>
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 1. Android Flow */}
              {isAndroid ? (
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={isTriggering}
                    onClick={handleDirectInstall}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-70"
                  >
                    <DownloadCloud className="w-5 h-5 text-emerald-200" />
                    <span>Instalar {displayBrandName} Agora</span>
                  </button>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                    <span className="font-black text-slate-900 block text-xs">
                      Ou instale pelo navegador em 3 passos:
                    </span>
                    <div className="space-y-1.5 text-slate-700 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                        <span>Toque nos <strong>3 pontinhos ⋮</strong> no canto superior direito do Chrome.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                        <span>Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                        <span>Confirme em <strong>"Instalar"</strong>. O ícone da loja aparecerá no celular!</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isIOS ? (
                /* 2. iOS Safari & Chrome iOS Flow */
                <div className="space-y-3">
                  {(isInAppBrowser || iosBrowser === 'firefox') && (
                    <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-amber-950 text-xs space-y-2.5 text-left">
                      <div className="flex items-center gap-2 font-black text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Abra no Safari para instalar no iPhone</span>
                      </div>
                      <p className="text-[11px] text-amber-900 leading-relaxed">
                        Dentro do WhatsApp, Instagram, Google ou Firefox no iPhone a Apple não permite adicionar à Tela de Início. Abra a loja de <strong>"{displayBrandName}"</strong> diretamente no Safari:
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <a
                          href={`x-safari-${deviceInstallActionUrl}`}
                          onClick={triggerSyncBackground}
                          className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Abrir Direto no Safari (iPhone)</span>
                        </a>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedLink ? 'Link Copiado! Cole no Safari' : 'Copiar Link para colar no Safari'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {needsPagePreparationOnIOS && !isInAppBrowser && iosBrowser !== 'firefox' && (
                    <div className="p-3.5 bg-blue-50 border-2 border-blue-300 rounded-2xl text-blue-950 text-xs space-y-2 text-left">
                      <div className="flex items-center gap-2 font-black text-blue-900">
                        <Smartphone className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          {isIframe
                            ? 'Passo Obrigatório: Sair do Painel para o Safari'
                            : `Preparar Página Exclusiva de "${displayBrandName}"`}
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-900 leading-relaxed">
                        No iPhone, o ícone da tela inicial grava exatamente a página aberta na barra do navegador. Toque abaixo para abrir a página oficial desta empresa e canal antes de adicionar:
                      </p>
                      <a
                        href={deviceInstallActionUrl}
                        target={isIframe ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        onClick={triggerSyncBackground}
                        className="w-full py-3 px-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>1. Abrir Página de "{displayBrandName}" no iPhone</span>
                      </a>
                    </div>
                  )}

                  <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900 text-white rounded-2xl shadow-md text-center space-y-1.5 border-2 border-blue-400">
                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mx-auto text-white shadow-inner">
                      <Share className="w-5 h-5 text-white stroke-[2.5]" />
                    </div>
                    <h4 className="font-black text-sm text-white">
                      {iosBrowser === 'chrome' || iosBrowser === 'edge'
                        ? `Instalar ${displayBrandName} no ${iosBrowser === 'chrome' ? 'Chrome' : 'Edge'} (iPhone)`
                        : `Instalar ${displayBrandName} no Safari (iPhone)`}
                    </h4>
                    <p className="text-[10px] text-blue-100">
                      {sameCompanyAndChannel && !isIframe
                        ? 'Página oficial da empresa pronta na barra do navegador!'
                        : 'Após abrir a página oficial acima, siga os 3 toques abaixo:'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2 text-left">
                    <div className="space-y-2 text-slate-700 text-[11px]">
                      <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-xs shrink-0">1</span>
                        <span>
                          {iosBrowser === 'chrome' || iosBrowser === 'edge'
                            ? <>Toque no ícone <strong>Compartilhar [↑]</strong> no <strong>canto superior direito</strong> da barra de endereço.</>
                            : <>Toque em <strong>Compartilhar [↑]</strong> na barra inferior do Safari (se não aparecer, toque em <strong>•••</strong> no canto inferior e depois em <strong>Compartilhar [↑]</strong>).</>}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-xs shrink-0">2</span>
                        <span>Role para cima nas opções e toque em <strong>"Adicionar à Tela de Início" ➕</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-xs shrink-0">3</span>
                        <span>Confirme em <strong>"Adicionar"</strong> no canto superior direito. O app da loja será criado na tela do iPhone!</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerSyncBackground();
                      try {
                        confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
                      } catch {}
                      onClose();
                    }}
                    className="w-full py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>Pronto, Já Adicionei à Tela de Início!</span>
                  </button>
                </div>
              ) : (
                /* 3. Desktop / Preview / QR Code Flow */
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={isTriggering}
                    onClick={handleDirectInstall}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-70"
                  >
                    <DownloadCloud className="w-5 h-5 text-emerald-200" />
                    <span>{isIframe ? `Instalar ${displayBrandName} no Navegador` : `Instalar ${displayBrandName} Agora`}</span>
                  </button>

                  {qrCodeUrl && (
                    <div className="p-3 bg-gradient-to-br from-indigo-50/80 to-slate-50 border border-indigo-200 rounded-2xl text-center space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-100 text-indigo-900 rounded-md text-[10px] font-black uppercase tracking-wider">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Instalar Direto no Celular</span>
                      </div>
                      <p className="text-[11px] text-slate-600">
                        Aponte a câmera do celular para instalar <strong>{displayBrandName}</strong>:
                      </p>
                      <div className="inline-block p-2 bg-white rounded-xl shadow-xs border border-indigo-200">
                        <img src={qrCodeUrl} alt="QR Code Instalação Celular" className="w-36 h-36 mx-auto" />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenBrowserTab}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-slate-600" />
                    <span>Abrir Página de Instalação em Nova Aba</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 bg-indigo-50/80 rounded-2xl border border-indigo-100 flex items-start gap-2">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold text-[11px]">App da Empresa</strong>
                <span className="text-[10px] text-slate-500">1 toque na tela inicial</span>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-50/80 rounded-2xl border border-emerald-100 flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold text-[11px]">Tela Cheia</strong>
                <span className="text-[10px] text-slate-500">Sem barra de navegador</span>
              </div>
            </div>

            <div className="p-2.5 bg-amber-50/80 rounded-2xl border border-amber-100 flex items-start gap-2">
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold text-[11px]">Modo Offline</strong>
                <span className="text-[10px] text-slate-500">Catálogo sempre disponível</span>
              </div>
            </div>

            <div className="p-2.5 bg-sky-50/80 rounded-2xl border border-sky-100 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-slate-900 font-bold text-[11px]">Canal Vinculado</strong>
                <span className="text-[10px] text-slate-500">Pedidos direto no WhatsApp</span>
              </div>
            </div>
          </div>

          {/* Copy Link Footer */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
            <span className="text-[11px]">Link de instalação desta loja:</span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5 text-emerald-700" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
