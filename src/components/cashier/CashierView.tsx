import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Lock, 
  Unlock, 
  DollarSign, 
  QrCode, 
  CreditCard, 
  Banknote, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  FileText,
  PlusCircle,
  MinusCircle,
  X
} from 'lucide-react';

export const CashierView: React.FC = () => {
  const { currentShift, openCashier, closeCashier, addCashMovement, sales, showToast } = useApp();

  const [modalType, setModalType] = useState<'OPEN' | 'CLOSE' | 'SUPRIMENTO' | 'SANGRIA' | null>(null);
  const [inputAmount, setInputAmount] = useState('');
  const [inputOperator, setInputOperator] = useState('João Silva');
  const [inputReason, setInputReason] = useState('');
  const [inputNotes, setInputNotes] = useState('');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleOpen = () => {
    const amount = parseFloat(inputAmount) || 0;
    openCashier(amount, inputOperator || 'Operador Padrão');
    setModalType(null);
    setInputAmount('');
  };

  const handleClose = () => {
    const amount = parseFloat(inputAmount) || 0;
    closeCashier(amount, inputNotes);
    setModalType(null);
    setInputAmount('');
    setInputNotes('');
  };

  const handleAddMovement = () => {
    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('error', 'Valor Inválido', 'Insira um valor maior que zero.');
      return;
    }
    if (modalType === 'SANGRIA' || modalType === 'SUPRIMENTO') {
      addCashMovement(modalType, amount, inputReason || 'Movimentação manual de caixa');
      setModalType(null);
      setInputAmount('');
      setInputReason('');
    }
  };

  const today = new Date().toDateString();
  const shiftSales = sales.filter(s => new Date(s.createdAt).toDateString() === today && s.status === 'CONCLUIDA');
  const totalShiftSales = shiftSales.reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 p-3 sm:p-6 lg:p-8">
      {/* Top Status Header */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${
              currentShift.isOpen ? 'bg-emerald-600' : 'bg-slate-700'
            }`}
          >
            {currentShift.isOpen ? <Unlock className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Caixa {currentShift.isOpen ? 'Aberto & Operando' : 'Fechado'}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  currentShift.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {currentShift.isOpen ? 'Em Andamento' : 'Encerrado'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Operador: <strong>{currentShift.operator}</strong> • Abertura em:{' '}
              {new Date(currentShift.openedAt).toLocaleDateString('pt-BR')} às{' '}
              {new Date(currentShift.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {currentShift.isOpen ? (
            <>
              <button
                onClick={() => {
                  setModalType('SUPRIMENTO');
                  setInputAmount('');
                  setInputReason('Reforço de troco');
                }}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>Suprimento (Entrada)</span>
              </button>

              <button
                onClick={() => {
                  setModalType('SANGRIA');
                  setInputAmount('');
                  setInputReason('Retirada / Pagamento despesa');
                }}
                className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <MinusCircle className="w-4 h-4 text-rose-500" />
                <span>Sangria (Retirada)</span>
              </button>

              <button
                onClick={() => {
                  setModalType('CLOSE');
                  setInputAmount(currentShift.finalCashCalculated.toFixed(2));
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Lock className="w-4 h-4" />
                <span>Fechar Caixa</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setModalType('OPEN');
                setInputAmount('250.00');
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Novo Caixa</span>
            </button>
          )}
        </div>
      </div>

      {/* Cash Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Fundo de Troco */}
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Fundo de Troco Inicial
          </span>
          <h4 className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {formatCurrency(currentShift.initialCash)}
          </h4>
          <p className="text-[11px] text-slate-400 mt-1">Valor informado na abertura</p>
        </div>

        {/* Dinheiro em Espécie no Caixa */}
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Dinheiro em Caixa (Saldo)
          </span>
          <h4 className="text-2xl font-bold text-indigo-600 font-mono mt-1">
            {formatCurrency(currentShift.finalCashCalculated)}
          </h4>
          <p className="text-[11px] text-slate-500 mt-1">
            Fundo + Vendas ({formatCurrency(currentShift.cashSales)}) + Suprim. - Sangrias
          </p>
        </div>

        {/* Total Geral de Vendas */}
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Faturamento do Turno
          </span>
          <h4 className="text-2xl font-bold text-emerald-600 font-mono mt-1">
            {formatCurrency(totalShiftSales)}
          </h4>
          <p className="text-[11px] text-slate-400 mt-1">{shiftSales.length} pedidos finalizados</p>
        </div>

        {/* Sangrias & Suprimentos */}
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Movimentações Avulsas
          </span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm font-bold font-mono text-emerald-600">
              +{formatCurrency(currentShift.supplements)}
            </span>
            <span className="text-sm font-bold font-mono text-rose-500">
              -{formatCurrency(currentShift.bleedings)}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Reforços e retiradas</p>
        </div>
      </div>

      {/* Detailed Payment Breakdown & Shift History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Summary by Payment Mode */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 flex flex-col gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b pb-3">
            Conferência por Meio de Pagamento
          </h3>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Pix</p>
                  <p className="text-[10px] text-slate-400">Direto na conta da distribuidora</p>
                </div>
              </div>
              <span className="font-bold font-mono text-sm text-slate-900">
                {formatCurrency(currentShift.pixSales)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Cartão de Crédito</p>
                  <p className="text-[10px] text-slate-400">Maquininha TEF / POS</p>
                </div>
              </div>
              <span className="font-bold font-mono text-sm text-slate-900">
                {formatCurrency(currentShift.creditSales)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Cartão de Débito</p>
                  <p className="text-[10px] text-slate-400">Maquininha TEF / POS</p>
                </div>
              </div>
              <span className="font-bold font-mono text-sm text-slate-900">
                {formatCurrency(currentShift.debitSales)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <Banknote className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Dinheiro em Espécie</p>
                  <p className="text-[10px] text-slate-400">Entradas de vendas em notas e moedas</p>
                </div>
              </div>
              <span className="font-bold font-mono text-sm text-slate-900">
                {formatCurrency(currentShift.cashSales)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Notes and Operator Checklist */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b pb-3 mb-4">
              Instruções de Fechamento de Caixa
            </h3>
            <ul className="text-xs text-slate-600 flex flex-col gap-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Realize a contagem física das notas e moedas da gaveta.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Imprima o relatório de fechamento das maquininhas de cartão (Crédito/Débito).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Confira os comprovantes de Pix recebidos no extrato bancário.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Registre qualquer quebra ou sobra de caixa no campo de observações.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <p className="font-bold text-slate-700">Histórico de Observações do Caixa:</p>
            <p className="text-slate-500 italic mt-1">{currentShift.notes || 'Nenhuma observação registrada.'}</p>
          </div>
        </div>
      </div>

      {/* Modal: Open / Close / Sangria / Suprimento */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92dvh] max-w-md sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="shrink-0 p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between z-10 border-b border-slate-800">
              <h3 className="font-bold text-sm sm:text-base text-white">
                {modalType === 'OPEN' && 'Abertura de Caixa'}
                {modalType === 'CLOSE' && 'Fechamento de Caixa'}
                {modalType === 'SUPRIMENTO' && 'Registrar Suprimento (Entrada de Troco)'}
                {modalType === 'SANGRIA' && 'Registrar Sangria (Retirada de Dinheiro)'}
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 flex flex-col gap-4 pb-24 sm:pb-6">
              {modalType === 'OPEN' && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Nome do Operador</label>
                    <input
                      type="text"
                      value={inputOperator}
                      onChange={e => setInputOperator(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Fundo de Troco Inicial (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={inputAmount}
                      onChange={e => setInputAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-lg font-mono font-bold focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </>
              )}

              {modalType === 'CLOSE' && (
                <>
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs">
                    <p className="text-indigo-900">
                      Saldo Calculado em Dinheiro: <strong>{formatCurrency(currentShift.finalCashCalculated)}</strong>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      Valor Real Contado na Gaveta (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={inputAmount}
                      onChange={e => setInputAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-lg font-mono font-bold focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Observações do Fechamento</label>
                    <textarea
                      rows={2}
                      placeholder="Conferência de cartões ok, dinheiro fechado sem divergências..."
                      value={inputNotes}
                      onChange={e => setInputNotes(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600 resize-none"
                    />
                  </div>
                </>
              )}

              {(modalType === 'SUPRIMENTO' || modalType === 'SANGRIA') && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={inputAmount}
                      onChange={e => setInputAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-lg font-mono font-bold focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">Motivo / Justificativa</label>
                    <input
                      type="text"
                      placeholder="Ex: Pagamento de freteiro, reposição de moedas..."
                      value={inputReason}
                      onChange={e => setInputReason(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="shrink-0 p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (modalType === 'OPEN') handleOpen();
                  else if (modalType === 'CLOSE') handleClose();
                  else handleAddMovement();
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
