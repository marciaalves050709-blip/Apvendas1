import { CompanyAccount, PaymentSettings, Product, SellerProfile } from '../types';

/**
 * Clean and robust fallback to copy text to clipboard across all mobile & desktop browsers.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  // 1. Try modern navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }

  // 2. Fallback to hidden textarea with execCommand('copy')
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export const PUBLIC_STORE_ORIGIN = 'https://www.apvendas1.com.br';

/**
 * Resolves the public customer-facing origin for shareable links.
 * Never exposes internal Google AI Studio preview domains (ais-dev- / ais-pre-)
 * because external crawlers (WhatsApp, social media, other devices) hit "Cookie check".
 */
export function getPublicShareOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const cur = window.location.origin;
    if (!cur.includes('ais-dev-') && !cur.includes('ais-pre-')) {
      return cur;
    }
  }
  return PUBLIC_STORE_ORIGIN;
}

/**
 * Builds the clean public store URL for sharing containing ONLY the company name.
 * E.g.: https://www.apvendas1.com.br/loja/minha-empresa
 */
export function buildStoreCleanUrl(
  company: CompanyAccount,
  paymentSettings?: PaymentSettings
): string {
  const origin = getPublicShareOrigin();

  const rawStoreName = (company?.name || paymentSettings?.merchantName || 'Minha Loja').trim();
  const storeSlug = normalizeStoreSlugShared(company?.slug || rawStoreName);

  return `${origin}/loja/${encodeURIComponent(storeSlug)}`;
}

export function normalizeStoreSlugShared(name?: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim() || 'loja';
}

export function maskPhoneHidden(phone?: string): string {
  const d = normalizePhoneDigits(phone);
  if (!d) return '';
  return 'WhatsApp Protegido (Oculto)';
}

export function maskPhoneDots(phone?: string): string {
  const d = normalizePhoneDigits(phone);
  if (!d) return '';
  return '(••) •••••-••••';
}

export interface CompanyPhoneEntry {
  phone: string; // canonical digits without leading 55 when 12+ digits
  whatsappDigits: string; // digits formatted for ?zap= / wa.me (with 55 when BR 10/11 digits)
  formatted: string;
  masked: string;
  label: string;
  sellerId?: string;
  channelKey: string;
  isActive: boolean;
}

export function normalizePhoneDigits(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits.slice(2);
  }
  return digits;
}

export function toWhatsappDigits(phone?: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    return `55${digits}`;
  }
  return digits;
}

export function formatPhoneQuick(phone?: string): string {
  const d = normalizePhoneDigits(phone);
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return phone || '';
}

export function phonesMatch(a?: string, b?: string): boolean {
  const na = normalizePhoneDigits(a);
  const nb = normalizePhoneDigits(b);
  if (!na || !nb) return false;
  return na === nb || (na.length >= 8 && nb.length >= 8 && (na.endsWith(nb) || nb.endsWith(na)));
}

export function collectCompanyPhones(
  company?: CompanyAccount | null,
  paymentSettings?: Partial<PaymentSettings> | null,
  activeSeller?: SellerProfile | null
): CompanyPhoneEntry[] {
  const result: CompanyPhoneEntry[] = [];
  const seen = new Set<string>();
  const activeCanon = normalizePhoneDigits(
    activeSeller?.whatsapp || paymentSettings?.merchantWhatsapp || company?.phone
  );

  const pushEntry = (raw?: string, label?: string, sellerId?: string) => {
    const canon = normalizePhoneDigits(raw);
    if (canon.length < 8 || seen.has(canon)) return;
    seen.add(canon);
    const channelIdx = result.length + 1;
    result.push({
      phone: canon,
      whatsappDigits: toWhatsappDigits(raw),
      formatted: formatPhoneQuick(canon),
      masked: maskPhoneDots(canon),
      label: label || `Canal ${channelIdx}`,
      sellerId,
      channelKey: sellerId || `canal_${channelIdx}`,
      isActive: canon === activeCanon
    });
  };

  if (activeSeller?.whatsapp) {
    pushEntry(activeSeller.whatsapp, activeSeller.name || 'Atendente Ativo', activeSeller.id);
  }
  if (Array.isArray(paymentSettings?.sellers)) {
    for (const s of paymentSettings.sellers) {
      if (s?.whatsapp) {
        pushEntry(s.whatsapp, s.name || 'Vendedor', s.id);
      }
    }
  }
  if (paymentSettings?.merchantWhatsapp) {
    pushEntry(paymentSettings.merchantWhatsapp, 'WhatsApp da Loja', 'loja_principal');
  }
  if (company?.phone) {
    pushEntry(company.phone, company.ownerName || 'Empresa', 'empresa_principal');
  }

  return result;
}

