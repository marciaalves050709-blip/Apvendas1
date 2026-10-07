import React from 'react';
import { useApp } from '../../context/AppContext';
import { Product, StockStatus } from '../../types';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  ShoppingBag, 
  ArrowUpRight, 
  ArrowRight, 
  Clock, 
  Layers, 
  CheckCircle2, 
  ExternalLink,
  PlusCircle,
  QrCode,
  CreditCard,
  Banknote
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    products, 
    sales, 
    movements, 
    currentShift, 
    setActiveTab, 
    setStockModalProduct, 
    setReceiptModalSale 
  } = useApp();

  // Calculations
  const totalStockUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
  const totalMaxStock = products.reduce((acc, p) => acc + (p.maxStock || 500), 0);
  const stockCapacityPercentage = totalMaxStock > 0 ? Math.min(100, Math.round((totalStockUnits / totalMaxStock) * 100)) : 75;

  // Today sales
  const today = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.createdAt).toDateString() === today && s.status === 'CONCLUIDA');
  const todayRevenue = todaySales.reduce((acc, s) => acc + s.total, 0);
  const todayOrdersCount = todaySales.length;

  const lowStockProducts = products.filter(p => p.currentStock <= p.minStock);
  const criticalCount = lowStockProducts.length;

  // Breakdown by payment
  const pixTotal = todaySales.filter(s => s.paymentMethod === 'PIX').reduce((sum, s) => sum + s.total, 0);
  const creditTotal = todaySales.filter(s => s.paymentMethod === 'CARTAO_CREDITO').reduce((sum, s) => sum + s.total, 0);
  const debitTotal = todaySales.filter(s => s.paymentMethod === 'CARTAO_DEBITO').reduce((sum, s) => sum + s.total, 0);
  const cashTotal = todaySales.filter(s => s.paymentMethod === 'DINHEIRO').reduce((sum, s) => sum + s.total, 0);

  const lastSale = sales[0];

  const getProductStatus = (prod: Product): { label: StockStatus; badgeClass: string } => {
    if (prod.currentStock === 0) {
      return { label: 'ZERADO', badgeClass: 'bg-rose-100 text-rose-700' };
    }
    if (prod.currentStock <= prod.minStock * 0.5) {
      return { label: 'BAIXO', badgeClass: 'bg-rose-50 text-rose-600' };
    }
    if (prod.currentStock <= prod.minStock) {
      return { label: 'ALERTA', badgeClass: 'bg-amber-50 text-amber-600' };
    }
    return { label: 'NORMAL', badgeClass: 'bg-emerald-50 text-emerald-600' };
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getTimeAgo = (dateStr: string) => {
    const diffMin = Math.max(1, Math.round((Date.now() - new Date(dateStr).getTime()) / 60000));
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
      {/* 4 Stat Cards */}
      <section className="p-3 sm:p-6 lg:p-8 pb-3 sm:pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 shrink-0">
        {/* Card 1: Total Estoque */}
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Estoque</p>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
            {totalStockUnits.toLocaleString('pt-BR')}
          </h3>
          <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-500 h-full transition-all duration-500"
              style={{ width: `${stockCapacityPercentage}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-[11px] text-slate-500">
            <span>{products.length} itens cadastrados</span>
            <span>{stockCapacityPercentage}% capacidade</span>
          </div>
        </div>

        {/* Card 2: Vendas do Dia */}
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendas do Dia</p>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-3xl font-bold text-emerald-600 tracking-tight">
            {formatCurrency(todayRevenue)}
          </h3>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
              +14.2%
            </span>
            <p className="text-xs text-slate-500">em relação a ontem</p>
          </div>
        </div>

        {/* Card 3: Alertas Críticos */}
        <div 
          onClick={() => setActiveTab('inventory')}
          className="bg-white p-6 border border-slate-200 rounded-xl shadow-xs hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertas Críticos</p>
            <AlertTriangle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <h3 className="text-3xl font-bold text-rose-500 tracking-tight">
            {criticalCount.toString().padStart(2, '0')}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-rose-500 font-medium">Itens abaixo do mínimo</p>
            <ArrowRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Ordens / Vendas */}
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vendas Realizadas</p>
            <ShoppingBag className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
            {todayOrdersCount}
          </h3>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>Ticket Médio</span>
            <span className="font-semibold text-slate-700">
              {formatCurrency(todayOrdersCount > 0 ? todayRevenue / todayOrdersCount : 0)}
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Grid: Table + Sales Summary */}
      <section className="px-3 sm:px-6 lg:px-8 py-4 grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 flex-1">
        {/* Left 2 Cols: Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl flex flex-col shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
            <div className="flex items-center gap-2">
              <h4 className="font-bold uppercase text-sm tracking-widest text-slate-900">
                Últimos Produtos Movimentados
              </h4>
              <span className="text-xs font-medium text-slate-400 font-mono">
                ({products.length} itens no catálogo)
              </span>
            </div>
            <button
              onClick={() => setActiveTab('inventory')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Todos no Estoque</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Produto</th>
                  <th className="px-6 py-3">SKU</th>
                  <th className="px-6 py-3">Estoque</th>
                  <th className="px-6 py-3">Preço Un.</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100">
                {products.slice(0, 7).map(prod => {
                  const status = getProductStatus(prod);
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900 text-sm leading-snug">{prod.name}</p>
                          <p className="text-xs text-slate-400">{prod.category} • {prod.unit}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {prod.sku}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-bold ${status.label === 'BAIXO' || status.label === 'ZERADO' ? 'text-rose-600' : status.label === 'ALERTA' ? 'text-amber-600' : 'text-slate-900'}`}>
                          {prod.currentStock.toLocaleString('pt-BR')} {prod.unit.toLowerCase()}
                        </span>
                        <p className="text-[10px] text-slate-400">Min: {prod.minStock}</p>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {formatCurrency(prod.salePrice)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider inline-block ${status.badgeClass}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setStockModalProduct(prod)}
                          title="Registrar Entrada / Ajuste"
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 rounded transition-colors cursor-pointer"
                        >
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Critical Alert Banner if items low */}
          {criticalCount > 0 && (
            <div className="p-3 bg-amber-50/60 border-t border-amber-100 flex items-center justify-between px-6 text-xs text-amber-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Existem <strong>{criticalCount} produtos</strong> com estoque abaixo do limite de segurança.</span>
              </div>
              <button
                onClick={() => setActiveTab('inventory')}
                className="font-bold underline text-amber-900 hover:text-amber-950 cursor-pointer"
              >
                Gerar Lista de Compra
              </button>
            </div>
          )}
        </div>

        {/* Right 1 Col: Sales Summary Card */}
        <div className="bg-white border border-slate-200 rounded-xl flex flex-col shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h4 className="font-bold uppercase text-sm tracking-widest text-slate-900">
              Resumo de Vendas
            </h4>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
              Hoje
            </span>
          </div>

          <div className="p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-50 rounded flex items-center justify-center text-emerald-600">
                  <QrCode className="w-4 h-4" />
                </div>
                <span className="text-sm text-slate-600 font-medium">Pix</span>
              </div>
              <span className="font-bold text-slate-900 font-mono">{formatCurrency(pixTotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-50 rounded flex items-center justify-center text-indigo-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-sm text-slate-600 font-medium">Cartão Crédito</span>
              </div>
              <span className="font-bold text-slate-900 font-mono">{formatCurrency(creditTotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-50 rounded flex items-center justify-center text-blue-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-sm text-slate-600 font-medium">Cartão Débito</span>
              </div>
              <span className="font-bold text-slate-900 font-mono">{formatCurrency(debitTotal)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-50 rounded flex items-center justify-center text-amber-600">
                  <Banknote className="w-4 h-4" />
                </div>
                <span className="text-sm text-slate-600 font-medium">Dinheiro</span>
              </div>
              <span className="font-bold text-slate-900 font-mono">{formatCurrency(cashTotal)}</span>
            </div>

            <div className="border-t border-dashed border-slate-200 pt-4 flex items-center justify-between">
              <span className="font-bold text-indigo-600 text-sm">Total Bruto</span>
              <span className="font-black text-2xl text-indigo-600 font-mono">{formatCurrency(todayRevenue)}</span>
            </div>

            {/* Last Sale Box */}
            {lastSale && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Última Venda Realizada
                  </p>
                  <span className="text-[10px] text-slate-400">{getTimeAgo(lastSale.createdAt)}</span>
                </div>

                <div 
                  onClick={() => setReceiptModalSale(lastSale)}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-200 flex items-center justify-between cursor-pointer transition-colors group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900">{lastSale.code}</p>
                      <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                        {lastSale.paymentMethod.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {lastSale.customerName || 'Consumidor'} • {lastSale.items.length} itens
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-slate-900 block font-mono">
                      {formatCurrency(lastSale.total)}
                    </span>
                    <span className="text-[10px] text-indigo-600 group-hover:underline flex items-center gap-0.5 justify-end">
                      Ver Cupom <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Shift Status */}
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-slate-700">Caixa: <strong>{currentShift.operator}</strong></span>
              </div>
              <button 
                onClick={() => setActiveTab('cashier')}
                className="font-bold text-indigo-600 hover:text-indigo-800"
              >
                Gerenciar Caixa
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
