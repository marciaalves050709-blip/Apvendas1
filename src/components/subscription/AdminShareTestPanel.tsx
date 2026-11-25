import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp, getTenantKey } from '../../context/AppContext';
import { CompanyAccount, PaymentSettings, Product, SellerProfile } from '../../types';
import { formatCurrency } from '../../utils/pixHelper';
import {
  buildStoreShareMessage,
  buildStoreShareUrl,
  collectCompanyPhones,
  copyTextToClipboard,
  formatPhoneQuick,
  normalizePhoneDigits,
  phonesMatch,
  shortenUrl,
  syncStoreToServer,
  toWhatsappDigits
} from '../../utils/shareHelper';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FlaskConical,
  Link2,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
  Smartphone
} from 'lucide-react';

interface CatalogRecord {
  id: string;
  slug: string;
  company: CompanyAccount;
  paymentSettings: PaymentSettings;
  activeSeller: SellerProfile | null;
  products: Product[];
  registeredPhones: string[];
  updatedAt: string | null;
  source: 'local' | 'server' | 'merged';
}

const DEFAULT_COMPANY_ID = 'empresa_principal';

const sanitizeSlug = (name: string) =>
  (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim() || 'loja';

export const AdminShareTestPanel: React.FC = () => {
  const {
    companies,
    currentCompany,
    products: currentProducts,
    paymentSettings: currentPaymentSettings,
    activeSeller: currentActiveSeller,
    showToast
  } = useApp();

  const [serverRecords, setServerRecords] = useState<CatalogRecord[]>([]);
  const [phoneSearchResult, setPhoneSearchResult] = useState<CatalogRecord | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  const [phoneInput, setPhoneInput] = useState<string>(
    currentActiveSeller?.whatsapp || currentPaymentSettings.merchantWhatsapp || currentCompany?.phone || ''
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(currentCompany?.id || DEFAULT_COMPANY_ID);

  const [shortUrl, setShortUrl] = useState<string>('');
  const [isGeneratingLink, setIsGeneratingLink] = useState<boolean>(false);
  const [isSyncingStore, setIsSyncingStore] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedMsg, setCopiedMsg] = useState<boolean>(false);
  const [showMessagePreview, setShowMessagePreview] = useState<boolean>(false);

  // 1. Build local snapshot across ALL companies in localStorage + live currentCompany context
  const localRecords = useMemo<CatalogRecord[]>(() => {
    const list: CatalogRecord[] = [];
    const companyList = companies && companies.length > 0 ? companies : [currentCompany];

    for (const comp of companyList) {
      if (!comp || !comp.id) continue;
      const isCurrent = comp.id === currentCompany?.id;

      let compProducts: Product[] = [];
      let compSettings: PaymentSettings = {} as PaymentSettings;

      if (isCurrent) {
        compProducts = currentProducts || [];
        compSettings = currentPaymentSettings;
      } else {
        try {
          const rawP = localStorage.getItem(getTenantKey('products', comp.id));
          if (rawP) {
            compProducts = JSON.parse(rawP);
          } else if (comp.id === DEFAULT_COMPANY_ID) {
            const legacyP = localStorage.getItem('descart_clean_products_v1');
            if (legacyP) compProducts = JSON.parse(legacyP);
          }
        } catch {}

        try {
          const rawS = localStorage.getItem(getTenantKey('payment_settings', comp.id));
          if (rawS) {
            compSettings = JSON.parse(rawS);
          } else if (comp.id === DEFAULT_COMPANY_ID) {
            const legacyS = localStorage.getItem('descart_clean_payment_settings_v1');
            if (legacyS) compSettings = JSON.parse(legacyS);
          }
        } catch {}
      }

      const seller: SellerProfile | null = isCurrent
        ? currentActiveSeller || null
        : Array.isArray(compSettings?.sellers) && compSettings.sellers.length > 0
        ? compSettings.sellers.find((s) => s.id === compSettings.activeSellerId) || compSettings.sellers[0]
        : null;

      const phoneEntries = collectCompanyPhones(comp, compSettings, seller);
      const latestProdTime = (compProducts || []).reduce((max, p) => {
        const t = p?.updatedAt ? new Date(p.updatedAt).getTime() : 0;
        return t > max ? t : max;
      }, 0);

      list.push({
        id: comp.id,
        slug: sanitizeSlug(comp.name),
        company: comp,
        paymentSettings: compSettings || ({} as PaymentSettings),
        activeSeller: seller,
        products: Array.isArray(compProducts) ? compProducts : [],
        registeredPhones: phoneEntries.map((e) => e.phone),
        updatedAt: latestProdTime > 0 ? new Date(latestProdTime).toISOString() : comp.createdAt || null,
        source: 'local'
      });
    }

    return list;
  }, [companies, currentCompany, currentProducts, currentPaymentSettings, currentActiveSeller]);

  // 2. Fetch live server catalog (/api/admin/stores-catalog)
  const refreshServerCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const res = await fetch(`/api/admin/stores-catalog?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.stores)) {
          const mapped: CatalogRecord[] = data.stores.map((s: any) => ({
            id: s.company?.id || s.slug,
            slug: s.slug || sanitizeSlug(s.company?.name || ''),
            company: {
              id: s.company?.id || s.slug,
              name: s.company?.name || s.slug || 'Loja',
              slug: s.slug || sanitizeSlug(s.company?.name || ''),
              ownerName: s.company?.ownerName || '',
              phone: s.company?.phone || s.paymentSettings?.merchantWhatsapp || '',
              category: s.company?.category || 'Comércio em Geral',
              logoEmoji: s.company?.logoEmoji || '🏪',
              createdAt: s.company?.createdAt || s.updatedAt || new Date().toISOString()
            },
            paymentSettings: s.paymentSettings || ({} as PaymentSettings),
            activeSeller: s.activeSeller || null,
            products: Array.isArray(s.products) ? s.products : [],
            registeredPhones: Array.isArray(s.registeredPhones) ? s.registeredPhones : [],
            updatedAt: s.updatedAt || null,
            source: 'server'
          }));
          setServerRecords(mapped);
        }
      }
    } catch {
      // keep local data if offline
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    refreshServerCatalog();
  }, [refreshServerCatalog]);

  // 3. Merge local + server + on-demand phone lookup records cleanly
  const catalogRecords = useMemo<CatalogRecord[]>(() => {
    const map = new Map<string, CatalogRecord>();

    for (const rec of localRecords) {
      map.set(rec.id, rec);
    }

    const allServer = phoneSearchResult ? [...serverRecords, phoneSearchResult] : serverRecords;
    for (const srv of allServer) {
      const matchExisting = Array.from(map.values()).find(
        (r) => r.id === srv.id || (srv.slug && r.slug === srv.slug)
      );

      if (!matchExisting) {
        map.set(srv.id, srv);
      } else {
        const mergedPhones = Array.from(
          new Set([...matchExisting.registeredPhones, ...srv.registeredPhones])
        );
        const isCurrentLocal = matchExisting.id === currentCompany?.id;
        const srvTime = srv.updatedAt ? new Date(srv.updatedAt).getTime() : 0;
        const locTime = matchExisting.updatedAt ? new Date(matchExisting.updatedAt).getTime() : 0;
        const useServerProducts = !isCurrentLocal && (srv.products.length > 0 && (matchExisting.products.length === 0 || srvTime > locTime));

        map.set(matchExisting.id, {
          ...matchExisting,
          registeredPhones: mergedPhones,
          products: useServerProducts ? srv.products : matchExisting.products,
          updatedAt: srvTime > locTime ? srv.updatedAt : matchExisting.updatedAt,
          source: 'merged'
        });
      }
    }

    return Array.from(map.values());
  }, [localRecords, serverRecords, phoneSearchResult, currentCompany?.id]);

  // All registered phone entries across every known company for 1-click quick test pills
  const allPhoneQuickChips = useMemo(() => {
    const chips: Array<{
      phone: string;
      formatted: string;
      companyId: string;
      companyName: string;
      productsCount: number;
    }> = [];
    const seenPair = new Set<string>();

    for (const rec of catalogRecords) {
      const phones = rec.registeredPhones.length > 0
        ? rec.registeredPhones
        : collectCompanyPhones(rec.company, rec.paymentSettings, rec.activeSeller).map((e) => e.phone);

      for (const ph of phones) {
        const clean = normalizePhoneDigits(ph);
        if (clean.length < 8) continue;
        const key = `${clean}__${rec.id}`;
        if (seenPair.has(key)) continue;
        seenPair.add(key);
        chips.push({
          phone: clean,
          formatted: formatPhoneQuick(clean),
          companyId: rec.id,
          companyName: rec.company.name,
          productsCount: rec.products.length
        });
      }
    }
    return chips;
  }, [catalogRecords]);

  // Active target company record
  const selectedRecord = useMemo<CatalogRecord | null>(() => {
    return (
      catalogRecords.find((r) => r.id === selectedCompanyId) ||
      catalogRecords.find((r) => r.id === currentCompany?.id) ||
      catalogRecords[0] ||
      null
    );
  }, [catalogRecords, selectedCompanyId, currentCompany?.id]);

  // Match typed phone against server + local companies
  useEffect(() => {
    const cleanInput = normalizePhoneDigits(phoneInput);
    if (cleanInput.length < 8) {
      setPhoneSearchResult(null);
      return;
    }

    // First check already known records
    const localMatch = catalogRecords.find((rec) =>
      rec.registeredPhones.some((rp) => phonesMatch(rp, cleanInput)) ||
      phonesMatch(rec.company.phone, cleanInput) ||
      phonesMatch(rec.paymentSettings?.merchantWhatsapp, cleanInput) ||
      phonesMatch(rec.activeSeller?.whatsapp, cleanInput)
    );

    if (localMatch && localMatch.id !== selectedCompanyId) {
      setSelectedCompanyId(localMatch.id);
    }

    // Also query server by phone in case it's registered from another device
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stores/by-phone/${encodeURIComponent(cleanInput)}?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data && data.found && !data.isPlaceholder && !cancelled) {
          const rec: CatalogRecord = {
            id: data.company?.id || data.slug,
            slug: data.slug || sanitizeSlug(data.company?.name || ''),
            company: {
              id: data.company?.id || data.slug,
              name: data.company?.name || data.slug || 'Loja',
              slug: data.slug || sanitizeSlug(data.company?.name || ''),
              ownerName: data.company?.ownerName || '',
              phone: data.company?.phone || data.paymentSettings?.merchantWhatsapp || cleanInput,
              category: data.company?.category || 'Comércio em Geral',
              logoEmoji: data.company?.logoEmoji || '🏪',
              createdAt: data.company?.createdAt || data.updatedAt || new Date().toISOString()
            },
            paymentSettings: data.paymentSettings || ({} as PaymentSettings),
            activeSeller: data.activeSeller || null,
            products: Array.isArray(data.products) ? data.products : [],
            registeredPhones: Array.isArray(data.registeredPhones) ? data.registeredPhones : [cleanInput],
            updatedAt: data.updatedAt || null,
            source: 'server'
          };
          setPhoneSearchResult(rec);
          setSelectedCompanyId(rec.id);
        }
      } catch {
        // ignore network errors
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phoneInput]);

  // Handlers for manual selections
  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanyId(companyId);
    const rec = catalogRecords.find((r) => r.id === companyId);
    if (rec) {
      const primaryPhone =
        rec.registeredPhones[0] ||
        rec.activeSeller?.whatsapp ||
        rec.paymentSettings?.merchantWhatsapp ||
        rec.company?.phone ||
        '';
      if (primaryPhone) {
        setPhoneInput(formatPhoneQuick(primaryPhone));
      }
    }
  };

  const handleSelectPhoneChip = (phone: string, companyId: string) => {
    setPhoneInput(formatPhoneQuick(phone));
    setSelectedCompanyId(companyId);
  };

  // Effective phone to embed in share URL
  const effectivePhone = useMemo(() => {
    const cleanTyped = normalizePhoneDigits(phoneInput);
    if (cleanTyped.length >= 8) return cleanTyped;
    if (selectedRecord?.registeredPhones[0]) return selectedRecord.registeredPhones[0];
    return (
      selectedRecord?.activeSeller?.whatsapp ||
      selectedRecord?.paymentSettings?.merchantWhatsapp ||
      selectedRecord?.company?.phone ||
      ''
    );
  }, [phoneInput, selectedRecord]);

  const isPhoneLinkedToSelected = useMemo(() => {
    const cleanTyped = normalizePhoneDigits(phoneInput);
    if (cleanTyped.length < 8 || !selectedRecord) return false;
    return (
      selectedRecord.registeredPhones.some((rp) => phonesMatch(rp, cleanTyped)) ||
      phonesMatch(selectedRecord.company?.phone, cleanTyped) ||
      phonesMatch(selectedRecord.paymentSettings?.merchantWhatsapp, cleanTyped) ||
      phonesMatch(selectedRecord.activeSeller?.whatsapp, cleanTyped)
    );
  }, [phoneInput, selectedRecord]);

  // Build exact share URL for selected company + phone + latest products
  const directShareUrl = useMemo(() => {
    if (!selectedRecord) return '';
    return buildStoreShareUrl(
      selectedRecord.company,
      selectedRecord.paymentSettings,
      selectedRecord.activeSeller || undefined,
      selectedRecord.products,
      effectivePhone || undefined
    );
  }, [selectedRecord, effectivePhone]);

  const regenerateShortLink = useCallback(async (forceSync = false) => {
    if (!selectedRecord || !directShareUrl) return;
    if (forceSync) {
      setIsSyncingStore(true);
      await syncStoreToServer(
        selectedRecord.company,
        selectedRecord.paymentSettings,
        selectedRecord.activeSeller || undefined,
        selectedRecord.products
      );
      await refreshServerCatalog();
      setIsSyncingStore(false);
    }

    setIsGeneratingLink(true);
    try {
      const res = await shortenUrl(directShareUrl, selectedRecord.company.name);
      setShortUrl(res || directShareUrl);
    } catch {
      setShortUrl(directShareUrl);
    } finally {
      setIsGeneratingLink(false);
    }
  }, [selectedRecord, directShareUrl, refreshServerCatalog]);

  useEffect(() => {
    let active = true;
    if (!selectedRecord || !directShareUrl) {
      setShortUrl('');
      return;
    }
    setIsGeneratingLink(true);
    shortenUrl(directShareUrl, selectedRecord.company.name)
      .then((res) => {
        if (active) setShortUrl(res || directShareUrl);
      })
      .catch(() => {
        if (active) setShortUrl(directShareUrl);
      })
      .finally(() => {
        if (active) setIsGeneratingLink(false);
      });
    return () => {
      active = false;
    };
  }, [selectedRecord?.id, selectedRecord?.company?.name, directShareUrl]);

  const finalShareUrl = shortUrl || directShareUrl;

  const shareMessage = useMemo(() => {
    if (!selectedRecord || !finalShareUrl) return '';
    return buildStoreShareMessage(
      selectedRecord.company,
      finalShareUrl,
      selectedRecord.activeSeller || undefined,
      selectedRecord.paymentSettings,
      selectedRecord.products
    );
  }, [selectedRecord, finalShareUrl]);

  const whatsappShareHref = useMemo(() => {
    if (!shareMessage) return '#';
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
  }, [shareMessage]);

  const whatsappDirectPhoneHref = useMemo(() => {
    if (!shareMessage) return '#';
    const waDigits = toWhatsappDigits(effectivePhone);
    if (!waDigits) return whatsappShareHref;
    return `https://wa.me/${waDigits}?text=${encodeURIComponent(shareMessage)}`;
  }, [shareMessage, effectivePhone, whatsappShareHref]);

  const telegramShareHref = useMemo(() => {
    if (!finalShareUrl) return '#';
    const caption = `Confira o catálogo da ${selectedRecord?.company?.name || 'loja'} (${selectedRecord?.products.length || 0} produtos atualizados):`;
    return `https://t.me/share/url?url=${encodeURIComponent(finalShareUrl)}&text=${encodeURIComponent(caption)}`;
  }, [finalShareUrl, selectedRecord]);

  const facebookShareHref = useMemo(() => {
    if (!finalShareUrl) return '#';
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(finalShareUrl)}`;
  }, [finalShareUrl]);

  const handleCopyLink = async () => {
    if (!finalShareUrl) return;
    const ok = await copyTextToClipboard(finalShareUrl);
    if (ok) {
      setCopiedLink(true);
      showToast('success', 'Link de Teste Copiado!', 'Link atualizado com produtos e celular copiado.');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyMessage = async () => {
    if (!shareMessage) return;
    const ok = await copyTextToClipboard(shareMessage);
    if (ok) {
      setCopiedMsg(true);
      showToast('success', 'Mensagem Copiada!', 'Texto completo para WhatsApp e redes sociais copiado.');
      setTimeout(() => setCopiedMsg(false), 2500);
    }
  };

  const handleNativeSocialShare = async () => {
    if (!selectedRecord || !finalShareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Catálogo ${selectedRecord.company.name}`,
          text: shareMessage,
          url: finalShareUrl
        });
        showToast('success', 'Compartilhado!', 'Catálogo enviado para a rede social selecionada.');
        return;
      } catch {
        // user canceled or fallback
      }
    }
    await handleCopyMessage();
  };

  const phoneCleanDigits = normalizePhoneDigits(phoneInput);

  return (
    <div
      data-testid="admin-share-test-panel"
      className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-cyan-500/40 shadow-lg space-y-4"
    >
      {/* Cabeçalho da Área de Teste */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-sm sm:text-base text-white">
                Área de Teste da Administradora (Celular, Empresa &amp; Link)
              </h4>
              <span className="text-[10px] px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded-md font-bold uppercase tracking-wider border border-cyan-400/30">
                Acesso Restrito
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Verifique pelo número de celular e empresa se os produtos estão atualizados no link para WhatsApp e redes sociais.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => regenerateShortLink(true)}
          disabled={isLoadingCatalog || isSyncingStore}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-[11px] font-bold border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(isLoadingCatalog || isSyncingStore) ? 'animate-spin' : ''}`} />
          <span>{isSyncingStore ? 'Sincronizando...' : 'Atualizar Catálogo & Link'}</span>
        </button>
      </div>

      {/* Chips rápidos dos celulares cadastrados */}
      {allPhoneQuickChips.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            Celulares cadastrados nas empresas ({allPhoneQuickChips.length}):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {allPhoneQuickChips.map((chip) => {
              const isSelected =
                chip.companyId === selectedRecord?.id &&
                phonesMatch(chip.phone, phoneInput);
              return (
                <button
                  key={`${chip.phone}-${chip.companyId}`}
                  type="button"
                  onClick={() => handleSelectPhoneChip(chip.phone, chip.companyId)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-sm'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                  }`}
                >
                  <Phone className="w-3 h-3 shrink-0" />
                  <span className="font-mono">{chip.formatted}</span>
                  <span className="opacity-75">• {chip.companyName}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                      isSelected ? 'bg-slate-900 text-cyan-300' : 'bg-slate-700 text-emerald-300'
                    }`}
                  >
                    {chip.productsCount} prod
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inputs: Número de Celular + Empresa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
        <div>
          <label
            htmlFor="admin-test-phone-input"
            className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
          >
            <Phone className="w-3.5 h-3.5" />
            Número de Celular Cadastrado
          </label>
          <input
            id="admin-test-phone-input"
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="Ex: (91) 99319-2405 ou 91993192405"
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl text-xs font-mono font-bold text-white outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="admin-test-company-select"
            className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            Empresa ({catalogRecords.length} disponível{catalogRecords.length === 1 ? '' : 'is'})
          </label>
          <select
            id="admin-test-company-select"
            value={selectedRecord?.id || ''}
            onChange={(e) => handleSelectCompany(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-xl text-xs font-bold text-white outline-none cursor-pointer"
          >
            {catalogRecords.map((rec) => (
              <option key={rec.id} value={rec.id}>
                {rec.company.name} — {rec.products.length} produto{rec.products.length === 1 ? '' : 's'}
                {rec.registeredPhones[0] ? ` (${formatPhoneQuick(rec.registeredPhones[0])})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status de Vínculo Celular ↔ Empresa ↔ Produtos */}
      {selectedRecord && (
        <div
          className={`p-3 rounded-xl border flex items-start justify-between gap-3 flex-wrap ${
            selectedRecord.products.length > 0 && (phoneCleanDigits.length < 8 || isPhoneLinkedToSelected)
              ? 'bg-emerald-950/50 border-emerald-500/40'
              : 'bg-amber-950/40 border-amber-500/40'
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            {selectedRecord.products.length > 0 && (phoneCleanDigits.length < 8 || isPhoneLinkedToSelected) ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-black text-white flex items-center gap-2 flex-wrap">
                <span>Empresa: {selectedRecord.company.name}</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  {selectedRecord.products.length} produto{selectedRecord.products.length === 1 ? '' : 's'}
                </span>
                {effectivePhone && (
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                    Celular no Link: {formatPhoneQuick(effectivePhone)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300">
                {phoneCleanDigits.length >= 8 && !isPhoneLinkedToSelected
                  ? `Atenção: o celular ${formatPhoneQuick(phoneInput)} ainda não está vinculado ao cadastro de "${selectedRecord.company.name}". O link abaixo usará este número para teste.`
                  : selectedRecord.products.length === 0
                  ? 'Esta empresa ainda não possui produtos cadastrados para aparecer no link compartilhado.'
                  : 'Catálogo atualizado e pronto! O link de compartilhar entrega exatamente os produtos desta empresa vinculados a este celular.'}
              </p>
              {selectedRecord.updatedAt && (
                <p className="text-[10px] text-slate-400">
                  Última atualização do catálogo: {new Date(selectedRecord.updatedAt).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Produtos que serão enviados no Link */}
      {selectedRecord && (
        <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              Produtos incluídos no link desta empresa ({selectedRecord.products.length})
            </span>
            <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Sincronizado com ?p= e servidor
            </span>
          </div>

          {selectedRecord.products.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 border border-dashed border-slate-700 rounded-lg">
              Nenhum produto cadastrado nesta empresa.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
              {selectedRecord.products.map((prod) => (
                <div
                  key={prod.id}
                  className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-semibold text-white truncate">{prod.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono">
                      Est: {prod.currentStock}
                    </span>
                    <span className="text-xs font-black text-emerald-400 font-mono">
                      {formatCurrency(prod.salePrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Link Compartilhar (WhatsApp & Redes Sociais) */}
      <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-3.5 space-y-3">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              Link de Compartilhar (WhatsApp e Redes Sociais)
            </span>
            {isGeneratingLink && (
              <span className="text-[10px] text-amber-300 animate-pulse">Gerando link atualizado...</span>
            )}
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              data-testid="admin-test-share-link"
              value={finalShareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-emerald-300 select-all outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>

          {directShareUrl && directShareUrl !== finalShareUrl && (
            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
              <span className="font-bold text-slate-300 shrink-0">Link direto com produtos:</span>
              <span className="font-mono truncate">{directShareUrl}</span>
            </div>
          )}
        </div>

        {/* Ações de Teste: WhatsApp, Enviar p/ Celular, Telegram, Facebook, Abrir Link */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <a
            href={whatsappShareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Testar WhatsApp</span>
          </a>

          <a
            href={whatsappDirectPhoneHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all"
          >
            <Send className="w-3.5 h-3.5 shrink-0" />
            <span>Enviar p/ Celular</span>
          </a>

          <a
            href={finalShareUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>Abrir / Ver Loja</span>
          </a>

          <a
            href={telegramShareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Send className="w-3.5 h-3.5 shrink-0" />
            <span>Telegram</span>
          </a>

          <a
            href={facebookShareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span>Facebook</span>
          </a>

          <button
            type="button"
            onClick={handleNativeSocialShare}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-[11px] font-bold border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span>Outras Redes</span>
          </button>
        </div>

        {/* Toggle prévia da mensagem completa */}
        <div className="pt-1 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMessagePreview((v) => !v)}
            className="text-[11px] text-cyan-300 hover:text-cyan-200 font-bold underline cursor-pointer"
          >
            {showMessagePreview ? 'Ocultar prévia da mensagem' : 'Ver prévia da mensagem completa (WhatsApp / Redes)'}
          </button>

          <button
            type="button"
            onClick={handleCopyMessage}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            {copiedMsg ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedMsg ? 'Mensagem Copiada!' : 'Copiar Mensagem'}</span>
          </button>
        </div>

        {showMessagePreview && (
          <pre className="p-3 bg-slate-900 border border-slate-700 rounded-xl text-[11px] text-slate-200 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
            {shareMessage}
          </pre>
        )}
      </div>
    </div>
  );
};
