import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Category, UnitType } from '../../types';
import { X, Package, Tag, Layers, DollarSign, Barcode, MapPin } from 'lucide-react';

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

const UNITS: UnitType[] = ['PCT', 'CX', 'FARDO', 'ROLO', 'UN', 'KIT'];

export const ProductFormModal: React.FC = () => {
  const { productModalProduct, setProductModalProduct, addProduct, updateProduct, suppliers, showToast } = useApp();

  const isEditing = productModalProduct !== null && productModalProduct !== 'new';
  const editingProduct = isEditing ? (productModalProduct as Product) : null;

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState<Category>('Copos & Taças');
  const [unit, setUnit] = useState<UnitType>('PCT');
  const [itemsPerUnit, setItemsPerUnit] = useState('100');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleMinQty, setWholesaleMinQty] = useState('5');
  const [currentStock, setCurrentStock] = useState('100');
  const [minStock, setMinStock] = useState('30');
  const [maxStock, setMaxStock] = useState('500');
  const [location, setLocation] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setSku(editingProduct.sku);
      setBarcode(editingProduct.barcode);
      setCategory(editingProduct.category);
      setUnit(editingProduct.unit);
      setItemsPerUnit(editingProduct.itemsPerUnit.toString());
      setCostPrice(editingProduct.costPrice.toString());
      setSalePrice(editingProduct.salePrice.toString());
      setWholesalePrice(editingProduct.wholesalePrice ? editingProduct.wholesalePrice.toString() : '');
      setWholesaleMinQty(editingProduct.wholesaleMinQty ? editingProduct.wholesaleMinQty.toString() : '5');
      setCurrentStock(editingProduct.currentStock.toString());
      setMinStock(editingProduct.minStock.toString());
      setMaxStock(editingProduct.maxStock.toString());
      setLocation(editingProduct.location || '');
      setSupplierId(editingProduct.supplierId || '');
      setDescription(editingProduct.description || '');
    } else {
      // Defaults for new product
      setName('');
      setSku('DSC-' + Math.floor(100 + Math.random() * 900));
      setBarcode('789' + Math.floor(1000000000 + Math.random() * 9000000000));
      setCategory('Copos & Taças');
      setUnit('PCT');
      setItemsPerUnit('100');
      setCostPrice('');
      setSalePrice('');
      setWholesalePrice('');
      setWholesaleMinQty('5');
      setCurrentStock('50');
      setMinStock('20');
      setMaxStock('300');
      setLocation('Corredor A');
      setSupplierId(suppliers[0]?.id || '');
      setDescription('');
    }
  }, [editingProduct, suppliers]);

  if (!productModalProduct) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('error', 'Nome Obrigatório', 'Preencha o nome do produto.');
      return;
    }

    const cost = parseFloat(costPrice) || 0;
    const sale = parseFloat(salePrice) || 0;
    const wholesale = wholesalePrice ? parseFloat(wholesalePrice) : undefined;
    const wholesaleMin = wholesaleMinQty ? parseInt(wholesaleMinQty) : undefined;
    const matchedSupplier = suppliers.find(s => s.id === supplierId);

    const productPayload = {
      name,
      sku: sku || 'SKU-' + Date.now(),
      barcode: barcode || '789' + Date.now(),
      category,
      unit,
      itemsPerUnit: parseInt(itemsPerUnit) || 1,
      costPrice: cost,
      salePrice: sale,
      wholesalePrice: wholesale,
      wholesaleMinQty: wholesaleMin,
      currentStock: parseInt(currentStock) || 0,
      minStock: parseInt(minStock) || 10,
      maxStock: parseInt(maxStock) || 500,
      location,
      supplierId,
      supplierName: matchedSupplier?.name,
      description,
    };

    if (isEditing && editingProduct) {
      updateProduct(editingProduct.id, productPayload);
    } else {
      addProduct(productPayload);
    }

    setProductModalProduct(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92dvh] max-w-2xl sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header (Sticky on Mobile) */}
        <div className="shrink-0 p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between z-10 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Package className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                {isEditing ? `Editar "${editingProduct?.name}"` : 'Cadastrar Novo Produto'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Preencha todos os campos e salve no sistema
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProductModalProduct(null)}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ml-2"
            title="Fechar formulário"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body - Full Viewport Access */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-28 sm:pb-6 space-y-4">
          {/* Section 1: Basic Info */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                1. Identificação do Produto
              </span>
              <span className="text-[10px] text-rose-500 font-bold">* Campos obrigatórios</span>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nome do Produto / Descrição Curta *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Copo Descartável 300ml PP Transparente (C/ 100)"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Categoria *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as Category)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Unit */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Embalagem de Venda *</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value as UnitType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  {UNITS.map(u => (
                    <option key={u} value={u}>{u} (Pacote / Caixa / Fardo / Rolo / Un)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Items Per Unit */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Qtd Itens no Pacote</label>
                <input
                  type="number"
                  min="1"
                  value={itemsPerUnit}
                  onChange={e => setItemsPerUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* SKU */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Código SKU / Referência</label>
                <input
                  type="text"
                  placeholder="DSC-300"
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Barcode */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">Código de Barras</label>
                  <button
                    type="button"
                    onClick={() => setBarcode('789' + Math.floor(1000000000 + Math.random() * 9000000000))}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                  >
                    Gerar
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="789..."
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing & Wholesale */}
          <div className="bg-indigo-50/40 p-3.5 sm:p-4 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                2. Preços, Lucro e Atacado
              </span>
              {parseFloat(salePrice) > 0 && parseFloat(costPrice) > 0 && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Lucro: +{(((parseFloat(salePrice) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100).toFixed(0)}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cost Price */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Preço de Custo (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="3.50"
                  value={costPrice}
                  onChange={e => setCostPrice(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Sale Price */}
              <div>
                <label className="text-xs font-bold text-indigo-950 block mb-1">Preço Venda Varejo (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="6.90"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-indigo-500 rounded-xl text-sm font-mono font-black text-indigo-950 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Wholesale Price */}
              <div>
                <label className="text-xs font-bold text-emerald-800 block mb-1">Preço de Atacado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="5.90"
                  value={wholesalePrice}
                  onChange={e => setWholesalePrice(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-emerald-300 rounded-xl text-sm font-mono font-bold text-emerald-800 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
              <span className="font-semibold">Mínimo para Preço de Atacado:</span>
              <input
                type="number"
                min="2"
                value={wholesaleMinQty}
                onChange={e => setWholesaleMinQty(e.target.value)}
                className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-center"
              />
              <span>unidades/pcts</span>
            </div>
          </div>

          {/* Section 3: Stock Management */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              3. Controle de Estoque & Localização
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Current Stock */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Estoque Inicial Atual *</label>
                <input
                  type="number"
                  required
                  value={currentStock}
                  onChange={e => setCurrentStock(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Min Stock */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Estoque Mínimo (Alerta) *</label>
                <input
                  type="number"
                  required
                  value={minStock}
                  onChange={e => setMinStock(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Localização no Galpão</label>
                <input
                  type="text"
                  placeholder="Prateleira A-02"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Supplier */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Fabricante / Fornecedor</label>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-600 cursor-pointer"
              >
                <option value="">Selecione o Fornecedor...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Descrição / Detalhes Adicionais</label>
              <textarea
                rows={2}
                placeholder="Material, espessura, finalidade..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-indigo-600 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions (Sticky at bottom on Mobile) */}
        <div className="shrink-0 p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between sm:justify-end gap-2.5 z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setProductModalProduct(null)}
            className="px-4 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex-1 sm:flex-initial px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </button>
        </div>
      </form>
    </div>
  );
};
