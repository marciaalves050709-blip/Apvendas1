import React from 'react';
import { useApp } from '../../context/AppContext';
import { Printer, X, CheckCircle, Share2, Copy, QrCode } from 'lucide-react';

export const ReceiptModal: React.FC = () => {
  const { receiptModalSale, setReceiptModalSale, showToast } = useApp();

  if (!receiptModalSale) return null;

  const sale = receiptModalSale;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const details = sale.paymentDetails;
    const lines = [
      '========================================',
      '             APP DE VENDAS',
      '       CNPJ: 12.345.678/0001-90',
      '            São Paulo - SP',
      '========================================',
      `CUPOM NÃO FISCAL: ${sale.code}`,
      `DATA: ${new Date(sale.createdAt).toLocaleDateString('pt-BR')} ${new Date(sale.createdAt).toLocaleTimeString('pt-BR')}`,
      `CLIENTE: ${sale.customerName || 'Consumidor Final'}`,
      `VENDEDOR: ${sale.seller}`,
      '----------------------------------------',
      'ITENS:',
      ...sale.items.map(i => `${i.quantity}x ${i.productName} (${i.productSku}) - ${formatCurrency(i.total)}`),
      '----------------------------------------',
      `SUBTOTAL: ${formatCurrency(sale.subtotal)}`,
      sale.discount > 0 ? `DESCONTO: -${formatCurrency(sale.discount)}` : '',
      `TOTAL PAGO: ${formatCurrency(sale.total)}`,
      `FORMA PGTO: ${sale.paymentMethod.replace('_', ' ')}`,
      sale.installments && sale.installments > 1 ? `PARCELAS: ${sale.installments}x` : '',
      details?.cardBrand ? `BANDEIRA: ${details.cardBrand} (${details.cardTerminal || 'TEF'})` : '',
      details?.cardNsu ? `NSU AUT: ${details.cardNsu}` : '',
      details?.pixE2EId ? `PIX E2E: ${details.pixE2EId}` : '',
      sale.cashReceived ? `VALOR PAGO EM DINHEIRO: ${formatCurrency(sale.cashReceived)}` : '',
      sale.change ? `TROCO: ${formatCurrency(sale.change)}` : '',
      '========================================',
      '   Obrigado pela preferência! Volte sempre.',
      '          Criado por Marcia Alves',
      '========================================',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    showToast('success', 'Copiado!', 'Texto do comprovante copiado para a área de transferência.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Comprovante de Venda {sale.code}</h3>
          </div>
          <button
            onClick={() => setReceiptModalSale(null)}
            className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Box */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex justify-center">
          <div
            id="printable-receipt"
            className="bg-white p-6 rounded-lg border border-slate-300 shadow-sm w-full max-w-[340px] text-slate-900 font-mono text-xs leading-relaxed"
          >
            {/* Store Banner */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
              <h4 className="font-black text-sm uppercase tracking-tight">App vendas</h4>
              <p className="text-[9px] text-slate-400">CNPJ: 12.345.678/0001-90 • Tel: (11) 3344-5566</p>
              <p className="text-[9px] text-slate-400">São Paulo - SP</p>
            </div>

            {/* Document Header */}
            <div className="text-[10px] border-b border-dashed border-slate-400 pb-2 mb-2 flex flex-col gap-0.5">
              <div className="flex justify-between font-bold">
                <span>CUPOM NÃO FISCAL</span>
                <span>{sale.code}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Data/Hora:</span>
                <span>{new Date(sale.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Cliente:</span>
                <span className="truncate max-w-[170px]">{sale.customerName || 'Consumidor'}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Operador:</span>
                <span>{sale.seller}</span>
              </div>
            </div>

            {/* Items Header */}
            <div className="border-b border-dashed border-slate-400 pb-2 mb-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                <span>Item / Qtd</span>
                <span>Total</span>
              </div>
              <div className="flex flex-col gap-1.5 mt-1.5">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <div className="min-w-0 pr-1">
                      <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                      <p className="text-[10px] text-slate-400">
                        {item.quantity} {item.unit.toLowerCase()} x {formatCurrency(item.unitPrice)} ({item.productSku})
                      </p>
                    </div>
                    <span className="font-bold text-slate-900 shrink-0">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-b border-dashed border-slate-400 pb-2 mb-3 flex flex-col gap-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Desconto:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-dashed border-slate-300">
                <span>TOTAL:</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1 text-[10px]">
                <span>Forma de Pagamento:</span>
                <span className="font-bold uppercase">{sale.paymentMethod.replace('_', ' ')}</span>
              </div>
              {sale.installments && sale.installments > 1 && (
                <div className="flex justify-between text-slate-500 text-[9px]">
                  <span>Parcelamento:</span>
                  <span className="font-bold">{sale.installments}x de {formatCurrency(sale.total / sale.installments)}</span>
                </div>
              )}
              {sale.paymentDetails?.cardBrand && (
                <div className="flex justify-between text-slate-500 text-[9px]">
                  <span>Bandeira / Terminal:</span>
                  <span className="font-bold">{sale.paymentDetails.cardBrand} ({sale.paymentDetails.cardTerminal || 'TEF'})</span>
                </div>
              )}
              {sale.paymentDetails?.cardNsu && (
                <div className="flex justify-between text-slate-500 text-[9px]">
                  <span>NSU / Aut:</span>
                  <span className="font-mono">{sale.paymentDetails.cardNsu} • {sale.paymentDetails.cardAuthCode}</span>
                </div>
              )}
              {sale.paymentDetails?.pixE2EId && (
                <div className="flex justify-between text-slate-500 text-[9px]">
                  <span>ID Pix (E2E):</span>
                  <span className="font-mono truncate max-w-[170px]">{sale.paymentDetails.pixE2EId}</span>
                </div>
              )}
              {sale.paymentDetails?.splitPayments && (
                <div className="pt-1 border-t border-dashed border-slate-200 mt-1 flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-slate-500">Composição do Pagamento:</span>
                  {sale.paymentDetails.splitPayments.map((sp, idx) => (
                    <div key={idx} className="flex justify-between text-[9px] text-slate-600">
                      <span>• {sp.method.replace('_', ' ')}:</span>
                      <span className="font-bold">{formatCurrency(sp.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {sale.cashReceived && (
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>Valor Pago em Dinheiro:</span>
                  <span>{formatCurrency(sale.cashReceived)}</span>
                </div>
              )}
              {sale.change !== undefined && sale.change > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold text-[10px]">
                  <span>Troco:</span>
                  <span>{formatCurrency(sale.change)}</span>
                </div>
              )}
            </div>

            {/* Barcode Mock Visual */}
            <div className="flex flex-col items-center justify-center pt-1 text-center">
              <div className="h-10 w-48 bg-slate-900 flex items-center justify-center p-1 rounded">
                <div className="w-full h-full flex justify-between gap-0.5 bg-white p-0.5">
                  {[4,2,6,1,3,5,2,4,7,1,3,5,2,6,4,2,5,1,3,4,6,2,3].map((w, i) => (
                    <div key={i} className="bg-black h-full" style={{ width: `${w}px` }} />
                  ))}
                </div>
              </div>
              <span className="text-[9px] text-slate-400 mt-1 tracking-widest">{sale.code}</span>
              <p className="text-[10px] text-slate-500 mt-2 italic">Obrigado pela preferência!</p>
              <p className="text-[9px] text-slate-400 mt-1 font-sans">Criado por Marcia Alves</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-2 no-print">
          <button
            onClick={handleCopyText}
            className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Copiar Texto</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setReceiptModalSale(null)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Cupom</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
