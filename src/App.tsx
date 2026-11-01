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
import { CompanyManagementView } from './components/company/CompanyManagementView';
import { ReceiptModal } from './components/modals/ReceiptModal';
import { StockMovementModal } from './components/modals/StockMovementModal';
import { ProductFormModal } from './components/modals/ProductFormModal';
import { CompanySettingsModal } from './components/modals/CompanySettingsModal';
import { CompanyPasswordModal } from './components/modals/CompanyPasswordModal';
import { SellerWhatsappModal } from './components/modals/SellerWhatsappModal';
import { ShareCompanyModal } from './components/modals/ShareCompanyModal';
import { CompanyProtectedView } from './components/common/CompanyProtectedView';
import { ToastContainer } from './components/ui/ToastContainer';
import { TrialBanner } from './components/subscription/TrialBanner';
import { SubscriptionModal } from './components/subscription/SubscriptionModal';
import { AccessPaywall } from './components/subscription/AccessPaywall';
import { AdminPasswordModal } from './components/subscription/AdminPasswordModal';
import { MobileInstallBanner } from './components/pwa/MobileInstallBanner';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { AppUpdateModal } from './components/pwa/AppUpdateModal';
import { AppUpdateBanner } from './components/pwa/AppUpdateBanner';

const MainLayout: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab,
    isSellerWhatsappModalOpen,
    setIsSellerWhatsappModalOpen,
    isAccessAllowed,
    isAdmin,
    isMasterAdmin,
    isTestBlockMode,
    isCompanyAreaUnlocked,
    openCompanyAreaUnlock,
    isShareModalOpen,
    closeShareModal,
    shareModalCompany,
    currentCompany,
    paymentSettings,
    activeSeller,
    products,
    showToast,
    isUpdateModalOpen,
    openUpdateModal,
    closeUpdateModal
  } = useApp();

  const isBlocked = Boolean(isTestBlockMode || (!isAdmin && !isMasterAdmin && !isAccessAllowed));

  // Keyboard shortcut support (F2 for POS) - requires company password if locked
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBlocked) return;
      if (e.key === 'F2') {
        e.preventDefault();
        if (!isCompanyAreaUnlocked) {
          openCompanyAreaUnlock('pos');
        } else {
          setActiveTab('pos');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab, isBlocked, isCompanyAreaUnlocked, openCompanyAreaUnlock]);

  const isRestrictedTab = activeTab !== 'client-store';
  const isClientStoreTab = activeTab === 'client-store';

  // Quando estiver na Loja do Cliente (vendas diretas), renderiza 100% em tela cheia,
  // SEM a barra lateral de gestão (Sidebar), SEM cabeçalho duplicado e SEM a barra de abas de gestão!
  if (isClientStoreTab) {
    return (
      <div className="flex h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full bg-slate-100 text-slate-900 font-sans overflow-hidden flex-col">
        <AppUpdateBanner onOpenUpdateModal={openUpdateModal} />
        <ClientStoreView />

        {/* Modais Globais necessários */}
        <AccessPaywall />
        <AdminPasswordModal />
        <SubscriptionModal />
        <CompanyPasswordModal />
        <CompanySettingsModal />
        <SellerWhatsappModal 
          isOpen={isSellerWhatsappModalOpen} 
          onClose={() => setIsSellerWhatsappModalOpen(false)} 
        />
        <ShareCompanyModal
          isOpen={isShareModalOpen}
          onClose={closeShareModal}
          company={shareModalCompany || currentCompany}
          paymentSettings={paymentSettings}
          activeSeller={activeSeller}
          products={products}
          onShowToast={showToast}
        />
        <AppUpdateModal isOpen={isUpdateModalOpen} onClose={closeUpdateModal} />
        <OfflineIndicator />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar (Desktop) - Apenas na Área de Gestão */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <AppUpdateBanner onOpenUpdateModal={openUpdateModal} />
        <MobileInstallBanner />
        <TrialBanner />
        <Header />

        {/* Dynamic Views with Password Shield Protection */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* If company area is locked, ANY internal view is blocked by CompanyProtectedView */}
          {isRestrictedTab && !isCompanyAreaUnlocked && (
            <CompanyProtectedView tab={activeTab} />
          )}

          {/* When company area is unlocked, render the requested management view */}
          {isRestrictedTab && isCompanyAreaUnlocked && (
            <>
              {activeTab === 'quick-add-product' && <QuickAddProductView />}
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'inventory' && <InventoryView />}
              {activeTab === 'pos' && <PosView />}
              {activeTab === 'sales' && <SalesHistoryView />}
              {activeTab === 'cashier' && <CashierView />}
              {activeTab === 'customers' && <CustomersView />}
              {activeTab === 'reports' && <ReportsView />}
              {activeTab === 'company-costs' && <CompanyManagementView />}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar - Apenas na Área de Gestão */}
      <MobileNavBar />

      {/* Global Modals, Paywall, PWA & Notifications */}
      <AccessPaywall />
      <AdminPasswordModal />
      <SubscriptionModal />
      <ReceiptModal />
      <StockMovementModal />
      <ProductFormModal />
      <CompanySettingsModal />
      <CompanyPasswordModal />
      <SellerWhatsappModal 
        isOpen={isSellerWhatsappModalOpen} 
        onClose={() => setIsSellerWhatsappModalOpen(false)} 
      />
      <ShareCompanyModal
        isOpen={isShareModalOpen}
        onClose={closeShareModal}
        company={shareModalCompany || currentCompany}
        paymentSettings={paymentSettings}
        activeSeller={activeSeller}
        products={products}
        onShowToast={showToast}
      />
      <AppUpdateModal isOpen={isUpdateModalOpen} onClose={closeUpdateModal} />
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
