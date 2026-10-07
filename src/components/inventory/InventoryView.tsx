import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Category, StockStatus } from '../../types';
import { 
  Search, 
  Plus, 
  ArrowDownToLine, 
  ArrowUpRight, 
  Filter, 
  Download, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  Package, 
  TrendingUp, 
  Tag,
  Boxes,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { getProductImage, CATEGORY_EMOJIS } from '../../utils/productImages';

const CATEGORIES: (Category | 'ALL')[] = [
  'ALL',
  'Copos & Taças',
  'Pratos & Potes',
  'Marmitex & Alumínio',
  'Talheres & Canudos',
  'Guardanapos & Papéis',
  'Sacolas & Bobinas',
  'Filmes & Embalagens',
  'Higiene & Proteção',
];

export const InventoryView: React.FC = () => {
  const { 
    products, 
    setProductModalProduct, 
    setStockModalProduct, 
    deleteProduct,
    showToast 
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'NORMAL' | 'ZERO'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      (p.supplierName && p.supplierName.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;

    let matchesStatus = true;
    if (statusFilter === 'CRITICAL') {
      matchesStatus = p.currentStock <= p.minStock;
    } else if (statusFilter === 'NORMAL') {
      matchesStatus = p.currentStock > p.minStock;
    } else if (statusFilter === 'ZERO') {
      matchesStatus = p.currentStock === 0;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    let comp = 0;
    if (sortBy === 'name') comp = a.name.localeCompare(b.name);
    else if (sortBy === 'stock') comp = a.currentStock - b.currentStock;
    else if (sortBy === 'price') comp = a.salePrice - b.salePrice;
    else if (sortBy === 'category') comp = a.category.localeCompare(b.category);

    return sortOrder === 'asc' ? comp : -comp;
  });

  const totalValueInStock = products.reduce((acc, p) => acc + (p.currentStock * p.costPrice), 0);
  const totalPotentialRevenue = products.reduce((acc, p) => acc + (p.currentStock * p.salePrice), 0);
  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleExportCSV = () => {
    const headers = ['SKU', 'Código de Barras', 'Produto', 'Categoria', 'Unidade', 'Preço Custo', 'Preço Venda', 'Preço Atacado', 'Estoque Atual', 'Estoque Mínimo', 'Localização', 'Fornecedor'];
    const rows = filteredProducts.map(p => [
      `"${p.sku}"`,
      `"${p.barcode}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.unit}"`,
      p.costPrice.toFixed(2),
      p.salePrice.toFixed(2),
      p.wholesalePrice ? p.wholesalePrice.toFixed(2) : '',
      p.currentStock,
      p.minStock,
      `"${p.location || ''}"`,
      `"${p.supplierName || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `estoque_descartaveis_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('success', 'Relatório Exportado', 'Arquivo CSV baixado com sucesso.');
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 p-3 sm:p-6 lg:p-8">
      {/* Top Inventory Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Custo do Estoque</p>
            <h4 className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatCurrency(totalValueInStock)}</h4>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Potencial de Venda</p>
            <h4 className="text-2xl font-bold text-emerald-600 mt-1 font-mono">{formatCurrency(totalPotentialRevenue)}</h4>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Alertas de Reposição</p>
            <h4 className="text-2xl font-bold text-rose-500 mt-1 font-mono">{lowStockCount} itens críticos</h4>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Controls & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU, código de barras..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-600 focus:bg-white transition-colors"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => setProductModalProduct('new')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Produto</span>
            </button>
          </div>
        </div>

        {/* Category Pills & Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Categoria:</span>
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat === 'ALL' ? 'Todos os Itens' : cat}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 py-1.5 px-2.5 focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="ALL">Todos os Níveis</option>
              <option value="CRITICAL">⚠️ Crítico / Baixo ({lowStockCount})</option>
              <option value="NORMAL">✅ Estoque Normal</option>
              <option value="ZERO">🛑 Zerado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex-1 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Mostrando {filteredProducts.length} de {products.length} produtos
          </span>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Ordenar por:</span>
            <button 
              onClick={() => {
                if (sortBy === 'name') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                else { setSortBy('name'); setSortOrder('asc'); }
              }}
              className={`font-semibold hover:text-indigo-600 ${sortBy === 'name' ? 'text-indigo-600 underline' : ''}`}
            >
              Nome {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => {
                if (sortBy === 'stock') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                else { setSortBy('stock'); setSortOrder('asc'); }
              }}
              className={`font-semibold hover:text-indigo-600 ${sortBy === 'stock' ? 'text-indigo-600 underline' : ''}`}
            >
              Estoque {sortBy === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => {
                if (sortBy === 'price') setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                else { setSortBy('price'); setSortOrder('asc'); }
              }}
              className={`font-semibold hover:text-indigo-600 ${sortBy === 'price' ? 'text-indigo-600 underline' : ''}`}
            >
              Preço {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Mobile View: High Quality Responsive Cards (sm:hidden) */}
        <div className="sm:hidden flex-1 overflow-y-auto p-3 space-y-3 pb-36">
          {filteredProducts.map(prod => {
            const status = getProductStatus(prod);
            return (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={getProductImage(prod.category, prod.imageUrl)}
                    alt={prod.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-50"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md truncate">
                        {CATEGORY_EMOJIS[prod.category] || '📦'} {prod.category}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold uppercase tracking-wider shrink-0 ${status.badgeClass}`}>
                        {status.label}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 mt-1 line-clamp-2 leading-tight">
                      {prod.name}
                    </h4>

                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      SKU: {prod.sku} • {prod.unit}
                    </p>
                    {prod.location && (
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                        📍 {prod.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pricing & Stock Details */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Venda</span>
                    <span className="text-xs font-black text-slate-900">{formatCurrency(prod.salePrice)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Custo</span>
                    <span className="text-xs font-bold text-slate-600">{formatCurrency(prod.costPrice)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">Estoque</span>
                    <span className={`text-xs font-black ${status.label === 'BAIXO' || status.label === 'ZERADO' ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {prod.currentStock} {prod.unit.toLowerCase()}
                    </span>
                  </div>
                </div>

                {/* Big Touch-Friendly Action Buttons for Mobile */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setProductModalProduct(prod)}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Atualizar Dados</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStockModalProduct(prod)}
                    title="Ajuste / Entrada de Estoque"
                    className="px-3 py-2.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Estoque</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Excluir "${prod.name}" do estoque?`)) {
                        deleteProduct(prod.id);
                      }
                    }}
                    title="Excluir produto"
                    className="p-2.5 text-rose-500 hover:bg-rose-50 border border-rose-200 rounded-xl cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-6">
              <Boxes className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Nenhum produto encontrado</p>
              <button
                type="button"
                onClick={() => setProductModalProduct('new')}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                Cadastrar Novo
              </button>
            </div>
          )}
        </div>

        {/* Desktop View: Full Comprehensive Table (hidden sm:block) */}
        <div className="hidden sm:block flex-1 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Produto / Detalhes</th>
                <th className="px-4 py-3.5">SKU & Barras</th>
                <th className="px-4 py-3.5">Categoria & Unidade</th>
                <th className="px-4 py-3.5">Preço Custo</th>
                <th className="px-4 py-3.5">Preço Venda</th>
                <th className="px-4 py-3.5">Regra Atacado</th>
                <th className="px-4 py-3.5">Estoque Atual</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {filteredProducts.map(prod => {
                const status = getProductStatus(prod);
                return (
                  <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Name */}
                    <td className="px-6 py-4 max-w-xs">
                      <p className="font-bold text-slate-900 text-sm leading-snug">{prod.name}</p>
                      {prod.description && (
                        <p className="text-xs text-slate-400 truncate mt-0.5" title={prod.description}>
                          {prod.description}
                        </p>
                      )}
                      {prod.location && (
                        <span className="inline-block mt-1 text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          📍 {prod.location}
                        </span>
                      )}
                    </td>

                    {/* SKU & Barcode */}
                    <td className="px-4 py-4">
                      <p className="font-mono text-xs font-bold text-slate-700">{prod.sku}</p>
                      <p className="font-mono text-[11px] text-slate-400">{prod.barcode}</p>
                    </td>

                    {/* Category & Unit */}
                    <td className="px-4 py-4">
                      <span className="text-xs font-semibold text-slate-800 block">{prod.category}</span>
                      <span className="text-[11px] text-slate-400">
                        {prod.unit} ({prod.itemsPerUnit} un/{prod.unit.toLowerCase()})
                      </span>
                    </td>

                    {/* Cost */}
                    <td className="px-4 py-4 font-mono text-xs text-slate-600">
                      {formatCurrency(prod.costPrice)}
                    </td>

                    {/* Sale Price */}
                    <td className="px-4 py-4 font-mono font-bold text-sm text-slate-900">
                      {formatCurrency(prod.salePrice)}
                    </td>

                    {/* Wholesale */}
                    <td className="px-4 py-4">
                      {prod.wholesalePrice ? (
                        <div>
                          <p className="font-mono text-xs font-bold text-indigo-600">
                            {formatCurrency(prod.wholesalePrice)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            A partir de {prod.wholesaleMinQty} {prod.unit.toLowerCase()}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 font-mono">—</span>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold font-mono text-sm ${status.label === 'BAIXO' || status.label === 'ZERADO' ? 'text-rose-600' : status.label === 'ALERTA' ? 'text-amber-600' : 'text-slate-900'}`}>
                          {prod.currentStock.toLocaleString('pt-BR')}
                        </span>
                        <span className="text-xs text-slate-400">{prod.unit.toLowerCase()}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Mínimo: {prod.minStock} un
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 text-[10px] rounded-full font-bold uppercase tracking-wider inline-block ${status.badgeClass}`}>
                        {status.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setStockModalProduct(prod)}
                          title="Entrada de Compra / Ajuste de Estoque"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded border border-indigo-200 transition-colors cursor-pointer"
                        >
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProductModalProduct(prod)}
                          title="Editar Cadastro"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir "${prod.name}" do estoque?`)) {
                              deleteProduct(prod.id);
                            }
                          }}
                          title="Excluir"
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded border border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                        <Boxes className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-black text-slate-800">
                        {products.length === 0 ? 'Nenhum produto cadastrado ainda' : 'Nenhum produto encontrado'}
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm">
                        {products.length === 0
                          ? 'O sistema está 100% limpo e pronto para o cliente cadastrar seus produtos, fardos, caixas e preços de venda.'
                          : 'Tente alterar os termos de busca ou filtros de categoria.'}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2 justify-center">
                        <button
                          type="button"
                          onClick={() => setProductModalProduct({} as Product)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Cadastrar Primeiro Produto</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
