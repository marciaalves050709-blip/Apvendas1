import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, generatePixPayload, generatePixE2EId, BANKS_LIST, sounds, SUBSCRIPTION_CONFIG } from '../../utils/pixHelper';
import { PixRadarScanner } from './PixRadarScanner';
import { 
  Lock, 
  ShieldAlert, 
  QrCode, 
  Copy, 
  Check, 
  Zap, 
  Send, 
  KeyRound, 
  Sparkles, 
  CheckCircle2, 
  RotateCcw, 
  Radio,
  Bell,
  ShieldCheck,
  Building2,
  CheckCheck,
  AlertCircle,
  Calendar,
  Eye,
  EyeOff,
  User,
  Phone,
  Crown
} from 'lucide-react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import { Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from '../pwa/PWAInstallModal';

export const AccessPaywall: React.FC = () => {
  const {
    subscription,
    isTrialExpired,
    isBlockedDueToDay5,
    isSubscribed,
    isMasterAdmin,
    isAdmin,
    setAdminMode,
    adminConfig,
    activateSubscription,
    resetTrial,
    nextDueDateFormatted,
    paymentSettings,
    isAccessAllowed,
    isTestBlockMode,
    exitTestBlockMode,
    checkAndApplyAdminCredentials
  } = useApp();

  const isBlocked = Boolean(isTestBlockMode || (!isAdmin && !isMasterAdmin && !isAccessAllowed));

  const { isInstalled, isIOS } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  const [radarPulseCount, setRadarPulseCount] = useState(0);
  const [selectedBankId, setSelectedBankId] = useState<string>(paymentSettings.receivingBank || 'NUBANK');

  const planPrice = subscription.planPrice || 94.98;

  const currentBank = useMemo(() => {
    return BANKS_LIST.find(b => b.id === selectedBankId) || BANKS_LIST[0];
  }, [selectedBankId]);

  // Live Radar Pulse Animation
  useEffect(() => {
    if (!isBlocked) return;
    const interval = setInterval(() => {
      setRadarPulseCount(c => c + 1);
    }, 1400);
    return () => clearInterval(interval);
  }, [isBlocked]);

  // Only render if access is blocked (either test block, trial expired or Day 5 passed without payment)
  if (!isBlocked) {
    return null;
  }

  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'CREDENTIALS' | 'PASSWORD'>('CREDENTIALS');

  const handleAdminBypass = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const targetUser = (adminUser || adminPass).trim();
    const targetPhone = (adminPhone || adminPass).trim();

    // Verify using central admin credentials logic
    const success = checkAndApplyAdminCredentials(targetUser, targetPhone);
    if (success) {
      exitTestBlockMode();
      setShowAdminLogin(false);
      setAdminUser('');
      setAdminPhone('');
      setAdminPass('');
      return;
    }

    setAdminError('Usuário ou telefone não reconhecido como administradora. Digite seu usuário e telefone cadastrados para liberar o acesso vitalício.');
  };

  const handleSendWhatsAppProof = () => {
    const cleanPhone = '5591993192405';
    const message = encodeURIComponent(
      `Olá Márcia! Realizei o pagamento via Pix da assinatura do App de Vendas no valor de ${formatCurrency(planPrice)}. Segue meu comprovante para confirmação!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-0 sm:p-6 overflow-y-auto">
      {/* Test Block Mode Banner for Admin */}
      {isTestBlockMode && (
        <div className="w-full max-w-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-4 py-2.5 sm:rounded-t-2xl text-xs font-black flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg shrink-0 border-b-2 border-amber-300">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-black/20 rounded text-sm">🧪</span>
            <span>
              MODO TESTE DE BLOQUEIO (ADMINISTRADORA): Este é o bloqueio total que o usuário não pago vê.
            </span>
          </div>
          <button
            type="button"
            onClick={exitTestBlockMode}
            className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 active:scale-95 text-amber-300 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md shrink-0"
          >
            <span>← Sair do Teste e Voltar ao Administrador</span>
          </button>
        </div>
      )}

      <div className={`w-full max-w-2xl bg-white h-[100dvh] sm:h-auto sm:max-h-[94dvh] ${isTestBlockMode ? 'sm:rounded-b-3xl' : 'sm:rounded-3xl'} shadow-2xl border-0 sm:border-2 border-rose-400 overflow-hidden my-auto animate-scale-up flex flex-col`}>
        {/* Paywall Header */}
        <div className="bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 text-white p-5 sm:p-6 text-center relative shrink-0">
          <div className="w-12 h-12 bg-rose-600/30 border-2 border-rose-400/50 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-lg backdrop-blur-md">
            <Lock className="w-6 h-6 text-rose-300" />
          </div>

          <div className="inline-block px-3 py-1 bg-rose-500/20 border border-rose-400/40 text-rose-300 font-black text-[10px] uppercase rounded-full tracking-wider mb-1.5">
            {isBlockedDueToDay5 
              ? '🚨 Vencimento do Dia 05 Ultrapassado' 
              : isTrialExpired 
              ? '⏳ Período de Teste de 2 Dias Concluído' 
              : '⛔ Acesso Bloqueado: Pagamento Pendente'}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {isBlockedDueToDay5 
              ? 'Acesso Bloqueado: Dia 05 Vencido' 
              : isTrialExpired 
              ? 'Acesso Bloqueado: Teste Expirado' 
              : 'Acesso Bloqueado por Não Pagamento'}
          </h2>

          <p className="text-xs sm:text-sm text-rose-200 mt-1 max-w-lg mx-auto leading-relaxed">
            {isBlockedDueToDay5 ? (
              <>
                A sua mensalidade venceu no <strong>dia 05</strong> e o acesso foi suspenso automaticamente por falta de pagamento. Realize o Pix de <strong>{formatCurrency(planPrice)}</strong> para restabelecer seu acesso imediatamente.
              </>
            ) : isTrialExpired ? (
              <>
                Seus 2 dias de teste grátis terminaram. Efetue o pagamento de <strong>{formatCurrency(planPrice)}</strong> via Pix para liberar o acesso imediato com vencimento todo dia 05.
              </>
            ) : (
              <>
                O acesso a esta conta está suspenso por falta de pagamento. Realize o Pix de <strong>{formatCurrency(planPrice)}</strong> ou insira o código de ativação para restabelecer o acesso.
              </>
            )}
          </p>

          {/* Direct Install Button for iPhone / Mobile Users */}
          {!isInstalled && (
            <div className="pt-3 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowInstallModal(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 active:scale-95 text-white border border-white/30 rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer backdrop-blur-xs"
                title={isIOS ? "Instalar aplicativo diretamente no iPhone" : "Instalar aplicativo no celular"}
              >
                <Smartphone className={`w-4 h-4 ${isIOS ? 'text-blue-300' : 'text-emerald-300'}`} />
                <span>{isIOS ? '📲 Instalar no iPhone (Adicionar à Tela de Início)' : '📲 Instalar Aplicativo no Celular'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Paywall Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* Price Offer Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Plano Mensal App vendas Pro
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-600" />
                  Vencimento Todo Dia 05
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">
                  {formatCurrency(planPrice)}
                </span>
                <span className="text-xs text-slate-500 font-bold">/mês</span>
              </div>
              <p className="text-[11px] text-emerald-900 font-semibold mt-0.5">
                📅 Vence todo dia 05 de cada mês • Liberação imediata pelo Banco
              </p>
            </div>

            <div className="space-y-1 text-xs text-slate-700 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Estoque Ilimitado & Alertas</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>PDV Caixa com Cupom de Venda</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Bloqueio Automático se não renovar dia 05</span>
              </div>
            </div>
          </div>

          {/* Real-Time Bank Webhook Radar Card */}
          <div className="p-3.5 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-slate-50 text-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  radarPulseCount % 2 === 0 ? 'bg-indigo-600 scale-125' : 'bg-amber-500 scale-95'
                } transition-transform duration-300`} />
                <span className="text-xs font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                  Radar Bancário em Tempo Real
                </span>
              </div>

              {/* Destination Bank Selector */}
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-800 cursor-pointer shadow-xs focus:outline-hidden focus:border-indigo-600"
                >
                  {BANKS_LIST.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.shortName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O sistema monitora a entrada de <strong>{formatCurrency(planPrice)}</strong> na conta do <strong>{currentBank.shortName}</strong>. Assim que o Pix for transferido, o alarme toca e o acesso é liberado no mesmo segundo!
            </p>
          </div>

          {/* Validated Pix Payment Box with Real-time Radar */}
          <PixRadarScanner 
            onPaymentConfirmed={(e2e) => {
              activateSubscription(undefined, `PIX-RADAR-${e2e}`);
            }}
            planPrice={planPrice}
          />

          {/* Direct Administrator Identification Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAdminLogin(true);
                setAdminError('');
              }}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 border border-amber-300 text-amber-950 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Crown className="w-4 h-4 text-amber-600" />
              <span>👑 Sou Administradora: Entrar com Usuário e Telefone</span>
            </button>
          </div>

        </div>

        {/* Paywall Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{paymentSettings.merchantName || 'Sistema'} • Liberação Imediata via Pix</span>
          
          {/* Discrete Administrator Access Link */}
          <button
            type="button"
            onClick={() => {
              setShowAdminLogin(true);
              setAdminError('');
            }}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
            title="Acesso da Administradora"
          >
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Acesso da Administradora</span>
          </button>
        </div>

        {/* Master Owner Identification Modal (User + Phone or Password) */}
        {showAdminLogin && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border-2 border-indigo-500 animate-scale-up space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-lg shadow-sm">
                    👑
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900 leading-tight">Identificação de Administradora</h4>
                    <p className="text-[10px] text-slate-500">Reconhecimento automático de Acesso Vitalício</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminLogin(false);
                    setAdminError('');
                  }}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Login Method Tabs */}
              <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('CREDENTIALS');
                    setAdminError('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    loginMethod === 'CREDENTIALS' 
                      ? 'bg-white text-indigo-700 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>Usuário & Telefone</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('PASSWORD');
                    setAdminError('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    loginMethod === 'PASSWORD' 
                      ? 'bg-white text-indigo-700 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Senha / Chave</span>
                </button>
              </div>

              <form onSubmit={handleAdminBypass} className="space-y-3">
                {loginMethod === 'CREDENTIALS' ? (
                  <>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Digite seu <strong>nome de usuário</strong> e <strong>número de telefone</strong> cadastrados para liberar o acesso vitalício gratuito imediatamente.
                    </p>

                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-indigo-600" />
                          <span>Seu Usuário / Nome</span>
                        </label>
                        <input
                          type="text"
                          value={adminUser}
                          onChange={e => {
                            setAdminUser(e.target.value);
                            setAdminError('');
                          }}
                          placeholder="Ex: Márcia Alves"
                          className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-xl focus:border-indigo-600 focus:outline-hidden font-medium text-slate-900 bg-slate-50 focus:bg-white"
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>Seu Telefone / WhatsApp</span>
                        </label>
                        <input
                          type="tel"
                          value={adminPhone}
                          onChange={e => {
                            setAdminPhone(e.target.value);
                            setAdminError('');
                          }}
                          placeholder="Ex: (91) 99319-2405"
                          className="w-full px-3 py-2 text-xs border border-indigo-200 rounded-xl focus:border-indigo-600 focus:outline-hidden font-medium text-slate-900 bg-slate-50 focus:bg-white"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-600">
                      Digite sua chave ou senha de administradora para liberar o sistema.
                    </p>

                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={adminPass}
                        onChange={e => {
                          setAdminPass(e.target.value);
                          setAdminError('');
                        }}
                        placeholder="Ex: MARCIA2026"
                        className="w-full pl-3 pr-10 py-2.5 text-xs border border-indigo-300 rounded-xl focus:border-indigo-600 focus:outline-hidden font-mono uppercase font-bold text-slate-900 bg-slate-50 focus:bg-white"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        title={showPassword ? 'Ocultar' : 'Visualizar'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </>
                )}

                {adminError && (
                  <p className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2 rounded-xl border border-rose-200">
                    {adminError}
                  </p>
                )}
                
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdminLogin(false);
                      setAdminUser('');
                      setAdminPhone('');
                      setAdminPass('');
                      setAdminError('');
                    }}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Liberar Vitalício</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* In-App Direct Installation Modal for iPhone / Mobile */}
      <PWAInstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
    </div>
  );
};
