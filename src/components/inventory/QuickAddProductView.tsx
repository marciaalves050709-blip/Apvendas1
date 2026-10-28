import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Category, UnitType } from '../../types';
import { formatCurrency } from '../../utils/pixHelper';
import { getProductImage, CATEGORY_EMOJIS, processGalleryImage, ALL_ACTIVITY_CATEGORIES } from '../../utils/productImages';
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
  ShoppingBag,
  Camera,
  Download,
  Building2,
  Lock
} from 'lucide-react';

const CATEGORIES: Category[] = [
  'Salão de Beleza',
  'Padaria',
  'Pizzaria',
  'Restaurante',
  'Hambúrguer',
  'Mercadinho',
  'Maquiagem',
  'Descartáveis',
  'Distribuidora',
  'Copos & Taças',
  'Pratos & Potes',
  'Marmitex & Alumínio',
  'Talheres & Canudos',
  'Guardanapos & Papéis',
  'Sacolas & Bobinas',
  'Filmes & Embalagens',
  'Higiene & Proteção',
  'Outros',
];

const UNITS: UnitType[] = ['UN', 'PCT', 'CX', 'FARDO', 'ROLO', 'KIT'];

const QUICK_SUGGESTIONS = [
  { name: 'Pão Francês Tradicional (Kg / Pct)', cat: 'Padaria' as Category, unit: 'PCT' as UnitType, items: 10, cost: 4.50, sale: 8.90, whole: 7.50, minWhole: 5 },
  { name: 'Pizza Calabresa Especial Família', cat: 'Pizzaria' as Category, unit: 'UN' as UnitType, items: 1, cost: 18.00, sale: 38.00, whole: 34.00, minWhole: 3 },
  { name: 'X-Burger Artesanal com Fritas', cat: 'Hambúrguer' as Category, unit: 'UN' as UnitType, items: 1, cost: 11.50, sale: 26.00, whole: 22.00, minWhole: 4 },
  { name: 'Shampoo Profissional Reconstrução 1L', cat: 'Salão de Beleza' as Category, unit: 'UN' as UnitType, items: 1, cost: 24.00, sale: 55.00, whole: 46.00, minWhole: 3 },
  { name: 'Base Líquida Efeito Matte Alta Cobertura', cat: 'Maquiagem' as Category, unit: 'UN' as UnitType, items: 1, cost: 14.00, sale: 32.00, whole: 27.00, minWhole: 5 },
  { name: 'Arroz Tipo 1 Branco 5kg', cat: 'Mercadinho' as Category, unit: 'FARDO' as UnitType, items: 6, cost: 21.00, sale: 29.90, whole: 26.50, minWhole: 4 },
  { name: 'Copo Descartável 200ml (C/ 100)', cat: 'Descartáveis' as Category, unit: 'PCT' as UnitType, items: 100, cost: 2.80, sale: 4.80, whole: 4.10, minWhole: 10 },
  { name: 'Fardo de Refrigerante Lata 350ml (C/ 12)', cat: 'Distribuidora' as Category, unit: 'FARDO' as UnitType, items: 12, cost: 32.00, sale: 48.00, whole: 42.00, minWhole: 5 },
];

