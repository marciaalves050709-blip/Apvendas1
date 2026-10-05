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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">
              {isEditing ? `Editar "${editingProduct?.name}"` : 'Cadastrar Novo Produto'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setProductModalProduct(null)}
            className="text-slate-400 hover:text-white p-1 rounded cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto max-h-[75vh]">
          {/* Name */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-600 block mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Copo Descartável 300ml PP Transparente (C/ 100)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Categoria *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Unit */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Tipo de Embalagem *</label>
            <select
              value={unit}
              onChange={e => setUnit(e.target.value as UnitType)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              {UNITS.map(u => (
                <option key={u} value={u}>{u} (Pacote/Fardo/Caixa)</option>
              ))}
            </select>
          </div>

          {/* Items Per Unit */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Unidades por Embalagem</label>
            <input
              type="number"
              value={itemsPerUnit}
              onChange={e => setItemsPerUnit(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* SKU */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Código SKU</label>
            <input
              type="text"
              placeholder="CD-300-PP"
              value={sku}
              onChange={e => setSku(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Barcode */}
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-600 block mb-1">Código de Barras (EAN-13)</label>
            <input
              type="text"
              placeholder="7891234560000"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Pricing Section */}
          <div className="md:col-span-3 border-t border-slate-200 pt-3 mt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-2">
              Precificação e Atacado
            </h4>
          </div>

          {/* Cost Price */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Preço de Custo (R$) *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="3.50"
              value={costPrice}
              onChange={e => setCostPrice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Sale Price */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Preço de Venda Varejo (R$) *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="6.90"
              value={salePrice}
              onChange={e => setSalePrice(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-mono font-black text-indigo-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Wholesale Price */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Preço Atacado (R$)</label>
            <input
              type="number"
              step="0.01"
              placeholder="5.90"
              value={wholesalePrice}
              onChange={e => setWholesalePrice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Stock Section */}
          <div className="md:col-span-3 border-t border-slate-200 pt-3 mt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-2">
              Controle de Estoque & Localização
            </h4>
          </div>

          {/* Current Stock */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Estoque Atual *</label>
            <input
              type="number"
              required
              value={currentStock}
              onChange={e => setCurrentStock(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Min Stock */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Estoque Mínimo (Alerta) *</label>
            <input
              type="number"
              required
              value={minStock}
              onChange={e => setMinStock(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-1">Localização no Galpão</label>
            <input
              type="text"
              placeholder="Prateleira A-02"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Supplier */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-600 block mb-1">Fabricante / Fornecedor</label>
            <select
              value={supplierId}
              onChange={e => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="">Selecione o Fornecedor...</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="md:col-span-3">
            <label className="text-xs font-bold text-slate-600 block mb-1">Descrição / Especificações Técnicas</label>
            <textarea
              rows={2}
              placeholder="Ex: Copo plástico PP ideal para refrigerantes e sucos, borda reforçada..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setProductModalProduct(null)}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Produto'}
          </button>
        </div>
      </form>
    </div>
  );
};
