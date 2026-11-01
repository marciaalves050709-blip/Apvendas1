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
 * Builds the canonical public store URL for sharing.
 * If running on ais-dev-, converts to ais-pre- so outside clients can open it without auth.
 * Encodes store metadata and a compact catalog payload that fits effortlessly under WhatsApp & Cloud Run URL limits.
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

  const pathname = typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '/';
  const url = new URL(pathname, origin);

  // Nome da loja limpo e garantido no link
  const rawStoreName = (company?.name || paymentSettings?.merchantName || 'Minha Loja').trim();
  const storeSlug = rawStoreName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_áéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ]/g, '') || 'loja';

  // 1. O nome da loja é o primeiro parâmetro visível no link
  url.searchParams.set('loja', storeSlug);
  url.searchParams.set('nome', rawStoreName);
  url.searchParams.set('tab', 'client-store');
  url.searchParams.set('empresa', company?.id || 'empresa_principal');

  if (company?.logoEmoji) {
    url.searchParams.set('emoji', company.logoEmoji);
  }

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

  const sellerName = activeSeller?.name;
  if (sellerName && sellerName !== 'Atendente') {
    url.searchParams.set('vendedor', sellerName);
  }

  // Ultra-compact product serializer (up to 30 products)
  // Format: Name_Price_Stock_Unit_Category_WholesalePrice_WholesaleQty joined by '*'
  if (products && products.length > 0) {
    try {
      const compactItems = products.slice(0, 30).map(p => {
        // Sanitize delimiters from name and category
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

  return url.toString();
}

/**
 * Builds a ready-to-share promotional message for WhatsApp & social media.
 * Ensures the link is cleanly isolated on its own line so WhatsApp converts it to a rich clickable card preview.
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
 * Builds a minimalist, clean direct URL with the store name clearly in the link.
 * E.g.: https://ais-pre-...run.app/?loja=Minha-Empresa
 */
export function buildStoreCleanUrl(company: CompanyAccount, paymentSettings?: PaymentSettings): string {
  let origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://ais-pre-i3xnc7zdrcnzwzesrvdnvw-849259028633.us-east1.run.app';
  
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }

  const pathname = typeof window !== 'undefined' && window.location.pathname ? window.location.pathname : '/';
  const url = new URL(pathname, origin);

  const rawStoreName = (company?.name || paymentSettings?.merchantName || 'Minha Loja').trim();
  const storeSlug = rawStoreName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\-_áéíóúÁÉÍÓÚãõÃÕâêîôûÂÊÎÔÛçÇ]/g, '') || 'loja';

  // Super clean direct URL with only the store name
  url.searchParams.set('loja', storeSlug);

  return url.toString();
}

/**
 * Shortens a URL using fast, reliable public shortener services with CORS support.
 * Attempts to embed the company name directly in the shortened slug (e.g. da.gd/loja_empresa).
 * Returns the shortened URL, or the original long URL if network fails.
 */
export async function shortenUrl(longUrl: string, storeName?: string): Promise<string> {
  if (!longUrl) return '';

  const cleanSlug = storeName
    ? storeName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 16)
    : '';

  // 1. Try da.gd with custom company slug (e.g. da.gd/loja_empresa)
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

    // Try with random suffix if base slug is already registered
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const randomSuffix = Math.floor(Math.random() * 900 + 100);
      const customParam = `loja_${cleanSlug.slice(0, 12)}_${randomSuffix}`;
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

  // 2. Try da.gd standard short URL (fast, clean, CORS enabled)
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

  // 3. Try clck.ru (CORS enabled backup)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`https://clck.ru/--?url=${encodeURIComponent(longUrl)}`, {
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

  // Fallback: return original clean URL
  return longUrl;
}
