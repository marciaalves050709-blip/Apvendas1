import React, { useState } from 'react';
import { useApp, checkIsMasterPassword } from '../../context/AppContext';
import { Lock, AlertCircle, Crown, ShieldAlert } from 'lucide-react';

export const AdminPasswordModal: React.FC = () => {
  const {
    isAdminPasswordModalOpen,
    setIsAdminPasswordModalOpen,
    checkAndApplyAdminCredentials,
    exitTestBlockMode
  } = useApp();

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isAdminPasswordModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = password.trim();
    if (!trimmed) {
      setError('A Senha Mestra é estritamente obrigatória! Digite sua senha mestra.');
      return;
    }

    if (!checkIsMasterPassword(trimmed)) {
      setError('Senha Mestra incorreta! Digite sua senha mestra confidencial de administradora.');
      return;
    }

    const success = checkAndApplyAdminCredentials('Márcia Alves', '(91) 99319-2405', trimmed);
    if (success) {
      exitTestBlockMode(trimmed);
      setIsAdminPasswordModalOpen(false);
      setPassword('');
      setError('');
    } else {
      setError('Falha ao autenticar. Verifique a senha mestra digitada.');
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-amber-400 animate-scale-up space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-xl shadow-md">
              👑
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 leading-tight">
                Acesso da Administradora
              </h3>
              <p className="text-[11px] text-amber-700 font-bold">
                Exige Senha Mestra Confidencial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsAdminPasswordModalOpen(false);
              setPassword('');
              setError('');
            }}
            className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-slate-700 space-y-1">
          <p className="font-bold text-amber-950 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Validação de Segurança</span>
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            O aplicativo só é liberado para a administradora com acesso vitalício após a digitação da <strong>Senha Mestra</strong> correta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Senha Mestra (Obrigatória) *</span>
              </span>
              <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                Obrigatória
              </span>
            </label>
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="****************"
                className="w-full px-3.5 py-3 text-sm border-2 border-amber-400 focus:border-amber-600 rounded-xl focus:outline-hidden font-mono font-black text-slate-900 bg-amber-50/20 focus:bg-white shadow-inner tracking-widest"
              />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 pt-1">
            <div>
              <span className="block font-bold text-slate-700">Titular:</span>
              <span className="font-medium text-slate-600">Márcia Alves</span>
            </div>
            <div>
              <span className="block font-bold text-slate-700">WhatsApp:</span>
              <span className="font-medium text-slate-600">(91) 99319-2405</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAdminPasswordModalOpen(false);
                setPassword('');
                setError('');
              }}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Validar Senha</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
