import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Category, UnitType } from '../../types';
import { 
  X, 
  Package, 
  Tag, 
  Layers, 
  DollarSign, 
  Barcode, 
  MapPin, 
  Camera, 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  RefreshCw,
  Sparkles 
} from 'lucide-react';
import { processGalleryImage, getProductImage, CATEGORY_EMOJIS } from '../../utils/productImages';

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

export const ProductFormModal: React.FC = () => {
  const { productModalProduct, setProductModalProduct, addProduct, updateProduct, suppliers, showToast } = useApp();

  const isEditing = productModalProduct !== null && productModalProduct !== 'new';
  const editingProduct = isEditing ? (productModalProduct as Product) : null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState<Category>('Mercadinho');
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [unit, setUnit] = useState<UnitType>('UN');
  const [itemsPerUnit, setItemsPerUnit] = useState('1');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [wholesaleMinQty, setWholesaleMinQty] = useState('5');
  const [currentStock, setCurrentStock] = useState('50');
  const [minStock, setMinStock] = useState('10');
  const [maxStock, setMaxStock] = useState('500');
  const [location, setLocation] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setSku(editingProduct.sku);
      setBarcode(editingProduct.barcode);
      const isKnownCategory = CATEGORIES.includes(editingProduct.category);
      if (isKnownCategory) {
        setCategory(editingProduct.category);
        setIsCustomCategory(false);
        setCustomCategoryInput('');
      } else {
        setCategory('Outros');
        setIsCustomCategory(true);
        setCustomCategoryInput(editingProduct.category);
      }
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
      setImageUrl(editingProduct.imageUrl || '');
    } else {
      // Defaults for new product
      setName('');
      setSku('PROD-' + Math.floor(100 + Math.random() * 900));
      setBarcode('789' + Math.floor(1000000000 + Math.random() * 9000000000));
      setCategory('Mercadinho');
      setIsCustomCategory(false);
      setCustomCategoryInput('');
      setUnit('UN');
      setItemsPerUnit('1');
      setCostPrice('');
      setSalePrice('');
      setWholesalePrice('');
      setWholesaleMinQty('5');
      setCurrentStock('50');
      setMinStock('10');
      setMaxStock('300');
      setLocation('Prateleira A-01');
      setSupplierId(suppliers[0]?.id || '');
      setDescription('');
      setImageUrl('');
    }
  }, [editingProduct, suppliers]);

  if (!productModalProduct) return null;

  // Handle image upload from device gallery or camera
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const base64 = await processGalleryImage(file);
      setImageUrl(base64);
      showToast('success', 'Foto da Galeria Anexada!', 'Imagem do produto carregada com sucesso.');
    } catch (err: any) {
      showToast('error', 'Erro ao Carregar', err.message || 'Não foi possível carregar a imagem da galeria.');
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
    showToast('info', 'Download da Foto', 'Arquivo da foto salvo no seu dispositivo.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('error', 'Nome Obrigatório', 'Preencha o nome do produto.');
      return;
    }

    const finalCategory = (isCustomCategory && customCategoryInput.trim()) 
      ? customCategoryInput.trim() 
      : category;

    const cost = parseFloat(costPrice) || 0;
    const sale = parseFloat(salePrice) || 0;
    const wholesale = wholesalePrice ? parseFloat(wholesalePrice) : undefined;
    const wholesaleMin = wholesaleMinQty ? parseInt(wholesaleMinQty) : undefined;
    const matchedSupplier = suppliers.find(s => s.id === supplierId);

    const productPayload = {
      name: name.trim(),
      sku: sku || 'SKU-' + Date.now(),
      barcode: barcode || '789' + Date.now(),
      category: finalCategory,
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
      imageUrl: imageUrl.trim() || undefined,
    };

    if (isEditing && editingProduct) {
      updateProduct(editingProduct.id, productPayload);
      showToast('success', 'Produto Atualizado', `"${name}" atualizado com sucesso.`);
    } else {
      addProduct(productPayload);
      showToast('success', 'Produto Cadastrado', `"${name}" adicionado ao catálogo.`);
    }

    setProductModalProduct(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92dvh] max-w-2xl sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="shrink-0 p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between z-10 border-b border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Package className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                {isEditing ? `Editar "${editingProduct?.name}"` : 'Cadastrar Novo Produto'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Venda direta ao cliente com fotos e controle de estoque
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProductModalProduct(null)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          
          {/* ================= SECTION 0: FOTO DIRETO DA GALERIA ================= */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-4 rounded-2xl border-2 border-dashed border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-600" />
                <span>Foto do Produto (Direto da Galeria do Celular/PC)</span>
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                Galeria & Câmera
              </span>
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
            />

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Photo Preview Container */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-indigo-300 bg-slate-100 shadow-md shrink-0 flex items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Foto do produto"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2 text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                    <span className="text-[10px] font-bold block">Sem Foto</span>
                    <span className="text-[9px] text-slate-400">Usa padrão</span>
                  </div>
                )}

                {isUploadingImage && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold gap-1.5">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Carregando...</span>
                  </div>
                )}
              </div>

              {/* Photo Action Buttons */}
              <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>{imageUrl ? 'Trocar Foto da Galeria' : '📸 Escolher Foto da Galeria'}</span>
                  </button>

                  {imageUrl && (
                    <>
                      <button
                        type="button"
                        onClick={handleDownloadImage}
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Baixar a foto para o celular ou computador"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar Foto</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Remover foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  Tire foto direto da câmera ou escolha uma imagem salva no seu celular. A foto aparece para os clientes na loja virtual e no cupom de pedidos!
                </p>
              </div>
            </div>
          </div>

          {/* ================= SECTION 1: IDENTIFICAÇÃO & ATIVIDADES ================= */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                1. Atividade, Segmento & Nome do Produto
              </span>
              <span className="text-[10px] text-rose-500 font-bold">* Campos obrigatórios</span>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Pão Francês 50g, Pizza Calabresa, Base Líquida, Copo 200ml..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {/* Category / Business Segment Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Atividade / Segmento Comercial *
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
                    className={`p-2 rounded-xl text-xs font-bold border transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                      category === cat && !isCustomCategory
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{CATEGORY_EMOJIS[cat] || '📦'}</span>
                    <span className="truncate">{cat}</span>
                  </button>
                ))}
              </div>

              {/* Extra Category Select dropdown */}
              <div className="pt-1 flex gap-2">
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
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="" disabled>Mais Categorias / Outros Segmentos...</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_EMOJIS[cat] || '📦'} {cat}
                    </option>
                  ))}
                  <option value="OUTRO_CUSTOM">➕ Digitar Outra Categoria Personalizada...</option>
                </select>

                {isCustomCategory && (
                  <input
                    type="text"
                    required
                    placeholder="Digite o nome da categoria..."
                    value={customCategoryInput}
                    onChange={e => setCustomCategoryInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border-2 border-indigo-600 rounded-xl text-xs font-bold text-indigo-950 outline-none"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {/* Unit */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Unidade de Medida *</label>
                <select
                  value={unit}
                  onChange={e => setUnit(e.target.value as UnitType)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-600 cursor-pointer"
                >
                  {UNITS.map(u => (
                    <option key={u} value={u}>{u} (Un / Pacote / Caixa / Fardo / Rolo / Kit)</option>
                  ))}
                </select>
              </div>

              {/* SKU */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Código SKU</label>
                <input
                  type="text"
                  placeholder="PROD-101"
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Barcode */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Código de Barras EAN</label>
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

          {/* ================= SECTION 2: PREÇO DE VENDA & CUSTO ================= */}
          <div className="bg-indigo-50/40 p-3.5 sm:p-4 rounded-xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                2. Preço de Venda, Custo da Empresa & Atacado
              </span>
              {parseFloat(salePrice) > 0 && parseFloat(costPrice) > 0 && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Lucro: +{(((parseFloat(salePrice) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100).toFixed(0)}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Sale Price (Most Important for Direct Sales) */}
              <div>
                <label className="text-xs font-bold text-indigo-950 block mb-1">
                  Preço Venda Varejo (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="10.00"
                  value={salePrice}
                  onChange={e => setSalePrice(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border-2 border-indigo-500 rounded-xl text-sm font-mono font-black text-indigo-950 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Cost Price (Confidential - Hidden from client) */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Preço de Custo (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="5.00"
                  value={costPrice}
                  onChange={e => setCostPrice(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>

              {/* Wholesale Price */}
              <div>
                <label className="text-xs font-bold text-emerald-800 block mb-1">
                  Preço de Atacado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="8.50"
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
              <span>unidades/itens</span>
            </div>
          </div>

          {/* ================= SECTION 3: ESTOQUE & FORNECEDOR ================= */}
          <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              3. Controle de Estoque & Fornecedor
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Current Stock */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Estoque Atual *</label>
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Localização na Loja / Depósito</label>
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
              <label className="text-xs font-bold text-slate-700 block mb-1">Descrição / Detalhes para o Cliente</label>
              <textarea
                rows={2}
                placeholder="Detalhes, sabor, tamanho, benefícios do produto..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-indigo-600 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
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
