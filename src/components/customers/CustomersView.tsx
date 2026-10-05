import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer, Supplier } from '../../types';
import { 
  Users, 
  Truck, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  CreditCard, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  Clock
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { customers, suppliers, addCustomer, updateCustomer, addSupplier, updateSupplier, showToast } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'CUSTOMERS' | 'SUPPLIERS'>('CUSTOMERS');
  const [search, setSearch] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  // Customer Form State
  const [customerName, setCustomerName] = useState('');
  const [customerTrade, setCustomerTrade] = useState('');
  const [customerDoc, setCustomerDoc] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCredit, setCustomerCredit] = useState('1000');
  const [customerNotes, setCustomerNotes] = useState('');

  // Supplier Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierDoc, setSupplierDoc] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierCategory, setSupplierCategory] = useState('Embalagens e Produtos');
  const [supplierLeadDays, setSupplierLeadDays] = useState('3');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      showToast('error', 'Nome Obrigatório', 'Preencha o nome do cliente.');
      return;
    }

    addCustomer({
      name: customerName,
      tradeName: customerTrade,
      document: customerDoc,
      phone: customerPhone,
      email: customerEmail,
      address: customerAddress,
      creditLimit: parseFloat(customerCredit) || 0,
      notes: customerNotes,
    });

    setIsCustomerModalOpen(false);
    setCustomerName('');
    setCustomerTrade('');
    setCustomerDoc('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerNotes('');
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      showToast('error', 'Nome Obrigatório', 'Preencha a razão social do fornecedor.');
      return;
    }

    addSupplier({
      name: supplierName,
      document: supplierDoc,
      contactPerson: supplierContact,
      phone: supplierPhone,
      email: supplierEmail,
      category: supplierCategory,
      leadTimeDays: parseInt(supplierLeadDays) || 3,
    });

    setIsSupplierModalOpen(false);
    setSupplierName('');
    setSupplierDoc('');
    setSupplierContact('');
    setSupplierPhone('');
    setSupplierEmail('');
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.tradeName && c.tradeName.toLowerCase().includes(search.toLowerCase())) ||
    c.document.includes(search) ||
    c.phone.includes(search)
  );

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.document.includes(search) ||
    s.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 p-8">
      {/* Tab Switcher & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('CUSTOMERS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'CUSTOMERS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Clientes & Lanchonetes ({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('SUPPLIERS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer ${
              activeSubTab === 'SUPPLIERS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Fornecedores & Fábricas ({suppliers.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ, telefone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>

          {activeSubTab === 'CUSTOMERS' ? (
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Cliente</span>
            </button>
          ) : (
            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Fornecedor</span>
            </button>
          )}
        </div>
      </div>

      {/* Content: Customers Cards */}
      {activeSubTab === 'CUSTOMERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCustomers.map(cust => (
            <div
              key={cust.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate leading-snug">{cust.name}</h4>
                    {cust.tradeName && (
                      <p className="text-xs text-indigo-600 font-semibold truncate">{cust.tradeName}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border shrink-0">
                    {cust.document || 'Sem doc'}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  {cust.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cust.phone}</span>
                    </div>
                  )}
                  {cust.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{cust.email}</span>
                    </div>
                  )}
                  {cust.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{cust.address}</span>
                    </div>
                  )}
                </div>

                {cust.notes && (
                  <p className="mt-3 p-2 bg-slate-50 rounded border border-slate-100 text-[11px] text-slate-500 italic">
                    "{cust.notes}"
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Comprado</span>
                  <span className="font-bold font-mono text-sm text-slate-900">
                    {formatCurrency(cust.totalPurchased || 0)}
                  </span>
                </div>

                {cust.creditLimit !== undefined && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Limite Crédito</span>
                    <span className="font-bold font-mono text-xs text-emerald-600">
                      {formatCurrency(cust.creditLimit)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content: Suppliers Cards */}
      {activeSubTab === 'SUPPLIERS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSuppliers.map(sup => (
            <div
              key={sup.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{sup.name}</h4>
                    <span className="text-xs font-mono text-slate-400">{sup.document}</span>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                    {sup.category}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Contato: <strong>{sup.contactPerson}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{sup.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Prazo de Entrega: <strong>{sup.leadTimeDays || 3} dias úteis</strong></span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Fornecedor Homologado</span>
                <span className="text-indigo-600 font-bold">Ativo</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveCustomer}
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Cadastrar Cliente / Estabelecimento</h3>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto max-h-[75vh]">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">Razão Social / Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lanchonete e Hamburgueria do Marcão"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nome Fantasia</label>
                <input
                  type="text"
                  placeholder="Ex: Marcão Burger"
                  value={customerTrade}
                  onChange={e => setCustomerTrade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">CNPJ ou CPF</label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={customerDoc}
                  onChange={e => setCustomerDoc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 98765-4321"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">E-mail Financeiro</label>
                <input
                  type="email"
                  placeholder="compras@cliente.com"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">Endereço de Entrega</label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro, cidade..."
                  value={customerAddress}
                  onChange={e => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Limite de Crédito (R$)</label>
                <input
                  type="number"
                  value={customerCredit}
                  onChange={e => setCustomerCredit(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">Observações & Padrão de Compra</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Compra fardos de guardanapo e copos todo dia 5..."
                  value={customerNotes}
                  onChange={e => setCustomerNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
              >
                Salvar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSupplier}
            className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Cadastrar Fornecedor / Fabricante</h3>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto max-h-[75vh]">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">Razão Social do Fabricante *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Copobras Embalagens S.A."
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">CNPJ</label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={supplierDoc}
                  onChange={e => setSupplierDoc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Representante Comercial</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Eduardo"
                  value={supplierContact}
                  onChange={e => setSupplierContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Telefone / Pedidos</label>
                <input
                  type="text"
                  placeholder="(11) 3456-7800"
                  value={supplierPhone}
                  onChange={e => setSupplierPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">E-mail de Pedidos</label>
                <input
                  type="email"
                  placeholder="pedidos@fabricante.com"
                  value={supplierEmail}
                  onChange={e => setSupplierEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Segmento de Produtos</label>
                <input
                  type="text"
                  placeholder="Ex: Copos e Tampas Plásticas"
                  value={supplierCategory}
                  onChange={e => setSupplierCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Prazo de Entrega (Dias)</label>
                <input
                  type="number"
                  value={supplierLeadDays}
                  onChange={e => setSupplierLeadDays(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
              >
                Salvar Fornecedor
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
