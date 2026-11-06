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

  return `${origin}/?loja=${encodeURIComponent(storeSlug)}`;
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

  // Ultra-compact product serializer (up to 50 products)
  // Format: Name_Price_Stock_Unit_Category_WholesalePrice_WholesaleQty joined by '*'
  if (products && products.length > 0) {
    try {
      const compactItems = products.slice(0, 50).map(p => {
        const safeName = (p.name || 'Produto').replace(/[_*~|]/g, ' ').trim().slice(0, 32);
        const safeCat = (p.category || 'Outros').replace(/[_*~|]/g, ' ').trim().slice(0, 20);
        const price = Number(p.salePrice) || 0;
        const stock = Number(p.currentStock) || 0;
        const unit = (p.unit || 'UN').replace(/[_*~|]/g, '').trim().slice(0, 6);
        const wp = p.wholesalePrice ? Number(p.wholesalePrice) : '';
        const wq = p.wholesaleMinQty ? Number(p.wholesaleMinQty) : '';
        
        if (wp && wq) {
          return `${safeName}_${price}_${stock}_${unit}_${safeCat}_${wp}_${wq}`;
        }
        return `${safeName}_${price}_${stock}_${unit}_${safeCat}`;
      });

      url.searchParams.set('p', compactItems.join('*'));
    } catch {
      // ignore serialization errors
    }
  }

  // Automatically sync to backend in background if products are available
  if (typeof window !== 'undefined' && (products || company)) {
    syncStoreToServer(company, paymentSettings, activeSeller, products).catch(() => {});
  }

  return url.toString();
}

/**
 * Syncs the store catalog and payment data to the backend /api/stores/:slug.
 * Allows any device or customer to open the clean ?loja=nome link and see all products.
 */
export async function syncStoreToServer(
  company: CompanyAccount,
  paymentSettings?: PaymentSettings,
  activeSeller?: SellerProfile,
  products?: Product[]
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

    const res = await fetch(`/api/stores/${encodeURIComponent(storeSlug)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company,
        paymentSettings,
        activeSeller,
        products: products || []
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('[SyncStore] Offline or sync skipped:', err);
    return false;
  }
}

/**
 * Builds a ready-to-share promotional message for WhatsApp & social media.
 * Uses the short, clean link containing only the company name.
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

  return (
`${emoji} *CONHEÇA O NOSSO CATÁLOGO ONLINE - ${compName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━━
Olá! Preparamos nosso catálogo digital para você conferir nossos produtos e fazer seus pedidos com facilidade e rapidez pelo WhatsApp!

🛍️ *Clique no link da nossa loja abaixo:*

${shareUrl}

✨ *Vantagens de comprar conosco:*
• 🛵 *Entrega Local ou Retirada no Local*
• ⚡ *Pagamento facilitado no Pix, Cartão ou Dinheiro*
• 📱 *Pedido enviado direto pro nosso WhatsApp*
${sellerInfo}
Acesse o catálogo da ${compName} e aproveite!`
  );
}

/**
 * Shortens a URL using fast, reliable public shortener services with CORS support.
 * Attempts to embed the company name directly in the shortened slug (e.g. is.gd/loja_empresa).
 * Returns the shortened URL, or the original URL if network fails.
 */
export async function shortenUrl(longUrl: string, storeName?: string): Promise<string> {
  if (!longUrl) return '';

  // 0. Primary: Fast server-side proxy (CORS-free, bypasses adblockers and mobile restrictions)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const apiRes = await fetch('/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: longUrl, storeName }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (data && typeof data.shortUrl === 'string' && data.shortUrl.startsWith('http')) {
        return data.shortUrl;
      }
    }
  } catch {
    // fallback to direct client requests below
  }

  const cleanSlug = storeName
    ? storeName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 16)
    : '';

  // 1. Try is.gd with custom slug (e.g. is.gd/loja_empresa) - preserves all parameters!
  if (cleanSlug) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const customParam = `loja_${cleanSlug}`;
      const res = await fetch(`https://is.gd/create.php?format=simple&shorturl=${encodeURIComponent(customParam)}&url=${encodeURIComponent(longUrl)}`, {
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const text = (await res.text()).trim();
        if ((text.startsWith('http://') || text.startsWith('https://')) && !text.includes('Error')) {
          return text;
        }
      }
    } catch {}

    // Try with random suffix if slug is already taken
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const randomSuffix = Math.floor(Math.random() * 900 + 100);
      const customParam = `loja_${cleanSlug.slice(0, 12)}_${randomSuffix}`;
      const res = await fetch(`https://is.gd/create.php?format=simple&shorturl=${encodeURIComponent(customParam)}&url=${encodeURIComponent(longUrl)}`, {
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const text = (await res.text()).trim();
        if ((text.startsWith('http://') || text.startsWith('https://')) && !text.includes('Error')) {
          return text;
        }
      }
    } catch {}
  }

  // 2. Try da.gd with custom slug
  if (cleanSlug) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const customParam = `loja_${cleanSlug}`;
      const res = await fetch(`https://da.gd/s?url=${encodeURIComponent(longUrl)}&shorturl=${encodeURIComponent(customParam)}`, {
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const text = (await res.text()).trim();
        if ((text.startsWith('http://') || text.startsWith('https://')) && !text.includes('Error')) {
          return text;
        }
      }
    } catch {}
  }

  // 3. Try is.gd standard short URL (fast, clean, reliable)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      const text = (await res.text()).trim();
      if ((text.startsWith('http://') || text.startsWith('https://')) && !text.includes('Error')) {
        return text;
      }
    }
  } catch {}

  // 4. Try TinyURL
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      const text = (await res.text()).trim();
      if ((text.startsWith('http://') || text.startsWith('https://')) && !text.includes('Error')) {
        return text;
      }
    }
  } catch {}

  // 5. Try da.gd standard
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://da.gd/s?url=${encodeURIComponent(longUrl)}`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (res.ok) {
      const text = (await res.text()).trim();
      if ((text.startsWith('http://') || text.startsWith('https://')) && !text.includes('Error')) {
        return text;
      }
    }
  } catch {}

  // Fallback: return clean URL
  return longUrl;
}
