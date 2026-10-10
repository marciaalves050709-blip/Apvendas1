import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SellerProfile, BankProvider } from '../../types';
import { 
  formatPhoneDisplay, 
  formatPhoneToWhatsApp 
} from '../../utils/whatsappHelper';
import { 
  generatePixPayload, 
  BANKS_LIST, 
  sounds 
} from '../../utils/pixHelper';
import QRCode from 'qrcode';
import { 
  Phone, 
  QrCode, 
  Copy, 
  Check, 
  User, 
  Plus, 
  Trash2, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  X, 
  CreditCard,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Send
} from 'lucide-react';

interface SellerWhatsappModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SellerWhatsappModal: React.FC<SellerWhatsappModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    sellers,
    activeSeller,
    activeSellerId,
    setActiveSellerId,
    addSeller,
    updateSeller,
    deleteSeller,
    paymentSettings,
    showToast,
  } = useApp();

  // Selected seller ID for editing in the modal
  const [selectedSellerId, setSelectedSellerId] = useState<string>(activeSellerId || sellers[0]?.id || 'vendedor_principal');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<SellerProfile['pixKeyType']>('PHONE');
  const [merchantName, setMerchantName] = useState('');
  const [merchantCity, setMerchantCity] = useState('Barcarena PA');
  const [receivingBank, setReceivingBank] = useState<BankProvider>('NUBANK');

  // Preview QR code state
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');
  const [previewPixPayload, setPreviewPixPayload] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Current editing seller
  const currentEditingSeller = useMemo(() => {
    return sellers.find(s => s.id === selectedSellerId) || sellers[0];
  }, [sellers, selectedSellerId]);

  // Sync state when selected seller changes or when modal opens
  useEffect(() => {
    if (isCreatingNew) {
      setName('');
      setWhatsapp('55');
      setPixKey('');
      setPixKeyType('PHONE');
      setMerchantName('');
      setMerchantCity(paymentSettings.merchantCity || 'Barcarena PA');
      setReceivingBank(paymentSettings.receivingBank || 'NUBANK');
    } else if (currentEditingSeller) {
      setName(currentEditingSeller.name);
      setWhatsapp(currentEditingSeller.whatsapp);
      setPixKey(currentEditingSeller.pixKey);
      setPixKeyType(currentEditingSeller.pixKeyType || 'PHONE');
      setMerchantName(currentEditingSeller.merchantName || currentEditingSeller.name);
      setMerchantCity(currentEditingSeller.merchantCity || paymentSettings.merchantCity || 'Barcarena PA');
      setReceivingBank(currentEditingSeller.receivingBank || paymentSettings.receivingBank || 'NUBANK');
    }
  }, [currentEditingSeller, isCreatingNew, isOpen, paymentSettings]);

  // Generate Live QR Code Preview
  useEffect(() => {
    const keyToUse = pixKey.trim() || '993192405';
    const nameToUse = (merchantName.trim() || name.trim() || 'VENDEDOR').toUpperCase();
    const cityToUse = (merchantCity.trim() || 'Barcarena PA');

    try {
      const pixObj = generatePixPayload({
        pixKey: keyToUse,
        merchantName: nameToUse,
        merchantCity: cityToUse,
        amount: 25.00, // Demo amount for testing
        txId: 'TESTEVEND' + Math.floor(100 + Math.random() * 900),
      });

      setPreviewPixPayload(pixObj.payload);

      QRCode.toDataURL(pixObj.payload, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).then(url => {
        setPreviewQrUrl(url);
      }).catch(() => {
        setPreviewQrUrl('');
      });
    } catch {
      setPreviewPixPayload('');
      setPreviewQrUrl('');
    }
  }, [pixKey, merchantName, name, merchantCity]);

  if (!isOpen) return null;

  const handlePhoneInputChange = (val: string) => {
    setWhatsapp(val);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) {
      showToast('error', 'Nome Obrigatório', 'Digite o nome do vendedor.');
      return;
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanWhatsapp.length < 8) {
      showToast('error', 'WhatsApp Inválido', 'Digite o DDD + Número de WhatsApp do vendedor.');
      return;
    }

    const cleanPixKey = pixKey.trim();
    if (!cleanPixKey) {
      showToast('error', 'Chave Pix Obrigatória', 'Digite a chave Pix para este vendedor receber os pagamentos.');
      return;
    }

    const formattedCity = merchantCity.trim() || 'Barcarena PA';
    const finalMerchantName = merchantName.trim() || cleanName;

    if (isCreatingNew) {
      const created = addSeller({
        name: cleanName,
        whatsapp: cleanWhatsapp,
        pixKey: cleanPixKey,
        pixKeyType,
        merchantName: finalMerchantName,
        merchantCity: formattedCity,
        receivingBank,
      });
      setIsCreatingNew(false);
      setSelectedSellerId(created.id);
      showToast('success', 'Vendedor Adicionado!', `Vendedor ${cleanName} cadastrado com Pix próprio.`);
      try { sounds.playMoneyReceivedSound(); } catch { /* ignore */ }
    } else if (currentEditingSeller) {
      updateSeller(currentEditingSeller.id, {
        name: cleanName,
        whatsapp: cleanWhatsapp,
        pixKey: cleanPixKey,
        pixKeyType,
        merchantName: finalMerchantName,
        merchantCity: formattedCity,
        receivingBank,
      });
      showToast('success', 'Pix & WhatsApp Atualizados!', `Dados do vendedor ${cleanName} atualizados com sucesso.`);
      try { sounds.playMoneyReceivedSound(); } catch { /* ignore */ }
    }
  };

  const handleSelectAsActive = (sellerId: string) => {
    setActiveSellerId(sellerId);
    setSelectedSellerId(sellerId);
    const target = sellers.find(s => s.id === sellerId);
    showToast('success', 'Vendedor Ativo Alterado!', `Agora os pedidos e o Pix da loja vão para ${target?.name || 'este vendedor'}.`);
    try { sounds.playBankNotification(); } catch { /* ignore */ }
  };

  const handleDelete = (sellerId: string) => {
    if (confirm('Tem certeza que deseja excluir este vendedor?')) {
      const ok = deleteSeller(sellerId);
      if (ok) {
        showToast('info', 'Vendedor Removido', 'O vendedor foi excluído.');
        const remaining = sellers.filter(s => s.id !== sellerId);
        if (remaining.length > 0) {
          setSelectedSellerId(remaining[0].id);
        }
      }
    }
  };

  const handleCopyKey = () => {
    if (pixKey.trim()) {
      navigator.clipboard.writeText(pixKey.trim());
      setCopiedKey(true);
      showToast('info', 'Chave Pix Copiada!', 'Chave Pix copiada para a área de transferência.');
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyPayload = () => {
    if (previewPixPayload) {
      navigator.clipboard.writeText(previewPixPayload);
      setCopiedPayload(true);
      showToast('info', 'Pix Copia e Cola!', 'Código Pix BR Code copiado com sucesso.');
      setTimeout(() => setCopiedPayload(false), 2000);
    }
  };

  const activeBankObj = BANKS_LIST.find(b => b.id === receivingBank) || BANKS_LIST[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-xs">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>WhatsApp & Pix do Vendedor</span>
                <span className="text-[10px] bg-emerald-400/30 text-emerald-100 font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-300/30">
                  Recebimento Direto
                </span>
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                Altere o Pix e WhatsApp de cada vendedor para receber o dinheiro das compras e gerar o QR Code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Top Banner explaining how it works */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-xs text-emerald-950">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                Cada vendedor pode ter seu próprio WhatsApp e chave Pix para receber o dinheiro das vendas!
              </p>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                Quando o cliente fizer um pedido na Loja Mobile, o QR Code de pagamento será gerado com o Pix do vendedor selecionado, o dinheiro cairá diretamente na conta dele e o pedido será enviado no WhatsApp dele.
              </p>
            </div>
          </div>

          {/* Seller Selection / Management Cards */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Vendedores Cadastrados ({sellers.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(true);
                  setSelectedSellerId('');
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Novo Vendedor</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {sellers.map((s) => {
                const isActive = s.id === activeSellerId;
                const isSelected = !isCreatingNew && s.id === selectedSellerId;
                const bank = BANKS_LIST.find(b => b.id === s.receivingBank) || BANKS_LIST[0];

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setIsCreatingNew(false);
                      setSelectedSellerId(s.id);
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer relative text-left ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute -top-2 right-2 px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black rounded-full shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        ATIVO NA LOJA
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-xs text-slate-900 truncate">{s.name}</p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                          <Phone className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{formatPhoneDisplay(s.whatsapp)}</span>
                        </p>
                        <p className="text-[10px] text-slate-600 font-mono mt-1 truncate bg-slate-100 px-1.5 py-0.5 rounded-md">
                          Pix: {s.pixKey}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-600">{bank.shortName}</span>
                          <span className="text-[10px] text-slate-400">• {s.merchantCity || 'Barcarena PA'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1">
                      {!isActive ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAsActive(s.id);
                          }}
                          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          <span>Ativar na Loja</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Recebendo Vendas
                        </span>
                      )}

                      {sellers.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(s.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Excluir este vendedor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form + QR Code Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2 border-t border-slate-200">
            {/* Form Column (7 cols) */}
            <form onSubmit={handleSave} className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <span>{isCreatingNew ? 'Cadastrar Novo Vendedor' : `Editar Pix de: ${name || 'Vendedor'}`}</span>
                </h3>
                {isCreatingNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNew(false);
                      if (sellers.length > 0) setSelectedSellerId(sellers[0].id);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {/* Nome do Vendedor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome do Vendedor / Atendente *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Márcia Alves ou Carlos Vendedor"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-emerald-600 rounded-xl text-xs font-semibold text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* WhatsApp do Vendedor */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp para Receber os Pedidos *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: 5511999998888 ou 91 98765-4321"
                    value={whatsapp}
                    onChange={e => handlePhoneInputChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-emerald-600 rounded-xl text-xs font-semibold text-slate-900 outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Formatado para WhatsApp: <strong className="text-emerald-700">{formatPhoneToWhatsApp(whatsapp)}</strong> ({formatPhoneDisplay(whatsapp)})
                </p>
              </div>

              {/* Chave Pix e Tipo de Chave */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    Chave Pix para Receber o Dinheiro das Compras *
                  </label>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Padrão Banco Central
                  </span>
                </div>

                {/* Tipo de Chave Selector */}
                <div className="grid grid-cols-5 gap-1.5">
                  {(['PHONE', 'CPF', 'EMAIL', 'CNPJ', 'RANDOM'] as const).map(type => {
                    const labels: Record<string, string> = {
                      PHONE: 'Celular',
                      CPF: 'CPF',
                      EMAIL: 'E-mail',
                      CNPJ: 'CNPJ',
                      RANDOM: 'Aleatória',
                    };
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPixKeyType(type)}
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          pixKeyType === type
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {labels[type]}
                      </button>
                    );
                  })}
                </div>

                {/* Input Chave Pix */}
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder={
                      pixKeyType === 'PHONE' ? 'Ex: 993192405 ou 11999998888' :
                      pixKeyType === 'CPF' ? 'Ex: 123.456.789-00' :
                      pixKeyType === 'EMAIL' ? 'Ex: seuemail@gmail.com' :
                      pixKeyType === 'CNPJ' ? 'Ex: 12.345.678/0001-90' : 'Chave aleatória EVP'
                    }
                    value={pixKey}
                    onChange={e => setPixKey(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 focus:border-emerald-600 rounded-xl text-xs font-mono font-bold text-slate-900 outline-none transition-all"
                  />
                </div>

                {/* Titular / Favorecido na Conta */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nome do Titular da Conta Bancária (Favorecido)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: MARCIA ALVES (Como consta no banco)"
                    value={merchantName}
                    onChange={e => setMerchantName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-600 rounded-xl text-xs font-medium text-slate-900 outline-none"
                  />
                </div>

                {/* Banco de Recebimento */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-500" />
                    <span>Banco onde o Vendedor Recebe</span>
                  </label>
                  <select
                    value={receivingBank}
                    onChange={e => setReceivingBank(e.target.value as BankProvider)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-600 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
                  >
                    {BANKS_LIST.map(bank => (
                      <option key={bank.id} value={bank.id}>
                        {bank.name} ({bank.shortName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Cidade do Vendedor */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>Cidade do Estabelecimento / Vendedor</span>
                  </label>
                  <input
                    type="text"
                    value={merchantCity}
                    onChange={e => setMerchantCity(e.target.value)}
                    placeholder="Barcarena PA"
                    className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-emerald-600 rounded-xl text-xs font-medium text-slate-900 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Definido como <strong>Barcarena PA</strong> conforme padrão do estabelecimento.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isCreatingNew ? 'Cadastrar Vendedor & Ativar Pix' : 'Salvar Alterações do Vendedor'}</span>
                </button>
              </div>
            </form>

            {/* Live QR Code Preview Column (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-3xl p-4 flex flex-col items-center justify-between text-center space-y-3.5">
              <div className="w-full">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full inline-flex items-center gap-1">
                  <QrCode className="w-3 h-3" />
                  QR Code Pix ao Vivo do Vendedor
                </span>
                <p className="text-xs text-slate-600 font-bold mt-1.5 truncate">
                  {name || 'Vendedor Selecionado'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {activeBankObj.shortName} • {merchantCity || 'Barcarena PA'}
                </p>
              </div>

              {/* QR Code Container */}
              <div className="p-3 bg-white border-2 border-emerald-300 rounded-2xl shadow-sm relative group">
                {previewQrUrl ? (
                  <img
                    src={previewQrUrl}
                    alt="QR Code Pix do Vendedor"
                    className="w-44 h-44 mx-auto rounded-xl"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs font-medium">
                    Carregando QR Code...
                  </div>
                )}
                <div className="mt-2 text-[10px] font-mono text-slate-500 font-bold truncate max-w-[180px] mx-auto">
                  Chave: {pixKey || 'Informe a chave'}
                </div>
              </div>

              {/* Quick Actions for QR Code */}
              <div className="w-full space-y-2">
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Chave Copiada!' : 'Copiar Chave Pix'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyPayload}
                  className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <QrCode className="w-3.5 h-3.5 text-emerald-700" />}
                  <span>{copiedPayload ? 'Código BR Code Copiado!' : 'Copiar Pix Copia e Cola'}</span>
                </button>
              </div>

              {/* Info text */}
              <p className="text-[10px] text-slate-400 leading-tight">
                Vendas na loja do cliente serão creditadas automaticamente nesta conta via QR Code ou chave Copia e Cola.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Vendedor ativo no momento: <strong>{activeSeller?.name || 'Vendedor Principal'}</strong></span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
