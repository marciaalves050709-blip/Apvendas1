import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  Download, 
  Layers, 
  PieChart, 
  ArrowUpRight,
  ShoppingCart,
  FileSpreadsheet,
  CheckCircle
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { products, sales, showToast } = useApp();

  const [reportPeriod, setReportPeriod] = useState<'TODAY' | '7DAYS' | '30DAYS' | 'ALL'>('ALL');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Completed sales
  const completedSales = sales.filter(s => s.status === 'CONCLUIDA');
  const totalRevenue = completedSales.reduce((sum, s) => sum + s.total, 0);
  const totalCost = completedSales.reduce((sum, s) => sum + (s.costTotal || 0), 0);
  const totalGrossProfit = totalRevenue - totalCost;
  const averageMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

  // Aggregate product sales performance (Curva ABC)
  const productPerformanceMap: Record<string, { name: string; sku: string; category: string; quantity: number; revenue: number; profit: number }> = {};

  completedSales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productPerformanceMap[item.productId]) {
        productPerformanceMap[item.productId] = {
          name: item.productName,
          sku: item.productSku,
          category: item.category,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
      }
      const itemProfit = item.total - (item.quantity * item.costPrice);
      productPerformanceMap[item.productId].quantity += item.quantity;
      productPerformanceMap[item.productId].revenue += item.total;
      productPerformanceMap[item.productId].profit += itemProfit;
    });
  });

  const performanceList = Object.values(productPerformanceMap).sort((a, b) => b.revenue - a.revenue);

  // Sales by Category
  const categorySalesMap: Record<string, number> = {};
  completedSales.forEach(sale => {
    sale.items.forEach(item => {
      categorySalesMap[item.category] = (categorySalesMap[item.category] || 0) + item.total;
    });
  });

  // Critical Low Stock Purchase Suggestions
  const purchaseSuggestions = products.filter(p => p.currentStock <= p.minStock).map(p => {
    const suggestedQty = (p.maxStock || 200) - p.currentStock;
    const estimatedCost = suggestedQty * p.costPrice;
    return {
      ...p,
      suggestedQty,
      estimatedCost,
    };
  });

  const totalPurchaseBudget = purchaseSuggestions.reduce((sum, item) => sum + item.estimatedCost, 0);

  const handleExportSuggestions = () => {
    const headers = ['Produto', 'SKU', 'Estoque Atual', 'Estoque Mínimo', 'Qtd Sugerida de Compra', 'Custo Unitário', 'Custo Total Estimado', 'Fornecedor'];
    const rows = purchaseSuggestions.map(p => [
      `"${p.name}"`,
      `"${p.sku}"`,
      p.currentStock,
      p.minStock,
      p.suggestedQty,
      p.costPrice.toFixed(2),
      p.estimatedCost.toFixed(2),
      `"${p.supplierName || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ordem_de_compra_descartaveis_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Lista de Compras Gerada', 'Arquivo CSV baixado para envio aos fornecedores.');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 p-8">
      {/* Top Header Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Faturamento Total
          </span>
          <h4 className="text-2xl font-bold text-slate-900 font-mono mt-1">
            {formatCurrency(totalRevenue)}
          </h4>
          <p className="text-xs text-slate-500 mt-1">{completedSales.length} pedidos faturados</p>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Custo das Mercadorias (CMV)
          </span>
          <h4 className="text-2xl font-bold text-slate-700 font-mono mt-1">
            {formatCurrency(totalCost)}
          </h4>
          <p className="text-xs text-slate-500 mt-1">Custo de aquisição junto a fábricas</p>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Lucro Bruto Líquido
          </span>
          <h4 className="text-2xl font-bold text-emerald-600 font-mono mt-1">
            {formatCurrency(totalGrossProfit)}
          </h4>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            Margem Bruta de {averageMargin.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Orçamento Reposição Crítica
          </span>
          <h4 className="text-2xl font-bold text-rose-600 font-mono mt-1">
            {formatCurrency(totalPurchaseBudget)}
          </h4>
          <p className="text-xs text-rose-500 font-medium mt-1">
            {purchaseSuggestions.length} itens abaixo do mínimo
          </p>
        </div>
      </div>

      {/* Grid: Curva ABC + Sales by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left 2 Cols: Curva ABC */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
            <div>
              <h3 className="font-bold uppercase text-sm tracking-widest text-slate-900">
                Curva ABC de Vendas (Produtos Mais Vendidos)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Produtos que geram o maior volume de faturamento e lucro
              </p>
            </div>
            <span className="text-xs font-bold font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
              Top Produtos
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Posição / Produto</th>
                  <th className="px-4 py-3">Qtd Vendida</th>
                  <th className="px-4 py-3">Receita Bruta</th>
                  <th className="px-4 py-3">Lucro Estimado</th>
                  <th className="px-4 py-3">Participação</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {performanceList.map((item, idx) => {
                  const share = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">{item.sku} • {item.category}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 font-mono font-semibold text-xs text-slate-700">
                        {item.quantity.toLocaleString('pt-BR')} un
                      </td>

                      <td className="px-4 py-4 font-mono font-bold text-xs text-slate-900">
                        {formatCurrency(item.revenue)}
                      </td>

                      <td className="px-4 py-4 font-mono font-semibold text-xs text-emerald-600">
                        +{formatCurrency(item.profit)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full" style={{ width: `${Math.min(100, share)}%` }} />
                          </div>
                          <span className="font-mono text-xs text-slate-600">{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {performanceList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      Nenhuma venda registrada ainda para calcular a curva ABC.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Category Sales Share */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-bold uppercase text-sm tracking-widest text-slate-900 border-b pb-3 mb-4">
              Vendas por Segmento
            </h3>

            <div className="flex flex-col gap-4">
              {Object.entries(categorySalesMap).map(([category, amount]) => {
                const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
                return (
                  <div key={category} className="flex flex-col gap-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800">{category}</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(amount)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}

              {Object.keys(categorySalesMap).length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">
                  Nenhum dado por categoria registrado no período.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-xs">
            <p className="font-bold text-indigo-900">Eficiência de Estoque</p>
            <p className="text-indigo-700 mt-0.5 leading-relaxed">
              O segmento de copos e marmitex representa o maior giro diário, com reposição média a cada 4 dias.
            </p>
          </div>
        </div>
      </div>

      {/* Suggested Reorder Plan Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold uppercase text-sm tracking-widest text-slate-900">
                Sugestão Automática de Compra / Reposição de Produtos
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculado com base no estoque mínimo de segurança e capacidade máxima de armazenamento
            </p>
          </div>

          {purchaseSuggestions.length > 0 && (
            <button
              onClick={handleExportSuggestions}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Ordem de Compra (CSV)</span>
            </button>
          )}
        </div>

        {purchaseSuggestions.length > 0 ? (
          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Produto</th>
                  <th className="px-4 py-3">Estoque Atual</th>
                  <th className="px-4 py-3">Estoque Mínimo</th>
                  <th className="px-4 py-3">Qtd Sugerida Compra</th>
                  <th className="px-4 py-3">Custo Unitário</th>
                  <th className="px-4 py-3">Investimento Total</th>
                  <th className="px-4 py-3">Fabricante / Fornecedor</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {purchaseSuggestions.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-3 font-bold text-slate-900 text-xs">
                      {item.name}
                      <span className="block font-mono text-[10px] text-slate-400 font-normal">{item.sku}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-600 text-xs">
                      {item.currentStock} {item.unit.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 text-xs">
                      {item.minStock} un
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600 text-xs">
                      +{item.suggestedQty} {item.unit.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 text-xs">
                      {formatCurrency(item.costPrice)}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 text-xs">
                      {formatCurrency(item.estimatedCost)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {item.supplierName || 'Fabricante Padrão'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-800 text-xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Todos os produtos estão com níveis de estoque saudáveis e acima do limite mínimo!</span>
          </div>
        )}
      </div>
    </div>
  );
};
