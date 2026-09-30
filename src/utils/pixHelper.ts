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

export function generatePixPayload(params: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txId?: string;
}): { payload: string; txId: string } {
  const {
    pixKey,
    merchantName = 'DESCARTCLEAN',
    merchantCity = 'SAO PAULO',
    amount,
    txId = 'DESC' + Math.random().toString(36).substring(2, 8).toUpperCase(),
  } = params;

  // Clean strings
  const cleanKey = pixKey.trim();
  const cleanName = merchantName.substring(0, 25).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const cleanCity = merchantCity.substring(0, 15).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const formattedAmount = amount.toFixed(2);

  // Merchant Account Information
  const merchantAccountInfo =
    formatField('00', 'br.gov.bcb.pix') +
    formatField('01', cleanKey);

  // Additional Data Field Template
  const additionalDataField = formatField('05', txId);

  // Build raw payload without CRC
  let rawPayload =
    formatField('00', '01') + // Format indicator
    formatField('26', merchantAccountInfo) +
    formatField('52', '0000') + // Merchant category
    formatField('53', '986') + // Currency BRL
    formatField('54', formattedAmount) + // Amount
    formatField('58', 'BR') + // Country
    formatField('59', cleanName) + // Merchant name
    formatField('60', cleanCity) + // City
    formatField('62', additionalDataField) + // TxId
    '6304'; // CRC16 placeholder

  const crc = calculateCRC16(rawPayload);
  const payload = rawPayload + crc;

  return {
    payload,
    txId,
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

// Audio Feedback System using Web Audio API
class SoundPlayer {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Bank App Notification Pop Ping
  playBankNotification(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High-pitched double modern bell (880Hz -> 1760Hz)
      const freqs = [880, 1318.5, 1760];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.08 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.28);
      });
    } catch {
      // Audio context might be restricted
    }
  }

  // Money Received / Cash Register "Cha-ching" effect
  playMoneyReceivedSound(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      
      // Part 1: Ascending Major Arpeggio (C, E, G, C, E)
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.06);

        gain.gain.setValueAtTime(0, now + i * 0.06);
        gain.gain.linearRampToValueAtTime(0.25, now + i * 0.06 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.38);
      });

      // Part 2: Metallic cash register bell resonance
      setTimeout(() => {
        const ctxLater = this.getContext();
        if (!ctxLater) return;
        const t = ctxLater.currentTime;
        const bellOsc = ctxLater.createOscillator();
        const bellGain = ctxLater.createGain();

        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(2093, t); // High C7 bell

        bellGain.gain.setValueAtTime(0.2, t);
        bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

        bellOsc.connect(bellGain);
        bellGain.connect(ctxLater.destination);

        bellOsc.start(t);
        bellOsc.stop(t + 0.62);
      }, 260);
    } catch {
      // Audio context might be restricted
    }
  }

  // Pix Success Chime (3 ascending tones)
  playPixSuccess(): void {
    this.playMoneyReceivedSound();
  }

  // Card POS Beep
  playCardBeep(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(980, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

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
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [880, 1320].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.25);
      });
    } catch {
      // Ignore
    }
  }
}

export const sounds = new SoundPlayer();
