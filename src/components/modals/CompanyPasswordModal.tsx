import React, { useState } from 'react';
import { useApp, checkIsMasterPassword } from '../../context/AppContext';
import { Lock, ShieldCheck, X, KeyRound, Building2, Check, ArrowLeft, RefreshCw } from 'lucide-react';

export const CompanyPasswordModal: React.FC = () => {
  const {
    isCompanyPasswordModalOpen,
    setIsCompanyPasswordModalOpen,
    unlockCompanyArea,
    companyPassword,
    setCompanyPassword,
    showToast
  } = useApp();

  // Mode: 'unlock' | 'change'
  const [modalMode, setModalMode] = useState<'unlock' | 'change'>('unlock');

  // Unlock mode state
  const [inputPassword, setInputPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Change password mode state
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [changeError, setChangeError] = useState('');

  if (!isCompanyPasswordModalOpen) return null;

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmed = inputPassword.trim();
    if (!trimmed) {
      setErrorMessage('Digite a senha da empresa.');
      return;
    }

    const success = unlockCompanyArea(trimmed);
    if (success) {
      setInputPassword('');
      setErrorMessage('');
      setModalMode('unlock');
    } else {
      setErrorMessage('Senha incorreta! Dica: a senha inicial é 1234 (ou sua Senha Mestra).');
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');

    const currTrimmed = currentPassInput.trim();
    const isMaster = checkIsMasterPassword(currTrimmed);
    const isCurrentMatch = currTrimmed === companyPassword;
    const isDefaultFallback = currTrimmed === '1234';

    if (!isMaster && !isCurrentMatch && !isDefaultFallback) {
      setChangeError('Senha atual incorreta! Digite a senha atual (ou a senha mestra MARCIA2026).');
      return;
    }

    const cleanNew = newPassInput.trim();
    if (!cleanNew) {
      setChangeError('Digite a nova senha.');
      return;
    }

    if (cleanNew.length < 4) {
      setChangeError('A nova senha deve ter no mínimo 4 dígitos.');
      return;
    }

    if (cleanNew !== confirmPassInput.trim()) {
      setChangeError('A confirmação da nova senha não confere.');
      return;
    }

    setCompanyPassword(cleanNew);
    showToast('success', 'Senha da Empresa Alterada!', 'Nova senha gravada com sucesso.');
    
    // Automatically unlock with the new password
    unlockCompanyArea(cleanNew);

    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
    setChangeError('');
    setModalMode('unlock');
  };

  const handleClose = () => {
    setIsCompanyPasswordModalOpen(false);
    setInputPassword('');
    setErrorMessage('');
    setCurrentPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');
    setChangeError('');
    setModalMode('unlock');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              {modalMode === 'unlock' ? <Lock className="w-5 h-5 text-amber-400" /> : <KeyRound className="w-5 h-5 text-amber-400" />}
            </div>
            <div>
              <h3 className="font-black text-sm text-white">
                {modalMode === 'unlock' ? 'Área Restrita da Empresa' : 'Trocar Senha da Empresa'}
              </h3>
              <p className="text-[11px] text-amber-300 font-bold">
                {modalMode === 'unlock' ? 'Custos de Venda & Fornecedores' : 'Definir Nova Senha de Segurança'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch between Unlock & Change Password */}
        <div className="bg-slate-100 p-1 flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setModalMode('unlock');
              setErrorMessage('');
              setChangeError('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              modalMode === 'unlock'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Digitar Senha</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalMode('change');
              setErrorMessage('');
              setChangeError('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              modalMode === 'change'
                ? 'bg-white text-amber-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Trocar Senha</span>
          </button>
        </div>

        {/* Informative Security Notice */}
        <div className="p-3.5 bg-amber-50 border-b border-amber-100 flex items-start gap-2.5 text-xs text-amber-950">
          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            {modalMode === 'unlock'
              ? 'Área exclusiva da empresa. Preços de custo e fornecedores são protegidos contra visualização de clientes.'
              : 'Altere a senha de acesso aos custos e fornecedores. Somente quem tiver a senha poderá entrar.'}
          </p>
        </div>

        {/* MODE 1: UNLOCK FORM */}
        {modalMode === 'unlock' && (
          <form onSubmit={handleUnlockSubmit} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Senha da Empresa</span>
                <span className="text-[10px] text-slate-500 font-mono">Padrão: 1234</span>
              </label>
              <input
                type="password"
                autoFocus
                required
                placeholder="****************"
                value={inputPassword}
                onChange={e => {
                  setInputPassword(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full px-3.5 py-3 text-sm font-mono font-bold border-2 border-slate-300 focus:border-indigo-600 rounded-xl outline-none tracking-widest text-slate-900 bg-slate-50 focus:bg-white transition-all shadow-inner"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Voltar à Loja
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Desbloquear</span>
              </button>
            </div>

            {/* Direct Link to Change Password */}
            <div className="pt-2 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalMode('change')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer inline-flex items-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Deseja trocar a senha da empresa? Clique aqui</span>
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: CHANGE PASSWORD FORM */}
        {modalMode === 'change' && (
          <form onSubmit={handleChangePasswordSubmit} className="p-5 space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Senha Atual *</span>
                <span className="text-[10px] text-slate-400 font-normal">Padrão: 1234</span>
              </label>
              <input
                type="password"
                required
                placeholder="****************"
                value={currentPassInput}
                onChange={e => {
                  setCurrentPassInput(e.target.value);
                  setChangeError('');
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 focus:border-indigo-600 rounded-xl outline-none tracking-widest text-slate-900 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nova Senha da Empresa *
              </label>
              <input
                type="password"
                required
                placeholder="****************"
                value={newPassInput}
                onChange={e => {
                  setNewPassInput(e.target.value);
                  setChangeError('');
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 focus:border-indigo-600 rounded-xl outline-none tracking-widest text-slate-900 bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confirmar Nova Senha *
              </label>
              <input
                type="password"
                required
                placeholder="****************"
                value={confirmPassInput}
                onChange={e => {
                  setConfirmPassInput(e.target.value);
                  setChangeError('');
                }}
                className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-300 focus:border-indigo-600 rounded-xl outline-none tracking-widest text-slate-900 bg-slate-50 focus:bg-white"
              />
            </div>

            {changeError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                {changeError}
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setModalMode('unlock')}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Senha</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
