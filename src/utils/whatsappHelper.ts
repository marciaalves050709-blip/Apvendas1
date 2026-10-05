import { CartItem, PaymentMethod, PaymentSettings } from '../types';
import { formatCurrency } from './pixHelper';

export interface CustomerOrderData {
  orderCode: string;
  customerName: string;
  customerPhone: string;
  deliveryType: 'ENTREGA' | 'RETIRADA';
  deliveryAddress?: string;
  paymentMethod: PaymentMethod;
  cashChangeFor?: number;
  cart: CartItem[];
  cartSubtotal: number;
  cartDiscount: number;
  cartTotal: number;
  notes?: string;
  createdAt: string;
}

/**
 * Formats a Brazilian or International phone number to digits only (e.g. 5511999998888)
 */
export function formatPhoneToWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '5511999998888';
  
  // If already starts with 55 and has 12 or 13 digits
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  
  // If standard Brazilian mobile number (10 or 11 digits)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  
  return digits;
}

/**
 * Formats a phone number for display (e.g. (11) 99999-8888)
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

/**
 * Translates PaymentMethod to user-friendly Portuguese
 */
export function getPaymentMethodName(method: PaymentMethod, changeFor?: number): string {
  switch (method) {
    case 'PIX':
      return '⚡ Pix Instantâneo';
    case 'CARTAO_CREDITO':
      return '💳 Cartão de Crédito';
    case 'CARTAO_DEBITO':
      return '💳 Cartão de Débito';
    case 'DINHEIRO':
      return changeFor && changeFor > 0 
        ? `💵 Dinheiro (Troco para ${formatCurrency(changeFor)})`
        : '💵 Dinheiro';
    case 'A_PRAZO':
      return '📝 A Prazo / Faturado';
    default:
      return 'Outro';
  }
}

/**
 * Generates the formatted WhatsApp message for a client order
 */
export function buildWhatsAppOrderMessage(
  order: CustomerOrderData,
  settings: PaymentSettings
): string {
  const dateStr = new Date(order.createdAt).toLocaleDateString('pt-BR');
  const timeStr = new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  let msg = `🛒 *NOVO PEDIDO - ${(settings.merchantName || 'APPVENDAS').toUpperCase()}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📋 *Pedido:* \`#${order.orderCode}\`\n`;
  msg += `📅 *Data:* ${dateStr} às ${timeStr}\n\n`;
  
  msg += `👤 *DADOS DO CLIENTE*\n`;
  msg += `• *Nome:* ${order.customerName}\n`;
  msg += `• *WhatsApp:* ${formatPhoneDisplay(order.customerPhone)}\n`;
  msg += `• *Tipo:* ${order.deliveryType === 'ENTREGA' ? '🛵 Entrega em Domicílio' : '🏪 Retirar na Loja'}\n`;
  if (order.deliveryType === 'ENTREGA' && order.deliveryAddress) {
    msg += `• *Endereço:* ${order.deliveryAddress}\n`;
  }
  if (order.notes) {
    msg += `• *Observação:* ${order.notes}\n`;
  }
  msg += `\n`;
  
  msg += `📦 *ITENS DO PEDIDO*\n`;
  order.cart.forEach((item, index) => {
    const itemTotal = formatCurrency(item.total);
    const unitPrice = formatCurrency(item.unitPrice);
    const wholesaleTag = item.isWholesaleApplied ? ' *(Atacado)*' : '';
    msg += `${index + 1}. *${item.quantity}x* ${item.product.name}${wholesaleTag}\n`;
    msg += `   └ ${item.quantity} x ${unitPrice} = *${itemTotal}*\n`;
  });
  msg += `\n`;
  
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  if (order.cartDiscount > 0) {
    msg += `💰 *Subtotal:* ${formatCurrency(order.cartSubtotal)}\n`;
    msg += `🏷️ *Desconto:* -${formatCurrency(order.cartDiscount)}\n`;
  }
  msg += `💵 *TOTAL DO PEDIDO:* *${formatCurrency(order.cartTotal)}*\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  msg += `💳 *FORMA DE PAGAMENTO*\n`;
  msg += `• ${getPaymentMethodName(order.paymentMethod, order.cashChangeFor)}\n`;
  
  if (order.paymentMethod === 'PIX') {
    msg += `• *Chave Pix (${settings.pixKeyType}):* \`${settings.pixKey}\`\n`;
    msg += `• *Favorecido:* ${settings.merchantName}\n`;
    msg += `• *Banco:* ${settings.receivingBank}\n`;
    msg += `_(Por favor, anexe o comprovante do Pix após a transferência)_\n`;
  }
  
  msg += `\n✨ *Aguardando confirmação do vendedor!*`;
  
  return msg;
}

/**
 * Creates the WhatsApp click-to-chat URL
 */
export function generateWhatsAppLink(
  order: CustomerOrderData,
  settings: PaymentSettings
): string {
  const rawPhone = formatPhoneToWhatsApp(settings.merchantWhatsapp || '5511999998888');
  const message = buildWhatsAppOrderMessage(order, settings);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${rawPhone}?text=${encoded}`;
}
