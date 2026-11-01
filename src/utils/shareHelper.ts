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
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
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
 */
export function buildStoreShareUrl(
  company: CompanyAccount,
  paymentSettings?: PaymentSettings,
  activeSeller?: SellerProfile,
  products?: Product[]
): string {
  let origin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-i3xnc7zdrcnzwzesrvdnvw-849259028633.us-east1.run.app';
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }

  const url = new URL(origin);
  url.searchParams.set('tab', 'client-store');
  url.searchParams.set('empresa', company.id || 'empresa_principal');

  // Add store metadata to ensure other devices load the correct store info
  if (company.name) {
    url.searchParams.set('nome', company.name);
  }
  if (company.logoEmoji) {
    url.searchParams.set('emoji', company.logoEmoji);
  }

  const zap = activeSeller?.whatsapp || paymentSettings?.merchantWhatsapp || company.phone;
  if (zap) {
    url.searchParams.set('zap', zap.replace(/\D/g, ''));
  }

  const pix = activeSeller?.pixKey || paymentSettings?.pixKey;
  if (pix) {
    url.searchParams.set('pix', pix);
  }

  const bank = activeSeller?.receivingBank || paymentSettings?.receivingBank;
  if (bank) {
    url.searchParams.set('banco', bank);
  }

  // If there are products, serialize a compact snapshot of up to 40 products for instant cross-device display
  if (products && products.length > 0) {
    try {
      const compact = products.slice(0, 40).map(p => ({
        id: p.id,
        n: p.name,
        p: p.salePrice,
        s: p.currentStock,
        c: p.category,
        u: p.unit,
        d: p.description ? p.description.slice(0, 60) : undefined,
        w: p.wholesalePrice || undefined,
        wq: p.wholesaleMinQty || undefined,
      }));
      const json = JSON.stringify(compact);
      // Encode safely
      url.searchParams.set('pdata', encodeURIComponent(json));
    } catch {
      // ignore serialization errors
    }
  }

  return url.toString();
}

/**
 * Builds a ready-to-share promotional message for WhatsApp & social media.
 */
export function buildStoreShareMessage(
  company: CompanyAccount,
  shareUrl: string,
  activeSeller?: SellerProfile
): string {
  const compName = company.name || 'Nossa Loja';
  const emoji = company.logoEmoji || '🏪';
  const sellerName = activeSeller?.name ? `Atendimento: ${activeSeller.name}\n` : '';

  return (
`${emoji} *CONHEÇA O NOSSO CATÁLOGO ONLINE - ${compName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━━
Olá! Preparamos nosso catálogo digital para você fazer seus pedidos com facilidade e rapidez pelo WhatsApp!

🛍️ *Acesse e faça seu pedido aqui:*
👉 ${shareUrl}

✨ *Vantagens de comprar conosco:*
• 🛵 *Entrega Local ou Retirada no Local*
• ⚡ *Pagamento rápido no Pix, Cartão ou Dinheiro*
• 📱 *Pedido enviado direto pro nosso WhatsApp*
${sellerName}
Acesse o link acima e confira todas as novidades!`
  );
}
