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

/**
 * Builds the clean public store URL for sharing containing ONLY the company name.
 * E.g.: https://ais-pre-...run.app/?loja=Minha-Empresa
 */
export function buildStoreCleanUrl(
  company: CompanyAccount,
  paymentSettings?: PaymentSettings
): string {
  let origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://ais-pre-i3xnc7zdrcnzwzesrvdnvw-849259028633.us-east1.run.app';
  
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }

  const rawStoreName = (company?.name || paymentSettings?.merchantName || 'Minha Loja').trim();
  const storeSlug = rawStoreName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim() || 'loja';

  return `${origin}/loja/${encodeURIComponent(storeSlug)}`;
}

export interface CompanyPhoneEntry {
  phone: string; // canonical digits without leading 55 when 12+ digits
  whatsappDigits: string; // digits formatted for ?zap= / wa.me (with 55 when BR 10/11 digits)
  formatted: string;
  label: string;
  sellerId?: string;
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
    result.push({
      phone: canon,
      whatsappDigits: toWhatsappDigits(raw),
      formatted: formatPhoneQuick(canon),
      label: label || 'WhatsApp da Empresa',
      sellerId,
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
    pushEntry(paymentSettings.merchantWhatsapp, 'WhatsApp da Loja');
  }
  if (company?.phone) {
    pushEntry(company.phone, company.ownerName || 'Empresa');
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
  let origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://ais-pre-i3xnc7zdrcnzwzesrvdnvw-849259028633.us-east1.run.app';
  
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }

  const rawStoreName = (company?.name || paymentSettings?.merchantName || 'Minha Loja').trim();
  const pathSlug = rawStoreName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim() || 'loja';
  const storeSlug = rawStoreName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_áéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ]/g, '') || 'loja';

  const url = new URL(`/loja/${encodeURIComponent(pathSlug)}`, origin);
  url.searchParams.set('loja', storeSlug);
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
  forceClear?: boolean
): Promise<boolean> {
  try {
    const rawStoreName = (company?.name || paymentSettings?.merchantName || 'Minha Loja').trim();
    const storeSlug = rawStoreName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .trim() || 'loja';

    const registeredPhones = collectCompanyPhones(company, paymentSettings, activeSeller).map(e => e.phone);
    const payload = JSON.stringify({
      company,
      paymentSettings,
      activeSeller,
      products: products || [],
      registeredPhones,
      forceClear: Boolean(forceClear)
    });

    const res = await fetch(`/api/stores/${encodeURIComponent(storeSlug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });

    // If running inside AI Studio dev container, mirror catalog to shared preview container in background
    if (typeof window !== 'undefined' && window.location.origin.includes('ais-dev-')) {
      const preOrigin = window.location.origin.replace('ais-dev-', 'ais-pre-');
      fetch(`${preOrigin}/api/stores/${encodeURIComponent(storeSlug)}`, {
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
  products?: Product[]
): string {
  const compName = (company?.name || paymentSettings?.merchantName || 'Nossa Loja').trim();
  const emoji = company?.logoEmoji || '🏪';
  const sellerInfo = activeSeller?.name && activeSeller.name !== 'Atendente' 
    ? `💬 *Atendimento Especial:* ${activeSeller.name}\n` 
    : '';

  const productPreview = Array.isArray(products) && products.length > 0
    ? `\n🛍️ *Destaques (${products.length} ${products.length === 1 ? 'item' : 'itens'}):* ${products.slice(0, 4).map(p => p.name).join(', ')}${products.length > 4 ? '...' : ''}\n`
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
${productPreview}
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
          resolvedName = decodeURIComponent(parts[1]).replace(/[_-][a-z0-9]{3,8}$/i, '');
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

  let origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://ais-pre-i3xnc7zdrcnzwzesrvdnvw-849259028633.us-east1.run.app';
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }

  const cleanFallbackUrl = `${origin}/loja/${encodeURIComponent(urlSlug || 'loja')}`;
  let destinationUrl = cleanFallbackUrl;
  try {
    const parsedLong = new URL(longUrl);
    let destOrigin = parsedLong.origin;
    if (destOrigin.includes('ais-dev-')) {
      destOrigin = destOrigin.replace('ais-dev-', 'ais-pre-');
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

  // 0. Primary: Fast server-side proxy (persists _shortLinks + live products & phone, returns is.gd or /l/empresa_hash)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const apiRes = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: destinationUrl,
        storeName: resolvedName || storeName,
        ...(extraData || {})
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (
        data &&
        typeof data.shortUrl === 'string' &&
        data.shortUrl.startsWith('http') &&
        !data.shortUrl.includes('da.gd') &&
        !data.shortUrl.includes('?p=') &&
        !data.shortUrl.includes('&p=') &&
        hasCompanyInLink(data.shortUrl)
      ) {
        return data.shortUrl;
      }
      if (
        data &&
        typeof data.cleanSelfShortUrl === 'string' &&
        data.cleanSelfShortUrl.startsWith('http')
      ) {
        return data.cleanSelfShortUrl;
      }
    }
  } catch {
    // fallback below
  }

  // Fallback: ALWAYS return clean official company URL (/loja/empresa) — NEVER expose ?loja=&nome=&pix=&p= query codes
  return cleanFallbackUrl;
}
