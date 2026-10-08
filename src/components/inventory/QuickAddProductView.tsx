import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Category, UnitType } from '../../types';
import { formatCurrency } from '../../utils/pixHelper';
import { getProductImage, CATEGORY_EMOJIS, CATEGORY_IMAGE_PRESETS } from '../../utils/productImages';
import { 
  Plus, 
  Package, 
  Search, 
  Sparkles, 
  Check, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Layers, 
  Barcode, 
  Image as ImageIcon, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';

const CATEGORIES: Category[] = [
  'Copos & Taças',
  'Pratos & Potes',
  'Marmitex & Alumínio',
  'Talheres & Canudos',
  'Guardanapos & Papéis',
  'Sacolas & Bobinas',
  'Filmes & Embalagens',
  'Higiene & Proteção',
];

const UNITS: UnitType[] = ['PCT', 'CX', 'FARDO', 'UN', 'ROLO', 'KIT'];

const QUICK_SUGGESTIONS = [
  { name: 'Copo 200ml Branco (C/ 100)', cat: 'Copos & Taças' as Category, unit: 'PCT' as UnitType, items: 100, cost: 2.80, sale: 4.50, whole: 3.90, minWhole: 10 },
  { name: 'Prato 21cm Branco Reforçado (C/ 10)', cat: 'Pratos & Potes' as Category, unit: 'PCT' as UnitType, items: 10, cost: 1.90, sale: 3.20, whole: 2.75, minWhole: 15 },
  { name: 'Guardanapo Folha Dupla 30x30 (C/ 2000)', cat: 'Guardanapos & Papéis' as Category, unit: 'FARDO' as UnitType, items: 2000, cost: 5.40, sale: 8.90, whole: 7.80, minWhole: 5 },
  { name: 'Marmitex Alumínio Nº 8 c/ Tampa (C/ 100)', cat: 'Marmitex & Alumínio' as Category, unit: 'CX' as UnitType, items: 100, cost: 42.00, sale: 68.00, whole: 59.90, minWhole: 4 },
  { name: 'Sacola Plástica Branca 40x50 (C/ 1000)', cat: 'Sacolas & Bobinas' as Category, unit: 'FARDO' as UnitType, items: 1000, cost: 34.00, sale: 55.00, whole: 48.00, minWhole: 3 },
  { name: 'Filme PVC Transparente 28cm x 300m', cat: 'Filmes & Embalagens' as Category, unit: 'ROLO' as UnitType, items: 1, cost: 19.50, sale: 32.00, whole: 28.00, minWhole: 3 },
];

export const QuickAddProductView: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, quickStockAdjustment, suppliers, setProductModalProduct, showToast, setActiveTab } = useApp();

  // Active View Tab: 'add' or 'list'
  const [viewMode, setViewMode] = useState<'add' | 'list'>('add');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Copos & Taças');
  const [unit, setUnit] = useState<UnitType>('PCT');
  const [itemsPerUnit, setItemsPerUnit] = useState<number>(100);
  const [costPrice, setCostPrice] = useState<string>('2.50');
  const [salePrice, setSalePrice] = useState<string>('4.50');
  const [wholesalePrice, setWholesalePrice] = useState<string>('3.90');
  const [wholesaleMinQty, setWholesaleMinQty] = useState<number>(5);
  const [currentStock, setCurrentStock] = useState<number>(50);
  const [minStock, setMinStock] = useState<number>(10);
  const [maxStock, setMaxStock] = useState<number>(300);
  const [location, setLocation] = useState<string>('Prateleira A-01');
  const [supplierId, setSupplierId] = useState<string>('');
  const [customBarcode, setCustomBarcode] = useState<string>('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [customSku, setCustomSku] = useState('');

  // Search in list
  const [searchList, setSearchList] = useState('');

  // Profit calculation preview
  const numCost = parseFloat(costPrice.replace(',', '.')) || 0;
  const numSale = parseFloat(salePrice.replace(',', '.')) || 0;
  const profitMargin = numSale > 0 && numCost > 0 ? (((numSale - numCost) / numCost) * 100).toFixed(0) : '0';

  // Apply Quick Suggestion
  const handleApplySuggestion = (s: typeof QUICK_SUGGESTIONS[0]) => {
    setName(s.name);
    setCategory(s.cat);
    setUnit(s.unit);
    setItemsPerUnit(s.items);
    setCostPrice(s.cost.toFixed(2));
    setSalePrice(s.sale.toFixed(2));
    setWholesalePrice(s.whole.toFixed(2));
    setWholesaleMinQty(s.minWhole);
    showToast('info', 'Modelo Preenchido', `Dados de "${s.name}" aplicados no formulário.`);
  };

  // Submit New Product
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('error', 'Nome Obrigatório', 'Informe o nome do produto.');
      return;
    }

    const sale = parseFloat(salePrice.replace(',', '.')) || 0;
    const cost = parseFloat(costPrice.replace(',', '.')) || 0;
    const whole = parseFloat(wholesalePrice.replace(',', '.')) || undefined;

    if (sale <= 0) {
      showToast('error', 'Preço Inválido', 'O preço de venda deve ser maior que zero.');
      return;
    }

    const sku = customSku.trim() || `DESC-${Math.floor(1000 + Math.random() * 9000)}`;
    const barcode = customBarcode.trim() || `789${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const matchedSupplier = suppliers.find(s => s.id === supplierId);

    const newProd = addProduct({
      name: name.trim(),
      sku,
      barcode,
      category,
      unit,
      itemsPerUnit: Number(itemsPerUnit) || 1,
      costPrice: cost,
      salePrice: sale,
      wholesalePrice: whole,
      wholesaleMinQty: Number(wholesaleMinQty) || 5,
      currentStock: Number(currentStock) || 0,
      minStock: Number(minStock) || 5,
      maxStock: Number(maxStock) || 300,
      location: location.trim(),
      supplierId: supplierId || undefined,
      supplierName: matchedSupplier?.name,
      description: description.trim(),
      imageUrl: imageUrl.trim() || undefined,
    });

    // Reset Form
    setName('');
    setDescription('');
    setImageUrl('');
    setCustomSku('');
    setCustomBarcode('');
    setLocation('Prateleira A-01');
    setSupplierId('');
    setCurrentStock(50);
    setViewMode('list');

    showToast('success', 'Produto Adicionado!', `"${newProd.name}" já está disponível para venda no PDV e na Loja do Cliente.`);
  };

  // Filtered list of products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const term = searchList.toLowerCase();
      return p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
    });
  }, [products, searchList]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Top Mobile Bar */}
      <div className="p-4 bg-white border-b border-slate-200 shrink-0 flex items-center justify-between shadow-xs">
        <div>
          <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <span>Adicionar & Gerenciar Produtos</span>
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block">
            Cadastre novos produtos e controle preços e estoque facilmente pelo celular na sua empresa.
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('add')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'add'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar</span>
          </button>

          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Ver Produtos ({products.length}) • Atualizar</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-36 sm:pb-16">
        <div className="max-w-4xl mx-auto">
          {viewMode === 'add' ? (
            <div className="space-y-4">
              {/* Quick Template Suggestions */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Modelos Prontos para Preencher Rápido:</span>
                </p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
                  {QUICK_SUGGESTIONS.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplySuggestion(s)}
                      className="px-3 py-2 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 rounded-xl text-left whitespace-nowrap font-medium text-slate-700 transition-all cursor-pointer shrink-0"
                    >
                      <span className="font-bold text-indigo-700 block">{s.name}</span>
                      <span className="text-[10px] text-slate-500">{formatCurrency(s.sale)} • {s.items} un</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Product Registration Form */}
              <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-sm uppercase tracking-wide text-slate-800">
                    Dados do Novo Produto
                  </h3>
                  <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Lucro Estimado: +{profitMargin}%
                  </span>
                </div>

                {/* Nome do Produto */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nome do Produto / Descrição Curta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Copo Descartável 200ml Branco (C/ 100)"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-2xl text-sm font-semibold text-slate-900 outline-none"
                  />
                </div>

                {/* Categoria & Unidade */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Categoria */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Categoria do Produto
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as Category)}
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-600 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {CATEGORY_EMOJIS[cat]} {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Unidade & Itens por Pacote */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Embalagem
                      </label>
                      <select
                        value={unit}
                        onChange={e => setUnit(e.target.value as UnitType)}
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none cursor-pointer"
                      >
                        {UNITS.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Unidades/Pct
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={itemsPerUnit}
                        onChange={e => setItemsPerUnit(Number(e.target.value))}
                        className="w-full px-3 py-3 bg-slate-50 border border-slate-300 focus:bg-white rounded-xl text-xs font-bold text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Preços: Venda, Atacado e Custo */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Precificação & Valores</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Preço de Venda Unitário */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Preço Venda Normal (R$) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="4.50"
                        value={salePrice}
                        onChange={e => setSalePrice(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-indigo-600 rounded-xl text-sm font-black text-emerald-600 outline-none"
                      />
                    </div>

                    {/* Preço Atacado */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Preço Atacado (R$)
                      </label>
                      <input
                        type="text"
                        placeholder="3.90"
                        value={wholesalePrice}
                        onChange={e => setWholesalePrice(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-indigo-600 rounded-xl text-sm font-bold text-amber-600 outline-none"
                      />
                    </div>

                    {/* Preço Custo */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Preço Custo (R$)
                      </label>
                      <input
                        type="text"
                        placeholder="2.50"
                        value={costPrice}
                        onChange={e => setCostPrice(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-indigo-600 rounded-xl text-sm font-bold text-slate-700 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                    <span>Mínimo para Preço de Atacado:</span>
                    <input
                      type="number"
                      min={2}
                      value={wholesaleMinQty}
                      onChange={e => setWholesaleMinQty(Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                    />
                    <span>unidades/pcts</span>
                  </div>
                </div>

                {/* Estoque Inicial, Alerta & Máximo */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Estoque Inicial (Un/Pct)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={currentStock}
                      onChange={e => setCurrentStock(Number(e.target.value))}
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Alerta de Estoque Baixo
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={minStock}
                      onChange={e => setMinStock(Number(e.target.value))}
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Estoque Máximo
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={maxStock}
                      onChange={e => setMaxStock(Number(e.target.value))}
                      className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Localização & Fornecedor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Localização no Galpão / Prateleira
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Prateleira A-01"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Fabricante / Fornecedor
                    </label>
                    <select
                      value={supplierId}
                      onChange={e => setSupplierId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none cursor-pointer"
                    >
                      <option value="">Selecione o Fornecedor...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Imagem URL & SKU & Código de Barras */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Link da Foto / Imagem</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://exemplo.com/foto.jpg"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5 text-slate-400" />
                      <span>Código SKU Personalizado</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: CD-200-W"
                      value={customSku}
                      onChange={e => setCustomSku(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Código de Barras
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomBarcode('789' + Math.floor(1000000000 + Math.random() * 9000000000))}
                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                      >
                        Gerar
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="789..."
                      value={customBarcode}
                      onChange={e => setCustomBarcode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Descrição Adicional */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Detalhes Adicionais / Descrição
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Material, espessura, finalidade..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none resize-none"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Salvar e Disponibilizar no Catálogo</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* LIST OF EXISTING PRODUCTS */
            <div className="space-y-4">
              {/* Search bar */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar produto cadastrado..."
                  value={searchList}
                  onChange={e => setSearchList(e.target.value)}
                  className="w-full text-xs font-medium outline-none bg-transparent"
                />
              </div>

              {/* Product Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredProducts.map(prod => (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={getProductImage(prod.category, prod.imageUrl)}
                        alt={prod.name}
                        className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                          {CATEGORY_EMOJIS[prod.category]} {prod.category}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">{prod.name}</h4>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {prod.unit} • {prod.itemsPerUnit} un | SKU: {prod.sku}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Preço Venda</p>
                        <p className="text-sm font-black text-slate-900">{formatCurrency(prod.salePrice)}</p>
                      </div>

                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Estoque</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          prod.currentStock <= prod.minStock ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {prod.currentStock} un
                        </span>
                      </div>

                      {/* Quick actions: Atualizar, stock add and delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setProductModalProduct(prod)}
                          title="Atualizar dados, preço e estoque deste produto"
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                        >
                          <Edit3 className="w-3 h-3 text-indigo-600" />
                          <span>Atualizar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => quickStockAdjustment(prod.id, prod.currentStock + 10, 'Ajuste Rápido (+10)')}
                          title="Adicionar 10 unidades"
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => quickStockAdjustment(prod.id, prod.currentStock + 50, 'Ajuste Rápido (+50)')}
                          title="Adicionar 50 unidades"
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                        >
                          +50
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Excluir "${prod.name}"?`)) {
                              deleteProduct(prod.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