/**
 * Builds the canonical public store URL containing the company AND all available products.
 * This URL is used by the URL shortener to deliver all products when opened.
 */
export function buildStoreShareUrl(
  company: CompanyAccount,
  paymentSettings?: PaymentSettings,
  activeSeller?: SellerProfile,
  products?: Product[],
  phoneOverride?: string
): string {
  const origin = getPublicShareOrigin();

  const rawStoreName = (company?.name || paymentSettings?.merchantName || 'Minha Loja').trim();
  const pathSlug = normalizeStoreSlugShared(company?.slug || rawStoreName);
  const storeSlug = rawStoreName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_áéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ]/g, '') || 'loja';

  const url = new URL(`/loja/${encodeURIComponent(pathSlug)}`, origin);
  url.searchParams.set('loja', pathSlug);
  url.searchParams.set('nome', rawStoreName);
  url.searchParams.set('tab', 'client-store');
  url.searchParams.set('empresa', company?.id || 'empresa_principal');

  const zap = phoneOverride || activeSeller?.whatsapp || paymentSettings?.merchantWhatsapp || company?.phone;
  if (zap) {
    const cleanZap = toWhatsappDigits(zap);
    if (cleanZap) url.searchParams.set('zap', cleanZap);
  }

  const pix = activeSeller?.pixKey || paymentSettings?.pixKey;
  if (pix && pix.trim()) {
    url.searchParams.set('pix', pix.trim());
  }

  const bank = activeSeller?.receivingBank || paymentSettings?.receivingBank;
  if (bank) {
    url.searchParams.set('banco', bank);
  }

  // Ultra-compact product serializer (up to 60 products, capped safely for shortener limits)
  // Format: Name_Price_Stock_Unit_Category_WholesalePrice_WholesaleQty joined by '*'
  if (products && products.length > 0) {
    try {
      const rawMaxUpdated = products.reduce((max, p) => {
        const t = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
        return t > max ? t : max;
      }, 0);
      const catalogVersion = rawMaxUpdated > 0
        ? rawMaxUpdated
        : products.reduce((acc, p) => {
            const key = `${p.id}|${p.name}|${p.salePrice}|${p.currentStock}`;
            let h = acc;
            for (let i = 0; i < key.length; i++) {
              h = (h * 31 + key.charCodeAt(i)) % 2147483647;
            }
            return h;
          }, products.length + 1);
      url.searchParams.set('v', String(catalogVersion));

      const compactItems: string[] = [];
      for (const p of products.slice(0, 60)) {
        const safeName = (p.name || 'Produto').replace(/[_*~|]/g, ' ').trim().slice(0, 32);
        const safeCat = (p.category || 'Outros').replace(/[_*~|]/g, ' ').trim().slice(0, 20);
        const price = Number(p.salePrice) || 0;
        const stock = Number(p.currentStock) || 0;
        const unit = (p.unit || 'UN').replace(/[_*~|]/g, '').trim().slice(0, 6);
        const wp = p.wholesalePrice ? Number(p.wholesalePrice) : '';
        const wq = p.wholesaleMinQty ? Number(p.wholesaleMinQty) : '';
        
        const entry = (wp && wq)
          ? `${safeName}_${price}_${stock}_${unit}_${safeCat}_${wp}_${wq}`
          : `${safeName}_${price}_${stock}_${unit}_${safeCat}`;

        // Keep total encoded URL safely under 3800 chars so is.gd POST never hits size limit
        if (encodeURIComponent([...compactItems, entry].join('*')).length > 3000) {
          break;
        }
        compactItems.push(entry);
      }

      if (compactItems.length > 0) {
        url.searchParams.set('p', compactItems.join('*'));
      }
    } catch {
      // ignore serialization errors
    }
  }

  return url.toString();
}

/**
 * Syncs the store catalog and payment data to the backend /api/stores/:slug.
 * Allows any device or customer to open the clean ?loja=nome or /loja/nome link and see all products.
 */
