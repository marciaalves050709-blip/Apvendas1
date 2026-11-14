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

/**
 * Builds the canonical public store URL containing the company AND all available products.
 * This URL is used by the URL shortener to deliver all products when opened.
 */
export function buildStoreShareUrl(
  company: CompanyAccount,
  paymentSettings?: PaymentSettings,
  activeSeller?: SellerProfile,
  products?: Product[]
): string {
  let origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://ais-pre-i3xnc7zdrcnzwzesrvdnvw-849259028633.us-east1.run.app';
  
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }

  const rawStoreName = (company?.name || paymentSettings?.merchantName || 'Minha Loja').trim();
  const storeSlug = rawStoreName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_áéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ]/g, '') || 'loja';

  const url = new URL('/', origin);
  url.searchParams.set('loja', storeSlug);
  url.searchParams.set('nome', rawStoreName);
  url.searchParams.set('tab', 'client-store');
  url.searchParams.set('empresa', company?.id || 'empresa_principal');

  const zap = activeSeller?.whatsapp || paymentSettings?.merchantWhatsapp || company?.phone;
  if (zap) {
    const cleanZap = zap.replace(/\D/g, '');
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
      const catalogVersion = products.reduce((max, p) => {
        const t = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
        return t > max ? t : max;
      }, 0);
      if (catalogVersion > 0) {
        url.searchParams.set('v', String(catalogVersion));
      }

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

    const payload = JSON.stringify({
      company,
      paymentSettings,
      activeSeller,
      products: products || [],
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
  paymentSettings?: PaymentSettings
): string {
  const compName = (company?.name || paymentSettings?.merchantName || 'Nossa Loja').trim();
  const emoji = company?.logoEmoji || '🏪';
  const sellerInfo = activeSeller?.name && activeSeller.name !== 'Atendente' 
    ? `💬 *Atendimento Especial:* ${activeSeller.name}\n` 
    : '';

  // Safety: Guarantee link NEVER contains da.gd and always defaults to clean company link
  const safeShareUrl = shareUrl && !shareUrl.includes('da.gd') && shareUrl.startsWith('http')
    ? shareUrl
    : buildStoreCleanUrl(company, paymentSettings);

  return (
`${emoji} *CATÁLOGO OFICIAL - ${compName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━━
Olá! Preparamos nosso catálogo digital para você conferir nossos produtos e fazer seus pedidos com facilidade e rapidez pelo WhatsApp!

🛍️ *Clique no link da nossa loja abaixo:*

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
 * Shortens a URL while STRICTLY guaranteeing that the company name appears in the resulting link.
 * Never returns nameless random links from external shorteners.
 */
export async function shortenUrl(longUrl: string, storeName?: string): Promise<string> {
  if (!longUrl) return '';

  // Resolve store name from argument, query params, or /loja/:slug pathname inside longUrl
  let resolvedName = (storeName || '').trim();
  if (!resolvedName || resolvedName.toLowerCase() === 'loja') {
    try {
      const parsed = new URL(longUrl);
      resolvedName = (parsed.searchParams.get('nome') || parsed.searchParams.get('loja') || resolvedName).trim();
      if (!resolvedName || resolvedName.toLowerCase() === 'loja') {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if ((parts[0] === 'loja' || parts[0] === 'l') && parts[1]) {
          resolvedName = decodeURIComponent(parts[1]);
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
        .slice(0, 18)
    : 'loja';

  const urlSlug = resolvedName
    ? resolvedName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32)
    : 'loja';

  const hasCompanyInLink = (candidate: string) => {
    const lower = candidate.toLowerCase();
    return (
      lower.includes(cleanSlug.slice(0, 6)) ||
      lower.includes(urlSlug.slice(0, 6)) ||
      lower.includes('/loja/')
    );
  };

  // 0. Primary: Fast server-side proxy (CORS-free, bypasses adblockers and mobile restrictions)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const apiRes = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: longUrl, storeName: resolvedName || storeName }),
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
        hasCompanyInLink(data.shortUrl)
      ) {
        return data.shortUrl;
      }
    }
  } catch {
    // fallback below
  }

  // Deterministic 4-char hash of full URL so updated products always get a fresh custom link
  let h = 0;
  for (let i = 0; i < longUrl.length; i++) {
    h = ((h << 5) - h + longUrl.charCodeAt(i)) | 0;
  }
  const urlHash = Math.abs(h).toString(36).slice(0, 4).padStart(4, '0');

  // 1. Try is.gd directly via POST with custom slug containing company name + catalog hash
  if (cleanSlug) {
    const customCandidates = [
      `loja_${cleanSlug.slice(0, 18)}_${urlHash}`,
      `loja_${cleanSlug.slice(0, 14)}_${urlHash}${Math.floor(Math.random() * 90 + 10)}`
    ];
    for (const customParam of customCandidates) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const res = await fetch('https://is.gd/create.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            format: 'simple',
            shorturl: customParam,
            url: longUrl
          }).toString(),
          signal: controller.signal
        });
        clearTimeout(timer);
        if (res.ok) {
          const text = (await res.text()).trim();
          if (
            (text.startsWith('http://') || text.startsWith('https://')) &&
            !text.includes('Error') &&
            !text.includes('da.gd') &&
            hasCompanyInLink(text)
          ) {
            return text;
          }
        }
      } catch {}
    }
  }

  // Fallback: ALWAYS return official direct store URL with company name AND preserve ?p= products if present
  let origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://ais-pre-i3xnc7zdrcnzwzesrvdnvw-849259028633.us-east1.run.app';
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  let extraSearch = '';
  try {
    const parsedLong = new URL(longUrl);
    if (parsedLong.searchParams.has('p')) {
      extraSearch = parsedLong.search;
    }
  } catch {}

  return `${origin}/loja/${encodeURIComponent(urlSlug || cleanSlug || 'loja')}${extraSearch}`;
}
