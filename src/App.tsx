import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNavBar } from './components/layout/MobileNavBar';
import { ClientStoreView } from './components/store/ClientStoreView';
import { QuickAddProductView } from './components/inventory/QuickAddProductView';
import { DashboardView } from './components/dashboard/DashboardView';
import { InventoryView } from './components/inventory/InventoryView';
import { PosView } from './components/pos/PosView';
import { SalesHistoryView } from './components/sales/SalesHistoryView';
import { CashierView } from './components/cashier/CashierView';
import { CustomersView } from './components/customers/CustomersView';
import { ReportsView } from './components/reports/ReportsView';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { StockMovementModal } from './components/modals/StockMovementModal';
import { ProductFormModal } from './components/modals/ProductFormModal';
import { CompanySettingsModal } from './components/modals/CompanySettingsModal';
import { ToastContainer } from './components/ui/ToastContainer';
import { TrialBanner } from './components/subscription/TrialBanner';
import { SubscriptionModal } from './components/subscription/SubscriptionModal';
import { AccessPaywall } from './components/subscription/AccessPaywall';
import { MobileInstallBanner } from './components/pwa/MobileInstallBanner';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab } = useApp();

  // Keyboard shortcut support (F2 for POS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveTab('pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar (Desktop) */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <MobileInstallBanner />
        <TrialBanner />
        <Header />

        {/* Dynamic Views */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {activeTab === 'client-store' && <ClientStoreView />}
          {activeTab === 'quick-add-product' && <QuickAddProductView />}
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'pos' && <PosView />}
          {activeTab === 'sales' && <SalesHistoryView />}
          {activeTab === 'cashier' && <CashierView />}
          {activeTab === 'customers' && <CustomersView />}
          {activeTab === 'reports' && <ReportsView />}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNavBar />

      {/* Global Modals, Paywall, PWA & Notifications */}
      <AccessPaywall />
      <SubscriptionModal />
      <ReceiptModal />
      <StockMovementModal />
      <ProductFormModal />
      <CompanySettingsModal />
      <OfflineIndicator />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