export async function syncStoreToServer(
  company: CompanyAccount,
  paymentSettings?: PaymentSettings,
  activeSeller?: SellerProfile,
  products?: Product[],
  forceClearOrOpts?: boolean | { forceClear?: boolean; setAsActive?: boolean; isRename?: boolean; isNewRegistration?: boolean; companyPassword?: string; keepalive?: boolean; onResolvedSlug?: (slug: string) => void }
): Promise<boolean> {
  try {
    const opts = typeof forceClearOrOpts === 'object' && forceClearOrOpts !== null
      ? forceClearOrOpts
      : { forceClear: Boolean(forceClearOrOpts) };
    const rawStoreName = (company?.name || paymentSettings?.merchantName || 'Minha Loja').trim();
    const storeSlug = opts.isRename
      ? normalizeStoreSlugShared(rawStoreName)
      : normalizeStoreSlugShared(company?.slug || rawStoreName);

    const registeredPhones = collectCompanyPhones(company, paymentSettings, activeSeller).map(e => e.phone);
    const publicStoreSnapshot = {
      slug: storeSlug,
      cleanSlug: storeSlug.replace(/[^a-z0-9]/g, ''),
      company: { ...company, name: rawStoreName, slug: storeSlug },
      paymentSettings,
      activeSeller,
      products: products || [],
      registeredPhones,
      updatedAt: new Date().toISOString()
    };

    // Instant 0ms same-device sync between Chrome/Safari tabs and Installed PWA (never includes password)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('appvendas_realtime_sync');
        bc.postMessage({
          type: 'STORE_UPDATED',
          slug: storeSlug,
          cleanSlug: publicStoreSnapshot.cleanSlug,
          companyId: company?.id,
          companyName: rawStoreName,
          forceClear: Boolean(opts.forceClear),
          storeData: publicStoreSnapshot,
          timestamp: Date.now()
        });
        bc.close();
      } catch {}
    }

    const payload = JSON.stringify({
      company: publicStoreSnapshot.company,
      paymentSettings,
      activeSeller,
      products: products || [],
      registeredPhones,
      forceClear: Boolean(opts.forceClear),
      ...(opts.setAsActive !== undefined ? { setAsActive: opts.setAsActive } : {}),
      ...(opts.isRename ? { isRename: true } : {}),
      ...(opts.isNewRegistration ? { isNewRegistration: true } : {}),
      ...(opts.companyPassword && opts.companyPassword.trim().length >= 4 ? { companyPassword: opts.companyPassword.trim() } : {})
    });

    const canKeepalive = Boolean(opts.keepalive && payload.length < 60000);
    const res = await fetch(`/api/stores/${encodeURIComponent(storeSlug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      ...(canKeepalive ? { keepalive: true } : {})
    });

    let resolvedSlug = storeSlug;
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      try {
        const json = await res.json();
        if (json?.slug && typeof json.slug === 'string') {
          resolvedSlug = json.slug;
          if (opts.onResolvedSlug) {
            opts.onResolvedSlug(json.slug);
          }
        }
      } catch {}
    }

    // If running inside AI Studio dev container, mirror catalog to shared preview container in background
    if (typeof window !== 'undefined' && window.location.origin.includes('ais-dev-')) {
      const preOrigin = window.location.origin.replace('ais-dev-', 'ais-pre-');
      fetch(`${preOrigin}/api/stores/${encodeURIComponent(resolvedSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).catch(() => {});
    }

    return res.ok;
  } catch (err) {
    console.warn('[SyncStore] Offline or sync skipped:', err);
    return false;
  }
}

/**
 * Builds a ready-to-share promotional message for WhatsApp & social media.
 * Uses the short, clean link containing the company name.
 */
