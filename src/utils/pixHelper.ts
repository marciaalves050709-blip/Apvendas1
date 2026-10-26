/**
 * Pix BR Code (EMVCo standard) & Audio Beep Engine
 * DescartClean - Sistema de Vendas e Controle de Estoque
 */

export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
}

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

function calculateCRC16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function formatPixKeyForBACEN(pixKey: string, keyType?: string): string {
  let clean = (pixKey || '').trim();
  const digits = clean.replace(/\D/g, '');

  // 1. Phone number (Brazil standard in BACEN requires E.164: +55 followed by DDD and 8-9 digits)
  if (
    keyType === 'PHONE' ||
    clean.startsWith('+55') ||
    (digits.length >= 10 && digits.length <= 11 && !clean.includes('@')) ||
    (digits.startsWith('55') && (digits.length === 12 || digits.length === 13))
  ) {
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      return `+${digits}`;
    }
    return `+55${digits}`;
  }

  // 2. CPF (11 digits, numbers only):
  if (keyType === 'CPF' || (digits.length === 11 && !clean.includes('@'))) {
    return digits;
  }

  // 3. CNPJ (14 digits, numbers only):
  if (keyType === 'CNPJ' || digits.length === 14) {
    return digits;
  }

  // 4. Email:
  if (clean.includes('@')) {
    return clean.toLowerCase();
  }

  // 5. EVP / Random Key (UUID):
  return clean.toLowerCase();
}

export function sanitizeMerchantCity(rawCity: string): string {
  if (!rawCity) return 'BARCARENA';
  let c = rawCity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  // Strip state suffix like ' PA', ' - PA', '/PA'
  c = c.replace(/[\s\-\/]+(PA|SP|RJ|MG|RS|PR|SC|BA|CE|PE|AM|GO|ES|DF|MT|MS|MA|RN|PB|AL|SE|PI|RO|TO|AC|AP|RR)$/i, '').trim();

  // Keep only uppercase letters and spaces
  c = c.replace(/[^A-Z\s]/g, '').replace(/\s+/g, ' ').trim();

  // Max 15 characters per BACEN spec
  c = c.substring(0, 15).trim();

  return c || 'BARCARENA';
}

