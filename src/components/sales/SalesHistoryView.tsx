import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Sale, PaymentMethod } from '../../types';
import { 
  Search, 
  Receipt, 
  Printer, 
  RotateCcw, 
  Calendar, 
  Filter, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  User, 
  Download,
  AlertTriangle,
  X
} from 'lucide-react';

export const SalesHistoryView: React.FC = () => {
  const { sales, cancelSale, setReceiptModalSale, showToast } = useApp();

  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONCLUIDA' | 'CANCELADA'>('ALL');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);
  const [cancelModalSale, setCancelModalSale] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const filteredSales = sales.filter(s => {
    const matchesSearch = 
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase())) ||
      s.items.some(i => i.productName.toLowerCase().includes(search.toLowerCase()) || i.productSku.toLowerCase().includes(search.toLowerCase()));

    const matchesPayment = paymentFilter === 'ALL' || s.paymentMethod === paymentFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesPayment && matchesStatus;
  });

  const totalSalesVolume = filteredSales
    .filter(s => s.status === 'CONCLUIDA')
    .reduce((sum, s) => sum + s.total, 0);

  const totalProfitVolume = filteredSales
    .filter(s => s.status === 'CONCLUIDA')
    .reduce((sum, s) => sum + (s.profit || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleConfirmCancel = () => {
    if (!cancelModalSale) return;
    const success = cancelSale(cancelModalSale.id, cancelReason || 'Cancelado pelo operador');
    if (success) {
      setCancelModalSale(null);
      setCancelReason('');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 p-8">
      {/* Top Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total de Vendas no Período</p>
          <h4 className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatCurrency(totalSalesVolume)}</h4>
          <p className="text-xs text-slate-500 mt-1">
            {filteredSales.filter(s => s.status === 'CONCLUIDA').length} transações concluídas
          </p>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lucro Bruto Estimado</p>
          <h4 className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{formatCurrency(totalProfitVolume)}</h4>
          <p className="text-xs text-slate-500 mt-1">
            Margem média de {totalSalesVolume > 0 ? ((totalProfitVolume / totalSalesVolume) * 100).toFixed(1) : '0'}%
          </p>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cancelamentos / Estornos</p>
          <h4 className="text-2xl font-bold text-rose-500 mt-1 font-mono">
            {filteredSales.filter(s => s.status === 'CANCELADA').length} vendas
          </h4>
          <p className="text-xs text-slate-500 mt-1">Estoque restaurado automaticamente</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código (ex: VEN-4932), cliente ou item..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Payment Method */}
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 py-2 px-3 focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="ALL">Todas as Formas</option>
            <option value="PIX">Pix</option>
            <option value="CARTAO_CREDITO">Cartão Crédito</option>
            <option value="CARTAO_DEBITO">Cartão Débito</option>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="A_PRAZO">A Prazo</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 py-2 px-3 focus:outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="ALL">Todos os Status</option>
            <option value="CONCLUIDA">✅ Concluídas</option>
            <option value="CANCELADA">❌ Canceladas</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Mostrando {filteredSales.length} transações registradas
          </span>
        </div>

        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Código & Data</th>
                <th className="px-4 py-3.5">Cliente</th>
                <th className="px-4 py-3.5">Itens da Venda</th>
                <th className="px-4 py-3.5">Forma de Pagamento</th>
                <th className="px-4 py-3.5">Valor Total</th>
                <th className="px-4 py-3.5">Lucro Bruto</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredSales.map(sale => {
                const isCancelled = sale.status === 'CANCELADA';
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Code & Time */}
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-sm text-slate-900">{sale.code}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(sale.createdAt).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(sale.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800 text-xs">{sale.customerName || 'Consumidor Balcão'}</p>
                      {sale.customerDocument && (
                        <p className="text-[11px] font-mono text-slate-400">{sale.customerDocument}</p>
                      )}
                    </td>

                    {/* Items preview */}
                    <td className="px-4 py-4 max-w-xs">
                      <span className="text-xs font-medium text-slate-700 block truncate">
                        {sale.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {sale.items.reduce((s, i) => s + i.quantity, 0)} volumes no pedido
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="px-4 py-4">
                      <span className="inline-block font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {sale.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="px-4 py-4 font-mono font-bold text-sm text-slate-900">
                      {formatCurrency(sale.total)}
                    </td>

                    {/* Profit */}
                    <td className="px-4 py-4 font-mono text-xs text-emerald-600 font-semibold">
                      +{formatCurrency(sale.profit || 0)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider inline-block ${
                          isCancelled
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setReceiptModalSale(sale)}
                          title="Imprimir Cupom / Comprovante"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedSaleDetail(sale)}
                          title="Ver Detalhes do Pedido"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {!isCancelled && (
                          <button
                            onClick={() => setCancelModalSale(sale)}
                            title="Cancelar Venda & Devolver ao Estoque"
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-sm">
                    Nenhuma venda encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Detalhes da Venda {selectedSaleDetail.code}</h3>
                <p className="text-xs text-slate-300">
                  {new Date(selectedSaleDetail.createdAt).toLocaleString('pt-BR')} • Vendedor: {selectedSaleDetail.seller}
                </p>
              </div>
              <button
                onClick={() => setSelectedSaleDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 overflow-y-auto max-h-[70vh]">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <p><strong>Cliente:</strong> {selectedSaleDetail.customerName || 'Consumidor'}</p>
                {selectedSaleDetail.customerDocument && <p><strong>Documento:</strong> {selectedSaleDetail.customerDocument}</p>}
                <p><strong>Forma de Pagamento:</strong> {selectedSaleDetail.paymentMethod.replace('_', ' ')}</p>
                {selectedSaleDetail.notes && <p className="mt-1 text-slate-500"><strong>Obs:</strong> {selectedSaleDetail.notes}</p>}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Produtos Comprados</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {selectedSaleDetail.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{item.productName}</p>
                        <p className="text-slate-400 font-mono">{item.quantity} {item.unit.toLowerCase()} x {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <span className="font-bold font-mono text-slate-900">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col gap-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(selectedSaleDetail.subtotal)}</span>
                </div>
                {selectedSaleDetail.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Desconto</span>
                    <span className="font-mono">- {formatCurrency(selectedSaleDetail.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base text-slate-900 pt-2 border-t border-indigo-200/60">
                  <span>Total Pago</span>
                  <span className="font-mono text-indigo-700">{formatCurrency(selectedSaleDetail.total)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setReceiptModalSale(selectedSaleDetail);
                  setSelectedSaleDetail(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Cupom</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Sale Modal */}
      {cancelModalSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-base">Cancelar Venda {cancelModalSale.code}</h3>
              </div>
              <button
                onClick={() => setCancelModalSale(null)}
                className="text-rose-200 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tem certeza que deseja estornar esta venda de <strong>{formatCurrency(cancelModalSale.total)}</strong>?
                Os itens da venda serão <strong>restituídos ao estoque automaticamente</strong> e o valor será subtraído do caixa do dia.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Motivo do Cancelamento (Obrigatório)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Desistência do cliente, erro no valor digitado..."
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setCancelModalSale(null)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirmar Estorno</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