export function buildStoreShareMessage(
  company: CompanyAccount,
  shareUrl: string,
  activeSeller?: SellerProfile,
  paymentSettings?: PaymentSettings,
  _products?: Product[]
): string {
  const compName = (company?.name || paymentSettings?.merchantName || 'Nossa Loja').trim();
  const emoji = company?.logoEmoji || '🏪';
  const sellerInfo = activeSeller?.name && activeSeller.name !== 'Atendente' 
    ? `💬 *Atendimento Especial:* ${activeSeller.name}\n` 
    : '';

  // Safety: Guarantee link NEVER contains da.gd or raw query codes (?loja=...&p=...) and always defaults to clean company link
  const hasRawQueryCodes = shareUrl.includes('?p=') || shareUrl.includes('&p=') || shareUrl.includes('&loja=') || shareUrl.includes('&pix=');
  const safeShareUrl = shareUrl && !shareUrl.includes('da.gd') && !hasRawQueryCodes && shareUrl.startsWith('http')
    ? shareUrl
    : buildStoreCleanUrl(company, paymentSettings);

  return (
`${emoji} *CATÁLOGO OFICIAL - ${compName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━━
Olá! Preparamos nosso catálogo digital para você conferir os produtos da *${compName}* e fazer seus pedidos com facilidade pelo WhatsApp!

🔗 *Acesse nossa loja pelo link:*

${safeShareUrl}

✨ *Vantagens de comprar conosco:*
• 🛵 *Entrega Local ou Retirada no Local*
• ⚡ *Pagamento facilitado no Pix, Cartão ou Dinheiro*
• 📱 *Pedido enviado direto pro nosso WhatsApp*
${sellerInfo}
Acesse o catálogo da ${compName} e aproveite!`
  );
}

/**
 * Shortens a URL while STRICTLY guaranteeing that the company name appears in the resulting link
 * and NEVER exposing raw query-string codes (?loja=...&pix=...&p=...).
 */
export interface ShortenExtraData {
  company?: CompanyAccount;
  paymentSettings?: Partial<PaymentSettings>;
  activeSeller?: SellerProfile;
  products?: Product[];
  zap?: string;
}