export function sanitizeMerchantName(rawName: string): string {
  if (!rawName) return 'MARCIA ALVES';
  let n = rawName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  // Keep only letters, numbers and spaces
  n = n.replace(/[^A-Z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  // Max 25 characters per BACEN spec
  n = n.substring(0, 25).trim();

  return n || 'MARCIA ALVES';
}

export function generatePixPayload(params: {
  pixKey: string;
  merchantName?: string;
  merchantCity?: string;
  amount?: number;
  txId?: string;
  keyType?: string;
}): { payload: string; txId: string } {
  const {
    pixKey,
    merchantName = 'MARCIA ALVES',
    merchantCity = 'BARCARENA',
    amount = 0,
    txId = '***',
    keyType,
  } = params;

  // Format key according to BACEN DICT standard (+55 for phones, numbers-only for CPF/CNPJ, lowercase for email)
  const cleanKey = formatPixKeyForBACEN(pixKey, keyType);
  const cleanName = sanitizeMerchantName(merchantName);
  const cleanCity = sanitizeMerchantCity(merchantCity);

  // For Static Pix without a commercial PSP billing API, BACEN mandates txId to be '***'
  // When '***' is used, every banking app in Brazil accepts the Copia e Cola instantly!
  const cleanTxId = (txId && txId !== '***' && /^[a-zA-Z0-9]{1,25}$/.test(txId)) ? txId : '***';

  // Tag 26: Merchant Account Information
  const merchantAccountInfo =
    formatField('00', 'br.gov.bcb.pix') +
    formatField('01', cleanKey);

  // Tag 62: Additional Data Field (txId)
  const additionalDataField = formatField('05', cleanTxId);

  // Build raw payload without CRC (strictly complying with BACEN EMV BR Code standard)
  let rawPayload =
    formatField('00', '01') + // Tag 00: Payload Format Indicator (01)
    formatField('01', '11') + // Tag 01: Point of Initiation Method (11 = Static QR Code)
    formatField('26', merchantAccountInfo) + // Tag 26: Merchant Account Information
    formatField('52', '0000') + // Tag 52: Merchant Category Code (0000)
    formatField('53', '986'); // Tag 53: Transaction Currency (986 = BRL)

  // Tag 54: Transaction Amount (only include if > 0)
  if (amount && amount > 0) {
    rawPayload += formatField('54', amount.toFixed(2));
  }

  rawPayload +=
    formatField('58', 'BR') + // Tag 58: Country Code (BR)
    formatField('59', cleanName) + // Tag 59: Merchant Name (max 25)
    formatField('60', cleanCity) + // Tag 60: Merchant City (max 15)
    formatField('62', additionalDataField) + // Tag 62: Additional Data Template (txId)
    '6304'; // Tag 63: CRC16 placeholder

  const crc = calculateCRC16(rawPayload);
  const payload = rawPayload + crc;

  return {
    payload,
    txId: cleanTxId,
  };
}

// Generate End-to-End ID for Pix Transaction
export function generatePixE2EId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const randomHex = Array.from({ length: 20 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `E${dateStr}${randomHex}`.toUpperCase();
}

// Generate NSU & Authorization Code for Cards
export function generateCardAuth(): { nsu: string; authCode: string; terminal: string } {
  const nsu = Math.floor(100000 + Math.random() * 900000).toString();
  const authCode = 'AUT' + Math.floor(100000 + Math.random() * 900000).toString();
  const terminal = 'POS-' + Math.floor(1000 + Math.random() * 9000);
  return { nsu, authCode, terminal };
}

import { BankProvider } from '../types';

export interface BankConfig {
  id: BankProvider;
  name: string;
  shortName: string;
  color: string;
  textColor: string;
  bgLight: string;
  borderColor: string;
  tag: string;
}

export const BANKS_LIST: BankConfig[] = [
  {
    id: 'NUBANK',
    name: 'Nubank Instituição de Pagamento',
    shortName: 'Nubank PJ',
    color: '#820AD1',
    textColor: 'text-purple-700',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-200',
    tag: 'Nu PJ',
  },
  {
    id: 'ITAU',
    name: 'Itaú Unibanco S.A.',
    shortName: 'Itaú Empresas',
    color: '#EC7000',
    textColor: 'text-orange-700',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    tag: 'Itaú',
  },
  {
    id: 'BANCO_DO_BRASIL',
    name: 'Banco do Brasil S.A.',
    shortName: 'Banco do Brasil',
    color: '#0038A8',
    textColor: 'text-blue-800',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    tag: 'BB',
  },
  {
    id: 'BRADESCO',
    name: 'Banco Bradesco S.A.',
    shortName: 'Bradesco PJ',
    color: '#CC092F',
    textColor: 'text-rose-700',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200',
    tag: 'Bradesco',
  },
  {
    id: 'SANTANDER',
    name: 'Banco Santander Brasil S.A.',
    shortName: 'Santander Negócios',
    color: '#EC0000',
    textColor: 'text-red-700',
    bgLight: 'bg-red-50',
    borderColor: 'border-red-200',
    tag: 'Santander',
  },
  {
    id: 'STONE',
    name: 'Stone Pagamentos / Conta Stone',
    shortName: 'Stone Conta PJ',
    color: '#00A868',
    textColor: 'text-emerald-700',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    tag: 'Stone',
  },
  {
    id: 'MERCADOPAGO',
    name: 'Mercado Pago Instituição de Pagamento',
    shortName: 'Mercado Pago Negócios',
    color: '#009EE3',
    textColor: 'text-sky-700',
    bgLight: 'bg-sky-50',
    borderColor: 'border-sky-200',
    tag: 'Mercado Pago',
  },
  {
    id: 'PAGBANK',
    name: 'PagBank PagSeguro',
    shortName: 'PagBank PJ',
    color: '#00B06F',
    textColor: 'text-teal-700',
    bgLight: 'bg-teal-50',
    borderColor: 'border-teal-200',
    tag: 'PagBank',
  },
  {
    id: 'INTER',
    name: 'Banco Inter S.A.',
    shortName: 'Banco Inter Empresas',
    color: '#FF7A00',
    textColor: 'text-amber-700',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    tag: 'Inter PJ',
  },
  {
    id: 'C6BANK',
    name: 'C6 Bank S.A.',
    shortName: 'C6 Bank Empresas',
    color: '#242424',
    textColor: 'text-slate-800',
    bgLight: 'bg-slate-100',
    borderColor: 'border-slate-300',
    tag: 'C6 Bank',
  },
];

// Audio Feedback System using Web Audio API (100% Crash-Proof)
class SoundPlayer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Bank App Notification Pop Ping
  playBankNotification(): void {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const freqs = [880, 1318.5, 1760];
      freqs.forEach((freq, idx) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          // Web Audio API requires positive non-zero value before exponential ramp
          gain.gain.setValueAtTime(0.001, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.02);
          gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.28);
        } catch {
          // ignore individual node failure
        }
      });
    } catch {
      // Audio context might be restricted
    }
  }

  // Money Received / Cash Register "Cha-ching" effect
  playMoneyReceivedSound(): void {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      
      // Part 1: Ascending Major Arpeggio (C, E, G, C, E)
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);

          gain.gain.setValueAtTime(0.001, now + i * 0.06);
          gain.gain.linearRampToValueAtTime(0.22, now + i * 0.06 + 0.015);
          gain.gain.linearRampToValueAtTime(0.001, now + i * 0.06 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.38);
        } catch {
          // ignore
        }
      });

      // Part 2: Metallic cash register bell resonance
      setTimeout(() => {
        try {
          const ctxLater = this.getContext();
          if (!ctxLater || ctxLater.state !== 'running') return;
          const t = ctxLater.currentTime;
          const bellOsc = ctxLater.createOscillator();
          const bellGain = ctxLater.createGain();

          bellOsc.type = 'sine';
          bellOsc.frequency.setValueAtTime(2093, t);

          bellGain.gain.setValueAtTime(0.001, t);
          bellGain.gain.linearRampToValueAtTime(0.18, t + 0.02);
          bellGain.gain.linearRampToValueAtTime(0.001, t + 0.55);

          bellOsc.connect(bellGain);
          bellGain.connect(ctxLater.destination);

          bellOsc.start(t);
          bellOsc.stop(t + 0.58);
        } catch {
          // ignore
        }
      }, 260);
    } catch {
      // Audio context might be restricted
    }
  }

  // Pix Success Chime (3 ascending tones)
  playPixSuccess(): void {
    try {
      this.playMoneyReceivedSound();
    } catch {
      // ignore
    }
  }

  // Card POS Beep
  playCardBeep(): void {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(980, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore
    }
  }

  // Card Approved 2-Beep Chime
  playCardApproved(): void {
    try {
      const ctx = this.getContext();
      if (!ctx || ctx.state !== 'running') return;

      const now = ctx.currentTime;
      [880, 1320].forEach((freq, idx) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          gain.gain.setValueAtTime(0.001, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.02);
          gain.gain.linearRampToValueAtTime(0.001, now + idx * 0.12 + 0.22);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.25);
        } catch {
          // ignore
        }
      });
    } catch {
      // Ignore
    }
  }
}