export const QuickAddProductView: React.FC = () => {
  const { 
    products, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    quickStockAdjustment, 
    suppliers, 
    setProductModalProduct, 
    showToast, 
    setActiveTab,
    isCompanyAreaUnlocked,
    openCompanyAreaUnlock
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active View Tab: 'add' or 'list'
  const [viewMode, setViewMode] = useState<'add' | 'list'>('add');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('Mercadinho');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [unit, setUnit] = useState<UnitType>('UN');
  const [itemsPerUnit, setItemsPerUnit] = useState<number>(1);
  const [costPrice, setCostPrice] = useState<string>('5.00');
  const [salePrice, setSalePrice] = useState<string>('10.00');
  const [wholesalePrice, setWholesalePrice] = useState<string>('8.50');
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
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
    setIsCustomCategory(false);
    setUnit(s.unit);
    setItemsPerUnit(s.items);
    setCostPrice(s.cost.toFixed(2));
    setSalePrice(s.sale.toFixed(2));
    setWholesalePrice(s.whole.toFixed(2));
    setWholesaleMinQty(s.minWhole);
    showToast('info', 'Modelo Preenchido', `Dados de "${s.name}" aplicados no formulário.`);
  };

  // Image file pick from gallery or camera
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const base64 = await processGalleryImage(file);
      setImageUrl(base64);
      showToast('success', 'Foto da Galeria Carregada!', 'A foto foi anexada com sucesso ao produto.');
    } catch (err: any) {
      showToast('error', 'Erro na Foto', err.message || 'Não foi possível carregar a imagem da galeria.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Download product image to device
  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `foto-${name ? name.toLowerCase().replace(/[\s\W]+/g, '-') : 'produto'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('info', 'Download Iniciado', 'A foto está sendo salva no seu dispositivo.');
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

    const finalCategory = (isCustomCategory && customCategoryInput.trim())
      ? customCategoryInput.trim()
      : category;

    const sku = customSku.trim() || `PROD-${Math.floor(1000 + Math.random() * 9000)}`;
    const barcode = customBarcode.trim() || `789${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const matchedSupplier = suppliers.find(s => s.id === supplierId);

    addProduct({
      name: name.trim(),
      sku,
      barcode,
      category: finalCategory,
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
    setCustomCategoryInput('');
    setIsCustomCategory(false);

    showToast('success', 'Produto Cadastrado!', `"${name}" adicionado com sucesso ao catálogo.`);
  };

  // Filter products in list mode
  const filteredList = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchList.toLowerCase()) ||
      p.category.toLowerCase().includes(searchList.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchList.toLowerCase()) ||
      p.barcode.includes(searchList)
    );
  }, [products, searchList]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 shrink-0 shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Package className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Cadastrar Produtos & Fotos
              </h2>
              <p className="text-xs text-slate-300">
                Salão de beleza, padaria, pizzaria, restaurante, hamburgueria, mercadinho, maquiagem e mais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('client-store')}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Ver Loja do Cliente</span>
            </button>
          </div>
        </div>

        {/* Tab Selector: Add vs List */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('add')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'add'
                ? 'bg-white text-indigo-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Cadastrar Novo</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'list'
                ? 'bg-white text-indigo-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Ver Cadastrados ({products.length})</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-28 sm:pb-8">
        {viewMode === 'add' ? (
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Quick Segment Suggestions */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Modelos Prontos por Atividade / Segmento</span>
                </span>
                <span className="text-[10px] text-slate-500">Clique para preencher rápido</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {QUICK_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplySuggestion(s)}
                    className="p-2.5 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-2xl text-left transition-all cursor-pointer group"
                  >
                    <span className="text-[10px] font-bold text-indigo-600 block flex items-center gap-1">
                      <span>{CATEGORY_EMOJIS[s.cat] || '📦'}</span>
                      <span>{s.cat}</span>
                    </span>
                    <strong className="text-xs text-slate-800 block truncate mt-0.5">{s.name}</strong>
                    <span className="text-[10px] text-emerald-700 font-bold font-mono">{formatCurrency(s.sale)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Main Product Registration Form */}
            <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              {/* ================= FOTO DO PRODUTO (DA GALERIA) ================= */}
              <div className="bg-gradient-to-br from-indigo-50/60 to-slate-50 p-4 rounded-2xl border-2 border-dashed border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>Foto do Produto (Direto da Galeria do Celular)</span>
                  </label>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                    Galeria & Câmera
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-indigo-300 bg-white shadow-md shrink-0 flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                        <span className="text-[10px] font-bold block">Sem Foto</span>
                      </div>
                    )}

                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold gap-1">
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Carregando...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{imageUrl ? 'Trocar Foto da Galeria' : '📸 Escolher Foto da Galeria'}</span>
                      </button>

                      {imageUrl && (
                        <>
                          <button
                            type="button"
                            onClick={handleDownloadImage}
                            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Baixar foto para o celular"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Baixar Foto</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remover</span>
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tire foto do produto ou faça upload da galeria do celular. A imagem é salva direto no app!
                    </p>
                  </div>
                </div>
              </div>

              {/* Nome do Produto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nome do Produto / Descrição *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pão Francês, Pizza Calabresa, Base Matte, Hambúrguer..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 rounded-2xl text-sm font-semibold text-slate-900 outline-none"
                />
              </div>

              {/* Atividade / Categoria Segmentada */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Atividade Comercial / Segmento *
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.slice(0, 9).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setIsCustomCategory(false);
                      }}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-2 cursor-pointer ${
                        category === cat && !isCustomCategory
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-base">{CATEGORY_EMOJIS[cat] || '📦'}</span>
                      <span className="truncate">{cat}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <select
                    value={isCustomCategory ? 'OUTRO_CUSTOM' : category}
                    onChange={e => {
                      if (e.target.value === 'OUTRO_CUSTOM') {
                        setIsCustomCategory(true);
                      } else {
                        setIsCustomCategory(false);
                        setCategory(e.target.value as Category);
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="" disabled>Mais Opções de Atividade...</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_EMOJIS[cat] || '📦'} {cat}</option>
                    ))}
                    <option value="OUTRO_CUSTOM">➕ Digitar Outra Categoria...</option>
                  </select>

                  {isCustomCategory && (
                    <input
                      type="text"
                      required
                      placeholder="Nome da Categoria..."
                      value={customCategoryInput}
                      onChange={e => setCustomCategoryInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border-2 border-indigo-600 rounded-xl text-xs font-bold outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Preços: Venda, Atacado & Custo */}
              <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    <span>Valores de Venda e Custo</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    Lucro Previsto: +{profitMargin}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Preço de Venda Unitário */}
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-950 mb-1">
                      Preço Venda Normal (R$) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="10.00"
                      value={salePrice}
                      onChange={e => setSalePrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-indigo-500 focus:border-indigo-600 rounded-xl text-sm font-black text-indigo-950 outline-none"
                    />
                  </div>

                  {/* Preço Atacado */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Preço Atacado (R$)
                    </label>
                    <input
                      type="text"
                      placeholder="8.50"
                      value={wholesalePrice}
                      onChange={e => setWholesalePrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-indigo-600 rounded-xl text-sm font-bold text-amber-600 outline-none"
                    />
                  </div>

                  {/* Preço Custo (Confidencial da Empresa) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <span>Preço Custo (R$)</span>
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                    </label>
                    <input
                      type="text"
                      placeholder="5.00"
                      value={costPrice}
                      onChange={e => setCostPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 focus:border-indigo-600 rounded-xl text-sm font-bold text-slate-700 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Estoque e Fornecedor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Estoque Inicial
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={currentStock}
                    onChange={e => setCurrentStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={minStock}
                    onChange={e => setMinStock(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none"
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

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-5 h-5" />
                <span>Salvar Produto no Catálogo</span>
              </button>
            </form>
          </div>
        ) : (
          /* ================= VIEW MODE: LIST OF PRODUCTS ================= */
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar produto por nome, código ou categoria..."
                value={searchList}
                onChange={e => setSearchList(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 outline-none shadow-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredList.map(p => (
                <div key={p.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
                  <img
                    src={getProductImage(p.category, p.imageUrl)}
                    alt={p.name}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-indigo-600 block truncate">
                      {CATEGORY_EMOJIS[p.category] || '📦'} {p.category}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 truncate">{p.name}</h4>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-black text-sm text-emerald-700 font-mono">
                        {formatCurrency(p.salePrice)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold">
                        {p.currentStock} {p.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