export async function shortenUrl(
  longUrl: string,
  storeName?: string,
  extraData?: ShortenExtraData
): Promise<string> {
  if (!longUrl) return '';

  // Resolve store name from argument, query params, or /loja/:slug pathname inside longUrl
  let resolvedName = (storeName || extraData?.company?.name || '').trim();
  if (!resolvedName || resolvedName.toLowerCase() === 'loja') {
    try {
      const parsed = new URL(longUrl);
      resolvedName = (parsed.searchParams.get('nome') || parsed.searchParams.get('loja') || resolvedName).trim();
      if (!resolvedName || resolvedName.toLowerCase() === 'loja') {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if ((parts[0] === 'loja' || parts[0] === 'l') && parts[1]) {
          const decodedPart = decodeURIComponent(parts[1]);
          resolvedName = parts[0] === 'l'
            ? decodedPart.replace(/[_-][a-z0-9]{4}$/i, '')
            : decodedPart;
        }
      }
    } catch {}
  }

  const cleanSlug = resolvedName
    ? resolvedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 30)
    : 'loja';

  const urlSlug = resolvedName
    ? resolvedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48)
    : 'loja';

  const origin = getPublicShareOrigin();

  const cleanFallbackUrl = `${origin}/loja/${encodeURIComponent(urlSlug || 'loja')}`;
  let destinationUrl = cleanFallbackUrl;
  try {
    const seededUrl = (!longUrl.includes('?p=') && extraData?.company && Array.isArray(extraData.products) && extraData.products.length > 0)
      ? buildStoreShareUrl(
          extraData.company,
          extraData.paymentSettings as PaymentSettings | undefined,
          extraData.activeSeller,
          extraData.products,
          extraData.zap
        )
      : longUrl;
    const parsedLong = new URL(seededUrl);
    let destOrigin = parsedLong.origin;
    if (destOrigin.includes('ais-dev-') || destOrigin.includes('ais-pre-')) {
      destOrigin = origin;
    }
    const destObj = new URL(`/loja/${encodeURIComponent(urlSlug || cleanSlug || 'loja')}${parsedLong.search}`, destOrigin);
    destinationUrl = destObj.toString();
  } catch {}

  const cleanPrefix = cleanSlug.slice(0, 20);
  const urlPrefix = urlSlug.slice(0, 20);
  const hasCompanyInLink = (candidate: string) => {
    const lower = candidate.toLowerCase();
    return (
      lower.includes(cleanSlug) ||
      lower.includes(urlSlug) ||
      (cleanPrefix.length >= 3 && lower.includes(cleanPrefix)) ||
      (urlPrefix.length >= 3 && lower.includes(urlPrefix)) ||
      lower.includes(`/loja/${urlSlug}`) ||
      lower.includes(`/l/${cleanSlug}`)
    );
  };

  const isSafePublicLink = (candidate?: string): candidate is string => {
    if (!candidate || typeof candidate !== 'string') return false;
    if (!candidate.startsWith('http')) return false;
    if (candidate.includes('da.gd')) return false;
    if (candidate.includes('ais-pre-') || candidate.includes('ais-dev-')) return false;
    if (candidate.includes('?p=') || candidate.includes('&p=')) return false;
    return true;
  };

  const shortenBody = JSON.stringify({
    url: destinationUrl,
    storeName: resolvedName || storeName,
    ...(extraData || {})
  });

  const postShorten = async (endpoint: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const apiRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: shortenBody,
        signal: controller.signal
      });
      const ct = apiRes.headers.get('content-type') || '';
      if (!apiRes.ok || !ct.includes('application/json')) return null;
      return await apiRes.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const trimUrlForGet = (rawTarget: string, maxLen = 1750): string => {
    if (rawTarget.length <= maxLen) return rawTarget;
    try {
      const u = new URL(rawTarget);
      const pRaw = u.searchParams.get('p');
      if (!pRaw) return rawTarget.slice(0, maxLen);
      const items = pRaw.split('*').filter(Boolean);
      while (items.length > 1) {
        items.pop();
        u.searchParams.set('p', items.join('*'));
        if (u.toString().length <= maxLen) break;
      }
      if (u.toString().length > maxLen) {
        u.searchParams.delete('p');
      }
      return u.toString();
    } catch {
      return rawTarget;
    }
  };

  const shortenViaIsGdJsonp = (target: string, aliasPrefix: string): Promise<string | null> => {
    if (typeof document === 'undefined' || target.includes('localhost') || target.includes('127.0.0.1')) {
      return Promise.resolve(null);
    }
    const safeTarget = trimUrlForGet(target, 1750);
    const trySlug = (customAlias: string): Promise<string | null> => new Promise((resolve) => {
      const cbName = `__isgd_cb_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const script = document.createElement('script');
      let settled = false;
      const cleanup = () => {
        try { delete (window as any)[cbName]; } catch {}
        try { script.remove(); } catch {}
      };
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(null);
        }
      }, 3000);
      (window as any)[cbName] = (data: any) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cleanup();
        const su = data?.shorturl;
        if (typeof su === 'string' && su.startsWith('http') && hasCompanyInLink(su)) {
          resolve(su);
        } else {
          resolve(null);
        }
      };
      const qs = new URLSearchParams({
        format: 'json',
        callback: cbName,
        shorturl: customAlias,
        url: safeTarget
      });
      script.src = `https://is.gd/create.php?${qs.toString()}`;
      script.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          cleanup();
          resolve(null);
        }
      };
      document.head.appendChild(script);
    });

    return (async () => {
      const base = (aliasPrefix || 'loja').slice(0, 22);
      const r1 = Math.random().toString(36).slice(2, 6);
      const r2 = Math.random().toString(36).slice(2, 7);
      for (const alias of [`${base}_${r1}`, `${base}_${r2}`]) {
        if (alias.length >= 5 && alias.length <= 30) {
          const ok = await trySlug(alias);
          if (ok) return ok;
        }
      }
      return null;
    })();
  };

  // 0. Primary: Fast server-side shorten API
  try {
    const data = await postShorten('/api/shorten');
    if (isSafePublicLink(data?.shortUrl) && hasCompanyInLink(data.shortUrl)) {
      return data.shortUrl;
    }
    if (isSafePublicLink(data?.cleanSelfShortUrl)) {
      return data.cleanSelfShortUrl;
    }
  } catch {
    // fallback below
  }

  // 1. Direct browser JSONP is.gd fallback (works on static Vercel hosting even when /api/shorten returns HTML!)
  try {
    const jsonpShort = await shortenViaIsGdJsonp(destinationUrl, cleanSlug);
    if (isSafePublicLink(jsonpShort)) {
      return jsonpShort;
    }
  } catch {
    // fallback below
  }

  // Fallback: ALWAYS return clean official company URL (/loja/empresa) — NEVER expose ais-pre- or ?loja=&nome=&pix=&p= query codes
  return cleanFallbackUrl;
}
