import React from 'react';
import { useApp } from '../../context/AppContext';
import { ActiveTab } from '../../types';
import { 
  ShoppingBag, 
  PlusCircle, 
  ShoppingCart, 
  Receipt,
  Package, 
  Lock,
  Unlock
} from 'lucide-react';

export const MobileNavBar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    cartItemCount, 
    products,
    isCompanyAreaUnlocked,
    openCompanyAreaUnlock 
  } = useApp();

  const lowStockCount = products.filter(p => p.currentStock <= p.minStock).length;

  const items: { 
    id: ActiveTab; 
    label: string; 
    icon: React.ReactNode; 
    badge?: number; 
    highlight?: boolean;
    locked?: boolean;
  }[] = [
    {
      id: 'client-store',
      label: 'Loja Cliente',
      icon: <ShoppingBag className="w-5 h-5" />,
      highlight: true,
    },
    {
      id: 'pos',
      label: isCompanyAreaUnlocked ? 'PDV Caixa' : 'PDV 🔒',
      icon: isCompanyAreaUnlocked ? <ShoppingCart className="w-5 h-5" /> : <Lock className="w-5 h-5 text-amber-600" />,
      badge: cartItemCount > 0 ? cartItemCount : undefined,
      locked: !isCompanyAreaUnlocked,
    },
    {
      id: 'sales',
      label: isCompanyAreaUnlocked ? 'Vendas' : 'Vendas 🔒',
      icon: isCompanyAreaUnlocked ? <Receipt className="w-5 h-5" /> : <Lock className="w-5 h-5 text-amber-600" />,
      locked: !isCompanyAreaUnlocked,
    },
    {
      id: 'inventory',
      label: isCompanyAreaUnlocked ? 'Estoque' : 'Estoque 🔒',
      icon: isCompanyAreaUnlocked ? <Package className="w-5 h-5" /> : <Lock className="w-5 h-5 text-amber-600" />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      locked: !isCompanyAreaUnlocked,
    },
    {
      id: 'company-costs',
      label: isCompanyAreaUnlocked ? 'Empresa' : 'Empresa 🔒',
      icon: isCompanyAreaUnlocked ? <Unlock className="w-5 h-5 text-amber-500" /> : <Lock className="w-5 h-5 text-amber-600" />,
      locked: !isCompanyAreaUnlocked,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-lg">
      {items.map(item => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.locked) {
                openCompanyAreaUnlock(item.id);
              } else {
                setActiveTab(item.id);
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer relative min-w-[58px] ${
              isActive
                ? item.highlight
                  ? 'text-emerald-600 font-black'
                  : 'text-indigo-600 font-black'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className="relative">
              {item.icon}
              {item.badge !== undefined && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border border-white">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 whitespace-nowrap">{item.label}</span>
            {isActive && (
              <span className={`w-4 h-1 rounded-full mt-0.5 ${
                item.highlight ? 'bg-emerald-600' : 'bg-indigo-600'
              }`} />
            )}
          </button>
        );
      })}
    </div>
  );
};