export const sounds = new SoundPlayer();

export const getAdminPixKey = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem('appvendas_custom_admin_pix');
      if (custom && custom.trim()) return custom.trim();
    } catch {}
  }
  return '91993192405';
};

// Master Subscription Pix Configuration
export const SUBSCRIPTION_CONFIG = {
  monthlyPrice: 94.98,
  get pixKey() {
    return getAdminPixKey();
  },
  merchantName: 'MARCIA ALVES',
  merchantCity: 'BARCARENA',
  adminEmail: 'marciaalves050709@gmail.com',
  planName: 'Plano Mensal Pro - Sistema de Vendas & Estoque',
};

export function generateSubscriptionPix(txIdSuffix?: string): { payload: string; txId: string; pixKey: string; amount: number; merchantName: string } {
  const pix = generatePixPayload({
    pixKey: SUBSCRIPTION_CONFIG.pixKey,
    merchantName: SUBSCRIPTION_CONFIG.merchantName,
    merchantCity: SUBSCRIPTION_CONFIG.merchantCity,
    amount: SUBSCRIPTION_CONFIG.monthlyPrice,
    txId: '***',
  });

  return {
    payload: pix.payload,
    txId: '***',
    pixKey: SUBSCRIPTION_CONFIG.pixKey,
    amount: SUBSCRIPTION_CONFIG.monthlyPrice,
    merchantName: SUBSCRIPTION_CONFIG.merchantName,
  };
}

/**
 * Calculates the next Day 5 due date.
 * Recurring rule: Due every Day 5 of the month at 23:59:59.
 * If forceNextMonth is true (upon renewal/activation) or if current day > 5:
 *   returns Day 5 of the next month.
 * Otherwise returns Day 5 of current month.
 */
export function calculateNextDay5Expiry(fromDate: Date = new Date(), forceNextMonth: boolean = false): Date {
  const d = new Date(fromDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  if (forceNextMonth || day > 5) {
    return new Date(year, month + 1, 5, 23, 59, 59, 999);
  }
  return new Date(year, month, 5, 23, 59, 59, 999);
}

/**
 * Formats a Date or ISO string into Brazilian date format (DD/MM/AAAA)
 */
export function formatDay5Date(date: Date | string | number): string {
  try {
    const d = typeof date === 'number' || typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '05 do próximo mês';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '05 do próximo mês';
  }
}
