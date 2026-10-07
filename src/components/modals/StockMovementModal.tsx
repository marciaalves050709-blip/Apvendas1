import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MovementType } from '../../types';
import { ArrowDownToLine, ArrowUpRight, X, Layers, AlertTriangle, CheckCircle, Package } from 'lucide-react';

export const StockMovementModal: React.FC = () => {
  const { stockModalProduct, setStockModalProduct, addStockMovement, showToast } = useApp();

  const [type, setType] = useState<MovementType>('ENTRADA');
  const [quantity, setQuantity] = useState<string>('10');
  const [unitCost, setUnitCost] = useState<string>('');
  const [reason, setReason] = useState<string>('Recebimento de mercadoria / Nota Fiscal');
  const [docRef, setDocRef] = useState<string>('NF-');

  if (!stockModalProduct) return null;

  const product = stockModalProduct;
  const qtyNum = parseInt(quantity) || 0;
  const costNum = parseFloat(unitCost) || product.costPrice;

  let calculatedNewStock = product.currentStock;
  if (type === 'ENTRADA' || type === 'AJUSTE_POSITIVO' || type === 'DEVOLUCAO') {
    calculatedNewStock = product.currentStock + qtyNum;
  } else {
    calculatedNewStock = Math.max(0, product.currentStock - qtyNum);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qtyNum <= 0) {
      showToast('error', 'Quantidade Inválida', 'A quantidade deve ser maior que zero.');
      return;
    }

    const success = addStockMovement(product.id, type, qtyNum, {
      unitCost: costNum,
      reason,
      documentRef: docRef,
    });

    if (success) {
      setStockModalProduct(null);
      setQuantity('10');
      setReason('');
      setDocRef('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92dvh] max-w-md sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-base">Movimentar Estoque</h3>
            <p className="text-xs text-slate-300 truncate max-w-xs">{product.name}</p>
          </div>
          <button
            onClick={() => setStockModalProduct(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 flex flex-col gap-4">
            {/* Current Product Info Banner */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <p className="font-mono text-[11px] text-slate-400">SKU: {product.sku}</p>
                <p className="font-bold text-slate-900 mt-0.5">Estoque Atual:</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-mono font-black text-slate-900">
                  {product.currentStock} {product.unit.toLowerCase()}
                </span>
                <p className="text-[10px] text-slate-400">Mínimo: {product.minStock} un</p>
              </div>
            </div>

          {/* Movement Type Selector */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1.5">Tipo de Movimentação</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('ENTRADA');
                  setReason('Recebimento de compra do fornecedor');
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  type === 'ENTRADA'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                <span>Entrada de Compra (+)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('AVARIA_PERDA');
                  setReason('Pacote danificado / descartado');
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  type === 'AVARIA_PERDA'
                    ? 'border-rose-600 bg-rose-50 text-rose-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-rose-600" />
                <span>Avaria / Perda (-)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('AJUSTE_POSITIVO');
                  setReason('Contagem de inventário (Sobra)');
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  type === 'AJUSTE_POSITIVO'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Ajuste Positivo (+)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('AJUSTE_NEGATIVO');
                  setReason('Contagem de inventário (Falta)');
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  type === 'AJUSTE_NEGATIVO'
                    ? 'border-amber-600 bg-amber-50 text-amber-900'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Ajuste Negativo (-)</span>
              </button>
            </div>
          </div>

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Quantidade ({product.unit.toLowerCase()}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">
                Preço de Custo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={product.costPrice.toFixed(2)}
                value={unitCost}
                onChange={e => setUnitCost(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Document Ref & Reason */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Documento / Nota Fiscal / Pedido
            </label>
            <input
              type="text"
              placeholder="Ex: NF-88910 ou Pedido Strawplast"
              value={docRef}
              onChange={e => setDocRef(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Motivo / Observações
            </label>
            <input
              type="text"
              placeholder="Ex: Recebimento de carga de copos 200ml"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          {/* Result preview box */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-900">Novo Estoque Previsto:</span>
            <span className="font-mono font-black text-sm text-indigo-700">
              {calculatedNewStock} {product.unit.toLowerCase()}
            </span>
          </div>

          </div>

          {/* Modal Actions - Sticky Bottom */}
          <div className="shrink-0 p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => setStockModalProduct(null)}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
            >
              Salvar Movimentação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
