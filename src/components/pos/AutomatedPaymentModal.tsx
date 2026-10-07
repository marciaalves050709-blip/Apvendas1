import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { PaymentMethod, CardBrand, SplitPaymentItem, BankProvider } from '../../types';
import { 
  generatePixPayload, 
  generatePixE2EId, 
  generateCardAuth, 
  sounds,
  BANKS_LIST,
  BankConfig
} from '../../utils/pixHelper';
import { 
  QrCode, 
  CreditCard, 
  Banknote, 
  X, 
  CheckCircle2, 
  Copy, 
  Check, 
  Settings2, 
  Smartphone, 
  Wifi, 
  Layers, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck,
  Calendar,
  UserCheck,
  Sparkles,
  Bell,
  Volume2,
  Building2,
  Radio,
  Zap
} from 'lucide-react';

interface AutomatedPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AutomatedPaymentModal: React.FC<AutomatedPaymentModalProps> = ({ isOpen, onClose }) => {
  const { 
    cartTotal, 
    cartItemCount, 
    customers, 
    selectedCustomerId, 
    completeSale, 
    paymentSettings, 
    updatePaymentSettings,
    showToast 
  } = useApp();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('PIX');
  const [saleNotes, setSaleNotes] = useState('');
  
  // Pix States
  const [pixTxId, setPixTxId] = useState('');
  const [pixPayloadString, setPixPayloadString] = useState('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [pixStatus, setPixStatus] = useState<'WAITING' | 'DETECTING' | 'CONFIRMED'>('WAITING');
  const [pixTimeRemaining, setPixTimeRemaining] = useState(300); // 5 mins
  const [autoRadarActive, setAutoRadarActive] = useState(true);
  const [radarPulseCount, setRadarPulseCount] = useState(0);
  const pixCanvasRef = useRef<HTMLCanvasElement>(null);

  // Bank Notification Overlay Alert
  const [bankAlert, setBankAlert] = useState<{
    visible: boolean;
    bank: BankConfig;
    title: string;
    message: string;
    amount: number;
    method: 'PIX' | 'CARTAO' | 'DINHEIRO';
    e2eOrNsu: string;
    time: string;
  } | null>(null);

  // Card States (Credit & Debit)
  const [cardBrand, setCardBrand] = useState<CardBrand>('MASTERCARD');
  const [installments, setInstallments] = useState(1);
  const [cardStep, setCardStep] = useState<'IDLE' | 'READING' | 'PROCESSING' | 'APPROVED'>('IDLE');
  const [cardAuthData, setCardAuthData] = useState<{ nsu: string; authCode: string; terminal: string } | null>(null);

  // Cash States
  const [cashReceived, setCashReceived] = useState<string>('');

  // A Prazo (On Credit / Fiado) States
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Split Payment States
  const [splitItems, setSplitItems] = useState<SplitPaymentItem[]>([]);
  const [splitAmountInput, setSplitAmountInput] = useState<string>('');
  const [splitMethodInput, setSplitMethodInput] = useState<PaymentMethod>('PIX');

  // Config Drawer
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [editPixKey, setEditPixKey] = useState(paymentSettings.pixKey);
  const [editPixKeyType, setEditPixKeyType] = useState(paymentSettings.pixKeyType);
  const [editMerchantName, setEditMerchantName] = useState(paymentSettings.merchantName);
  const [editReceivingBank, setEditReceivingBank] = useState<BankProvider>(paymentSettings.receivingBank || 'NUBANK');
  const [editCardProvider, setEditCardProvider] = useState(paymentSettings.cardProvider);
  const [editSound, setEditSound] = useState(paymentSettings.soundEnabled);

  const activeBank = BANKS_LIST.find(b => b.id === (paymentSettings.receivingBank || 'NUBANK')) || BANKS_LIST[0];

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || {
    id: 'cust-4',
    name: 'Consumidor Balcão',
    document: '000.000.000-00',
    creditLimit: 1000,
    currentBalance: 0
  };

  // Format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Sync config inputs when paymentSettings change
  useEffect(() => {
    setEditPixKey(paymentSettings.pixKey);
    setEditPixKeyType(paymentSettings.pixKeyType);
    setEditMerchantName(paymentSettings.merchantName);
    setEditReceivingBank(paymentSettings.receivingBank || 'NUBANK');
    setEditCardProvider(paymentSettings.cardProvider);
    setEditSound(paymentSettings.soundEnabled);
  }, [paymentSettings]);

  // Generate Pix Payload whenever modal opens, total changes or settings change
  useEffect(() => {
    if (!isOpen || cartTotal <= 0) return;

    const { payload, txId } = generatePixPayload({
      pixKey: paymentSettings.pixKey,
      merchantName: paymentSettings.merchantName,
      merchantCity: paymentSettings.merchantCity,
      amount: cartTotal,
    });

    setPixPayloadString(payload);
    setPixTxId(txId);
    setPixStatus('WAITING');
    setPixTimeRemaining(300);
    setCardStep('IDLE');
    setCardAuthData(null);
    setCashReceived('');
    setCopiedPayload(false);
    setCopiedKey(false);
    setSplitItems([]);
    setBankAlert(null);

    // Draw QR Code to canvas
    if (pixCanvasRef.current) {
      QRCode.toCanvas(
        pixCanvasRef.current,
        payload,
        {
          width: 210,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('Erro gerando QR Code Pix', err);
        }
      );
    }
  }, [isOpen, cartTotal, paymentSettings]);

  // Redraw QR code when switching to PIX tab
  useEffect(() => {
    if (selectedMethod === 'PIX' && pixPayloadString && pixCanvasRef.current) {
      QRCode.toCanvas(
        pixCanvasRef.current,
        pixPayloadString,
        {
          width: 210,
          margin: 1.5,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err) => {
          if (err) console.error('Erro gerando QR Code Pix', err);
        }
      );
    }
  }, [selectedMethod, pixPayloadString]);

  // 5-minute countdown for Pix
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'PIX' || pixStatus === 'CONFIRMED') return;
    const interval = setInterval(() => {
      setPixTimeRemaining(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, selectedMethod, pixStatus]);

  // Webhook Live Pulse simulation (polls to show active banking connection)
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'PIX' || pixStatus !== 'WAITING') return;
    const interval = setInterval(() => {
      setRadarPulseCount(c => c + 1);
    }, 1200);
    return () => clearInterval(interval);
  }, [isOpen, selectedMethod, pixStatus]);

  // Copy Pix Raw Key
  const handleCopyPixKey = () => {
    if (!paymentSettings.pixKey) return;
    navigator.clipboard.writeText(paymentSettings.pixKey);
    setCopiedKey(true);
    showToast('success', 'Chave Copiada!', `Chave Pix (${paymentSettings.pixKey}) copiada com sucesso.`);
    setTimeout(() => setCopiedKey(false), 3000);
  };

  // Copy Copia e Cola String
  const handleCopyPixPayload = () => {
    if (!pixPayloadString) return;
    navigator.clipboard.writeText(pixPayloadString);
    setCopiedPayload(true);
    showToast('success', 'Pix Copia e Cola Copiado!', 'Código Pix BRCode copiado para a área de transferência.');
    setTimeout(() => setCopiedPayload(false), 3000);
  };

  // Instant Pix Detection & Alert on the spot (Dinheiro na Conta na Mesma Hora)
  const handleConfirmPixPayment = (instant = false) => {
    if (pixStatus === 'CONFIRMED') return;
    
    const e2eId = generatePixE2EId();
    const nowTime = new Date().toLocaleTimeString('pt-BR');

    const executeConfirmation = () => {
      setPixStatus('CONFIRMED');

      // Play authentic sound: Bank ping + Cha-ching money drop immediately
      if (paymentSettings.soundEnabled) {
        sounds.playBankNotification();
        setTimeout(() => sounds.playMoneyReceivedSound(), 140);
      }

      // Trigger Push Alert on screen
      setBankAlert({
        visible: true,
        bank: activeBank,
        title: `Transferência Pix Recebida!`,
        message: `Você recebeu ${formatCurrency(cartTotal)} de ${selectedCustomer.name}. O valor já está disponível na conta.`,
        amount: cartTotal,
        method: 'PIX',
        e2eOrNsu: e2eId,
        time: nowTime,
      });

      try {
        confetti({
          particleCount: 70,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }

      showToast('success', 'Dinheiro na Conta!', `Pix de ${formatCurrency(cartTotal)} creditado instantaneamente no ${activeBank.shortName}.`);

      // Finalize sale after operator sees the bank notification
      setTimeout(() => {
        const sale = completeSale('PIX', {
          notes: saleNotes,
          pixKey: paymentSettings.pixKey,
          pixTxId: pixTxId,
          pixE2EId: e2eId,
          pixPayload: pixPayloadString,
          bankReceived: activeBank.id,
        });

        if (sale) {
          onClose();
        }
      }, 1800);
    };

    if (instant) {
      executeConfirmation();
    } else {
      setPixStatus('DETECTING');
      setTimeout(() => {
        executeConfirmation();
      }, 400);
    }
  };

  // Card Processing Simulation with Gateway Credit Alert
  const handleSimulateCardTransaction = (type: 'APPROACH' | 'INSERT' | 'INSTANT') => {
    if (cardStep !== 'IDLE') return;

    if (paymentSettings.soundEnabled) {
      sounds.playCardBeep();
    }

    if (type === 'INSTANT') {
      const auth = generateCardAuth();
      setCardAuthData(auth);
      setCardStep('APPROVED');
      finalizeCardSale(auth);
      return;
    }

    setCardStep('READING');

    setTimeout(() => {
      if (paymentSettings.soundEnabled) {
        sounds.playCardBeep();
      }
      setCardStep('PROCESSING');

      setTimeout(() => {
        const auth = generateCardAuth();
        setCardAuthData(auth);
        setCardStep('APPROVED');

        // Play card approval and money credited sound
        if (paymentSettings.soundEnabled) {
          sounds.playCardApproved();
          setTimeout(() => sounds.playMoneyReceivedSound(), 250);
        }

        const isCredit = selectedMethod === 'CARTAO_CREDITO';
        const nowTime = new Date().toLocaleTimeString('pt-BR');

        // Trigger Push Alert from Card Provider / Bank
        setBankAlert({
          visible: true,
          bank: activeBank,
          title: `Venda no Cartão Aprovada & Creditada!`,
          message: `${isCredit ? `Crédito (${installments}x)` : 'Débito'} de ${formatCurrency(cartTotal)} autorizado via ${paymentSettings.cardProvider}. NSU: ${auth.nsu}`,
          amount: cartTotal,
          method: 'CARTAO',
          e2eOrNsu: `NSU-${auth.nsu}`,
          time: nowTime,
        });

        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }

        showToast('success', 'Cartão Aprovado!', `Valor de ${formatCurrency(cartTotal)} creditado no ${paymentSettings.cardProvider}.`);
        finalizeCardSale(auth);
      }, 1100);
    }, 900);
  };

  const finalizeCardSale = (auth: { nsu: string; authCode: string; terminal: string }) => {
    setTimeout(() => {
      const isCredit = selectedMethod === 'CARTAO_CREDITO';
      const sale = completeSale(isCredit ? 'CARTAO_CREDITO' : 'CARTAO_DEBITO', {
        notes: saleNotes,
        installments: isCredit ? installments : 1,
        cardBrand: cardBrand,
        cardNsu: auth.nsu,
        cardAuthCode: auth.authCode,
        cardTerminal: `${paymentSettings.cardProvider} ${auth.terminal}`,
        cardLast4: '•••• ' + Math.floor(1000 + Math.random() * 9000),
        bankReceived: activeBank.id,
      });

      if (sale) {
        onClose();
      }
    }, 1600);
  };

  // Cash Calculation
  const cashNum = parseFloat(cashReceived.replace(',', '.')) || 0;
  const changeValue = Math.max(0, cashNum - cartTotal);

  const handleFinishCashSale = () => {
    if (cashNum < cartTotal) {
      showToast('warning', 'Valor Insuficiente', 'O valor entregue em dinheiro é menor que o total.');
      return;
    }

    if (paymentSettings.soundEnabled) {
      sounds.playMoneyReceivedSound();
    }

    const sale = completeSale('DINHEIRO', {
      cashReceived: cashNum,
      change: changeValue,
      notes: saleNotes,
    });

    if (sale) {
      showToast('success', 'Venda em Dinheiro Registrada!', `Recebido: ${formatCurrency(cashNum)} | Troco: ${formatCurrency(changeValue)}`);
      onClose();
    }
  };

  // On Credit (A Prazo / Fiado)
  const handleFinishOnCreditSale = () => {
    if (selectedCustomer.id === 'cust-4') {
      showToast('warning', 'Cliente Obrigatório', 'Selecione um cliente cadastrado para vender no crediário / a prazo.');
      return;
    }

    const sale = completeSale('A_PRAZO', {
      notes: `${saleNotes ? saleNotes + ' | ' : ''}Vencimento: ${new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}`,
    });

    if (sale) {
      showToast('success', 'Venda a Prazo Registrada!', `Lançado no crediário de ${selectedCustomer.name} com vencimento para ${dueDate}.`);
      onClose();
    }
  };

  // Split Payment Calculations
  const splitTotalPaid = splitItems.reduce((sum, item) => sum + item.amount, 0);
  const splitRemaining = Math.max(0, cartTotal - splitTotalPaid);

  const handleAddSplitPayment = () => {
    const amt = parseFloat(splitAmountInput.replace(',', '.')) || 0;
    if (amt <= 0) {
      showToast('warning', 'Valor Inválido', 'Digite um valor maior que zero.');
      return;
    }
    if (amt > splitRemaining + 0.01) {
      showToast('warning', 'Valor Superior', `O valor restante a pagar é de apenas ${formatCurrency(splitRemaining)}.`);
      return;
    }

    const newItem: SplitPaymentItem = {
      method: splitMethodInput,
      amount: amt,
      authOrNsu: splitMethodInput.includes('CARTAO') ? 'NSU-' + Math.floor(100000 + Math.random() * 900000) : undefined,
      pixTxId: splitMethodInput === 'PIX' ? 'PIX-' + Math.random().toString(36).substring(2, 8).toUpperCase() : undefined,
    };

    setSplitItems(prev => [...prev, newItem]);
    setSplitAmountInput('');
    showToast('success', 'Parcela Adicionada', `${formatCurrency(amt)} adicionado via ${splitMethodInput}.`);
  };

  const handleRemoveSplitItem = (index: number) => {
    setSplitItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleFinishSplitSale = () => {
    if (splitRemaining > 0.01) {
      showToast('warning', 'Saldo Pendente', `Ainda restam ${formatCurrency(splitRemaining)} para completar o total.`);
      return;
    }

    if (paymentSettings.soundEnabled) {
      sounds.playMoneyReceivedSound();
    }

    const sale = completeSale('MISTO', {
      notes: saleNotes,
      splitPayments: splitItems,
    });

    if (sale) {
      onClose();
    }
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updatePaymentSettings({
      pixKey: editPixKey,
      pixKeyType: editPixKeyType as 'CNPJ' | 'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM',
      merchantName: editMerchantName,
      receivingBank: editReceivingBank,
      cardProvider: editCardProvider as 'STONE' | 'PAGBANK' | 'MERCADOPAGO' | 'CIELO' | 'REDE' | 'TEF',
      autoPixDetection: false,
      soundEnabled: editSound,
    });
    showToast('success', 'Configurações Salvas', 'Dados da Chave Pix, Banco e Maquininha atualizados.');
    setIsConfigOpen(false);
  };

  // Sound test button
  const handleTestSound = () => {
    sounds.playBankNotification();
    setTimeout(() => sounds.playMoneyReceivedSound(), 200);
    showToast('info', 'Som Testado!', 'Reproduzindo notificação bancária e alerta de caixa registradora.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[94dvh] max-w-3xl sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col relative">
        
        {/* ================= REAL-TIME BANKING PUSH NOTIFICATION ALERT ================= */}
        {bankAlert?.visible && (
          <div className="absolute top-4 left-4 right-4 z-60 animate-in slide-in-from-top-4 duration-200">
            <div className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl border-2 border-emerald-400/80 shadow-2xl flex items-start gap-3.5 ring-4 ring-emerald-500/20">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xs shrink-0 shadow-md"
                style={{ backgroundColor: bankAlert.bank.color }}
              >
                {bankAlert.bank.tag}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5 animate-bounce text-emerald-400" />
                      {bankAlert.bank.shortName}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">• {bankAlert.time}</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                    CONTA CREDITADA
                  </span>
                </div>

                <h4 className="font-extrabold text-white text-sm mt-0.5">{bankAlert.title}</h4>
                <p className="text-xs text-slate-200 mt-0.5 leading-snug">{bankAlert.message}</p>

                <div className="mt-2 flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                  <span>Autenticação: <strong className="text-emerald-400">{bankAlert.e2eOrNsu}</strong></span>
                  <span className="text-emerald-400 font-bold">Valor: {formatCurrency(bankAlert.amount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Finalização de Pagamento</h3>
              <p className="text-xs text-slate-300">
                {cartItemCount} itens • Cliente: <strong className="text-white">{selectedCustomer?.name}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestSound}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
              title="Testar alerta sonoro do banco"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Testar Som</span>
            </button>
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Configurar Chave Pix, Banco e Maquininha"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Configurar Banco & TEF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-Time Live Status Banner */}
        <div className="bg-slate-950 px-6 py-2.5 border-b border-slate-800 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-300">
              Conta de Recebimento: <strong className="text-white" style={{ color: activeBank.color }}>{activeBank.shortName}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              Webhook Ativo
            </span>
            <span>•</span>
            <span className="text-indigo-300">Maquininha: {paymentSettings.cardProvider}</span>
          </div>
        </div>

        {/* Total Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 px-6 py-3.5 text-white flex items-center justify-between border-b border-indigo-950">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-200 block">
              Total a Pagar
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white">
              {formatCurrency(cartTotal)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-indigo-200 block">Status do Caixa</span>
            <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/30 inline-flex items-center gap-1 mt-0.5 font-mono">
              <CheckCircle2 className="w-3 h-3" />
              Aguardando Pagamento
            </span>
          </div>
        </div>

        {/* Quick Settings Drawer if opened */}
        {isConfigOpen && (
          <form onSubmit={handleSaveSettings} className="p-4 bg-slate-100 border-b border-slate-300 text-xs flex flex-col gap-3 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-indigo-600" />
                Configurações da Conta Bancária e Maquininha
              </span>
              <button
                type="button"
                onClick={() => setIsConfigOpen(false)}
                className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Banco Receptor (Conta PJ)</label>
                <select
                  value={editReceivingBank}
                  onChange={e => setEditReceivingBank(e.target.value as BankProvider)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {BANKS_LIST.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.shortName} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Tipo da Chave Pix</label>
                <select
                  value={editPixKeyType}
                  onChange={e => setEditPixKeyType(e.target.value as 'CNPJ' | 'CPF' | 'EMAIL' | 'PHONE' | 'RANDOM')}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                >
                  <option value="CNPJ">CNPJ da Empresa</option>
                  <option value="CPF">CPF do Titular</option>
                  <option value="PHONE">Telefone / Celular</option>
                  <option value="EMAIL">E-mail</option>
                  <option value="RANDOM">Chave Aleatória (EVP)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Chave Pix da Loja</label>
                <input
                  type="text"
                  value={editPixKey}
                  onChange={e => setEditPixKey(e.target.value)}
                  placeholder="Ex: 12.345.678/0001-90"
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Nome do Titular / Razão Social</label>
                <input
                  type="text"
                  value={editMerchantName}
                  onChange={e => setEditMerchantName(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Operadora da Maquininha</label>
                <select
                  value={editCardProvider}
                  onChange={e => setEditCardProvider(e.target.value as 'STONE' | 'PAGBANK' | 'MERCADOPAGO' | 'CIELO' | 'REDE' | 'TEF')}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="STONE">Stone / Ton</option>
                  <option value="PAGBANK">PagBank / PagSeguro</option>
                  <option value="MERCADOPAGO">Mercado Pago Point</option>
                  <option value="CIELO">Cielo LIO / TEF</option>
                  <option value="REDE">Rede / Itaú</option>
                  <option value="TEF">TEF Dedicado / PinPad</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editSound}
                    onChange={e => setEditSound(e.target.checked)}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <span className="text-slate-800 font-bold text-xs">Alerta Sonoro de Dinheiro na Conta</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
              >
                Salvar Preferências
              </button>
            </div>
          </form>
        )}

        {/* Payment Methods Tabs */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-3 sm:grid-cols-6 gap-2">
          {/* Pix */}
          <button
            type="button"
            onClick={() => setSelectedMethod('PIX')}
            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
              selectedMethod === 'PIX'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-xs ring-2 ring-emerald-500/20'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${selectedMethod === 'PIX' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
              <QrCode className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold">Pix</span>
            <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-100/70 px-1 py-0.2 rounded-full">
              Chave & QR
            </span>
          </button>

          {/* Cartão Crédito */}
          <button
            type="button"
            onClick={() => setSelectedMethod('CARTAO_CREDITO')}
            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
              selectedMethod === 'CARTAO_CREDITO'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-xs ring-2 ring-indigo-500/20'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${selectedMethod === 'CARTAO_CREDITO' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold">C. Crédito</span>
            <span className="text-[9px] text-slate-500 font-medium">
              Até 12x
            </span>
          </button>

          {/* Cartão Débito */}
          <button
            type="button"
            onClick={() => setSelectedMethod('CARTAO_DEBITO')}
            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
              selectedMethod === 'CARTAO_DEBITO'
                ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold shadow-xs ring-2 ring-blue-500/20'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${selectedMethod === 'CARTAO_DEBITO' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
              <CreditCard className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold">C. Débito</span>
            <span className="text-[9px] text-slate-500 font-medium">
              À vista TEF
            </span>
          </button>

          {/* Dinheiro */}
          <button
            type="button"
            onClick={() => setSelectedMethod('DINHEIRO')}
            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
              selectedMethod === 'DINHEIRO'
                ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold shadow-xs ring-2 ring-amber-500/20'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${selectedMethod === 'DINHEIRO' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
              <Banknote className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold">Dinheiro</span>
            <span className="text-[9px] text-slate-500 font-medium">
              Com Troco
            </span>
          </button>

          {/* A Prazo / Fiado */}
          <button
            type="button"
            onClick={() => setSelectedMethod('A_PRAZO')}
            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
              selectedMethod === 'A_PRAZO'
                ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold shadow-xs ring-2 ring-teal-500/20'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${selectedMethod === 'A_PRAZO' ? 'bg-teal-600 text-white' : 'bg-teal-100 text-teal-700'}`}>
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold">A Prazo</span>
            <span className="text-[9px] text-slate-500 font-medium">
              Caderneta
            </span>
          </button>

          {/* Pagamento Misto */}
          <button
            type="button"
            onClick={() => setSelectedMethod('MISTO')}
            className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 text-center transition-all cursor-pointer ${
              selectedMethod === 'MISTO'
                ? 'border-purple-600 bg-purple-50 text-purple-950 font-bold shadow-xs ring-2 ring-purple-500/20'
                : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
            }`}
          >
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${selectedMethod === 'MISTO' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700'}`}>
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold">Misto</span>
            <span className="text-[9px] text-purple-700 font-semibold bg-purple-100/70 px-1 py-0.2 rounded-full">
              Dividir
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-4">
          {/* ===================== 1. PIX AUTOMATIZADO ===================== */}
          {selectedMethod === 'PIX' && (
            <div className="flex flex-col md:flex-row gap-5 items-center">
              {/* QR Code Canvas Frame */}
              <div className="flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-xs shrink-0 w-full sm:w-auto">
                <div className="relative p-2 bg-white rounded-xl border border-slate-300 shadow-xs">
                  <canvas ref={pixCanvasRef} className="rounded-lg" />
                  {pixStatus === 'CONFIRMED' && (
                    <div className="absolute inset-0 bg-emerald-600/95 rounded-xl flex flex-col items-center justify-center text-white p-4 animate-in zoom-in-90">
                      <CheckCircle2 className="w-14 h-14 text-white mb-2" />
                      <span className="font-black text-sm uppercase tracking-wider">Pix Identificado!</span>
                      <span className="text-[10px] font-mono mt-1 text-emerald-100">Dinheiro na Conta</span>
                    </div>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>Expira em:</span>
                  <span className="font-bold text-slate-800">
                    {Math.floor(pixTimeRemaining / 60)}:{(pixTimeRemaining % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Pix Info & Actions */}
              <div className="flex-1 w-full flex flex-col gap-3">
                {/* Real-time Status Card with Bank Identification & Webhook Radar */}
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                  pixStatus === 'CONFIRMED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-sm'
                    : pixStatus === 'DETECTING'
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-slate-900 border-slate-800 text-white shadow-md'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex items-center justify-center shrink-0">
                      {pixStatus === 'WAITING' && (
                        <span className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                        </span>
                      )}
                      {pixStatus === 'DETECTING' && (
                        <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                      )}
                      {pixStatus === 'CONFIRMED' && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className={`text-xs font-black uppercase tracking-wide flex items-center gap-1.5 ${pixStatus === 'WAITING' ? 'text-emerald-400' : ''}`}>
                        {pixStatus === 'WAITING' && (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                            <span>Radar Webhook Ativo • {activeBank.shortName}</span>
                          </>
                        )}
                        {pixStatus === 'DETECTING' && 'Detectando transferência no Banco Central...'}
                        {pixStatus === 'CONFIRMED' && `Dinheiro Creditado no ${activeBank.shortName}!`}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${pixStatus === 'WAITING' ? 'text-slate-300' : 'text-slate-600'}`}>
                        {pixStatus === 'WAITING' && 'Ouvindo conta bancária em tempo real. O alerta disparará na mesma hora que o dinheiro cair.'}
                        {pixStatus === 'DETECTING' && 'Validando crédito em conta...'}
                        {pixStatus === 'CONFIRMED' && 'Depósito confirmado com alerta sonoro e comprovante gerado.'}
                      </p>
                    </div>
                  </div>

                  {pixStatus === 'WAITING' && (
                    <div className="hidden sm:flex flex-col items-end shrink-0 text-right">
                      <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                        <Radio className="w-3 h-3 animate-pulse" />
                        Online
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">Ping: ~20ms</span>
                    </div>
                  )}
                </div>

                {/* Chave Pix e Favorecido em Destaque */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Chave Pix ({paymentSettings.pixKeyType}) • {activeBank.shortName}</span>
                    <span className="font-mono font-bold text-slate-900 text-sm block">{paymentSettings.pixKey}</span>
                    <span className="text-[10px] text-slate-500 block mt-0.5">Favorecido: <strong>{paymentSettings.merchantName}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyPixKey}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Copiar apenas a chave"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copiada!' : 'Copiar Chave'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfigOpen(true)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer px-1"
                    >
                      Alterar
                    </button>
                  </div>
                </div>

                {/* Copia e Cola Code */}
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Código Pix Copia e Cola (BR Code)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixPayloadString}
                      className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-600 truncate select-all focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPixPayload}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPayload ? 'Copiado!' : 'Copiar Código'}</span>
                    </button>
                  </div>
                </div>

                {/* Instant Identification & Bank Alert Trigger Buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    disabled={pixStatus !== 'WAITING'}
                    onClick={() => handleConfirmPixPayment(true)}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300 animate-bounce" />
                    <span>Identificar Dinheiro na Conta Agora ({formatCurrency(cartTotal)})</span>
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={pixStatus !== 'WAITING'}
                      onClick={() => handleConfirmPixPayment(false)}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                      <span>Simular Pix do Cliente</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestSound}
                      className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Ouvir Alerta Sonoro</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-center text-slate-500 font-medium">
                    ⚡ Ao detectar o Pix, o sistema emite o alerta visual e sonoro de crédito instantâneo na conta {activeBank.shortName}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===================== 2. CARTÃO CRÉDITO & DÉBITO ===================== */}
          {(selectedMethod === 'CARTAO_CREDITO' || selectedMethod === 'CARTAO_DEBITO') && (
            <div className="flex flex-col md:flex-row gap-5">
              {/* POS Machine Screen Graphic */}
              <div className="w-full md:w-64 bg-slate-900 rounded-3xl p-4 border-4 border-slate-800 shadow-xl flex flex-col justify-between text-white relative overflow-hidden shrink-0">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[10px] font-mono font-black uppercase text-emerald-400 tracking-widest">
                    {paymentSettings.cardProvider} POS
                  </span>
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                    <Wifi className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>ONLINE</span>
                  </div>
                </div>

                <div className="my-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center flex flex-col items-center justify-center min-h-[120px]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    {selectedMethod === 'CARTAO_CREDITO' ? 'Crédito' : 'Débito'} • {installments}x
                  </span>
                  <span className="text-xl font-black font-mono text-emerald-400 block">
                    {formatCurrency(cartTotal)}
                  </span>

                  {cardStep === 'IDLE' && (
                    <div className="mt-3 flex flex-col items-center">
                      <div className="flex items-center gap-1 text-indigo-400 animate-pulse text-[11px] font-semibold">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Aproxime ou Insira</span>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-0.5">NFC Contactless / Chip</span>
                    </div>
                  )}

                  {cardStep === 'READING' && (
                    <div className="mt-3 flex flex-col items-center">
                      <RefreshCw className="w-4 h-4 text-amber-400 animate-spin mb-1" />
                      <span className="text-[10px] font-bold text-amber-400">Lendo Cartão...</span>
                    </div>
                  )}

                  {cardStep === 'PROCESSING' && (
                    <div className="mt-3 flex flex-col items-center">
                      <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin mb-1" />
                      <span className="text-[10px] font-bold text-indigo-300">Creditando na Conta...</span>
                    </div>
                  )}

                  {cardStep === 'APPROVED' && (
                    <div className="mt-2 flex flex-col items-center text-emerald-400 animate-in zoom-in-95">
                      <CheckCircle2 className="w-6 h-6 mb-1" />
                      <span className="text-xs font-black uppercase">DINHEIRO CREDITADO!</span>
                      <span className="text-[9px] font-mono text-slate-400">NSU: {cardAuthData?.nsu}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800 opacity-60 text-center text-[10px] font-mono font-bold text-slate-400">
                  <div className="bg-slate-800 py-1 rounded">1</div>
                  <div className="bg-slate-800 py-1 rounded">2</div>
                  <div className="bg-slate-800 py-1 rounded">3</div>
                  <div className="bg-slate-800 py-1 rounded">4</div>
                  <div className="bg-slate-800 py-1 rounded">5</div>
                  <div className="bg-slate-800 py-1 rounded">6</div>
                  <div className="bg-amber-600/60 py-1 rounded text-white text-[8px]">CORR</div>
                  <div className="bg-slate-800 py-1 rounded">0</div>
                  <div className="bg-emerald-600 py-1 rounded text-white text-[8px]">ENTRA</div>
                </div>
              </div>

              {/* Card Controls & Actions */}
              <div className="flex-1 flex flex-col gap-3.5">
                {/* Brand Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Bandeira do Cartão
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {(['MASTERCARD', 'VISA', 'ELO', 'HIPERCARD', 'AMEX'] as CardBrand[]).map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setCardBrand(b)}
                        className={`py-2 px-1 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                          cardBrand === b
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Installments (Credit Only) */}
                {selectedMethod === 'CARTAO_CREDITO' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Parcelamento no Crédito
                    </label>
                    <select
                      value={installments}
                      onChange={e => setInstallments(parseInt(e.target.value))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600 cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 10, 12].map(n => {
                        const part = cartTotal / n;
                        return (
                          <option key={n} value={n}>
                            {n === 1 ? '1x à vista' : `${n}x de ${formatCurrency(part)}`} (Total: {formatCurrency(cartTotal)})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-1 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={cardStep !== 'IDLE'}
                      onClick={() => handleSimulateCardTransaction('APPROACH')}
                      className="p-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                    >
                      <Smartphone className="w-4 h-4 text-indigo-600" />
                      <span>Aproximar NFC</span>
                    </button>

                    <button
                      type="button"
                      disabled={cardStep !== 'IDLE'}
                      onClick={() => handleSimulateCardTransaction('INSERT')}
                      className="p-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98 disabled:opacity-50"
                    >
                      <CreditCard className="w-4 h-4 text-slate-700" />
                      <span>Inserir Chip</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={cardStep !== 'IDLE'}
                    onClick={() => handleSimulateCardTransaction('INSTANT')}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Bell className="w-4 h-4 text-emerald-200 animate-bounce" />
                    <span>Aprovar Cartão & Emitir Alerta de Crédito</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================== 3. DINHEIRO ===================== */}
          {selectedMethod === 'DINHEIRO' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Valor Entregue pelo Cliente (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-base">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={cartTotal.toFixed(2)}
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-2xl font-mono font-black text-slate-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Fast Bill Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCashReceived(cartTotal.toFixed(2))}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Valor Exato ({formatCurrency(cartTotal)})
                </button>
                {[20, 50, 100, 200].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setCashReceived(val.toFixed(2))}
                    className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-700 cursor-pointer shadow-2xs"
                  >
                    R$ {val.toFixed(0)}
                  </button>
                ))}
              </div>

              {/* Change Breakdown Card */}
              {cashNum > 0 && (
                <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                  cashNum >= cartTotal
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200'
                }`}>
                  <div>
                    <span className="text-xs font-bold text-slate-600 block">
                      {cashNum >= cartTotal ? 'Troco a Devolver:' : 'Valor Faltante:'}
                    </span>
                    <span className={`text-2xl font-black font-mono ${cashNum >= cartTotal ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatCurrency(cashNum >= cartTotal ? changeValue : cartTotal - cashNum)}
                    </span>
                  </div>

                  {cashNum >= cartTotal && (
                    <button
                      type="button"
                      onClick={handleFinishCashSale}
                      className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
                    >
                      Confirmar Dinheiro & Emitir Cupom
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===================== 4. A PRAZO / CREDIÁRIO ===================== */}
          {selectedMethod === 'A_PRAZO' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-teal-900 block">
                      {selectedCustomer.name}
                    </span>
                    <span className="text-[11px] text-teal-700 font-mono">
                      Doc: {selectedCustomer.document || 'Não informado'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-teal-700 uppercase font-bold block">Limite Disponível</span>
                  <span className="text-sm font-black font-mono text-teal-900">
                    {formatCurrency((selectedCustomer.creditLimit || 1000) - (selectedCustomer.currentBalance || 0))}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Data de Vencimento da Fatura / Promissória
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-teal-600"
                />
              </div>

              <button
                type="button"
                onClick={handleFinishOnCreditSale}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
              >
                Lançar Venda no Crediário do Cliente
              </button>
            </div>
          )}

          {/* ===================== 5. PAGAMENTO MISTO ===================== */}
          {selectedMethod === 'MISTO' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-900 block">
                    Divisão de Pagamento Multi-Métodos
                  </span>
                  <span className="text-[11px] text-purple-700">
                    Total Pago: <strong>{formatCurrency(splitTotalPaid)}</strong> de {formatCurrency(cartTotal)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-purple-700 uppercase font-bold block">Restante</span>
                  <span className={`text-base font-black font-mono ${splitRemaining === 0 ? 'text-emerald-600' : 'text-purple-900'}`}>
                    {formatCurrency(splitRemaining)}
                  </span>
                </div>
              </div>

              {/* Add form */}
              {splitRemaining > 0 && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={splitMethodInput}
                    onChange={e => setSplitMethodInput(e.target.value as PaymentMethod)}
                    className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="PIX">Pix ({activeBank.shortName})</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="DINHEIRO">Dinheiro</option>
                  </select>

                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Valor (máx ${splitRemaining.toFixed(2)})`}
                    value={splitAmountInput}
                    onChange={e => setSplitAmountInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold"
                  />

                  <button
                    type="button"
                    onClick={handleAddSplitPayment}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
              )}

              {/* List added */}
              {splitItems.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase">Valores Adicionados:</span>
                  {splitItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                      <span className="font-semibold text-slate-800">
                        {item.method.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSplitItem(idx)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer text-xs font-bold"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {splitRemaining === 0 && (
                <button
                  type="button"
                  onClick={handleFinishSplitSale}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  Concluir Venda Mista ({formatCurrency(cartTotal)})
                </button>
              )}
            </div>
          )}

          {/* Observações da Venda */}
          <div className="pt-2 border-t border-slate-200">
            <input
              type="text"
              placeholder="Observações do pedido ou comprovante (opcional)"
              value={saleNotes}
              onChange={e => setSaleNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancelar (ESC)
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>Operador: <strong className="text-slate-800">Admin PDV</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
