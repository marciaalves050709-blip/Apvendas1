import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Automatic global migration and cache sanitization for existing and new users
try {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin')?.toLowerCase() || urlParams.get('chave')?.toLowerCase() || urlParams.get('key')?.toLowerCase();
    const isAdminExplicit = adminParam === 'marcia2026' || adminParam === 'marcia' || adminParam === '0507';
    const isTestBlockActive = localStorage.getItem('appvendas_test_block_active') === 'true';

    // If explicit admin URL is provided, always cancel test block and activate admin
    if (isAdminExplicit) {
      localStorage.removeItem('appvendas_test_block_active');
    }

    // Check if the current device/browser is already authenticated as master admin Márcia
    const subRaw = localStorage.getItem('descart_clean_subscription_v1');
    let hasMasterSub = false;
    if (subRaw) {
      try {
        const parsedSub = JSON.parse(subRaw);
        if (
          parsedSub.isSubscribed && 
          (parsedSub.lastPaymentRef?.includes('MASTER-ADMIN') || 
           (parsedSub.subscriptionExpiresAt && new Date(parsedSub.subscriptionExpiresAt).getFullYear() > 2090))
        ) {
          hasMasterSub = true;
        }
      } catch {}
    }

    const isStoredAdmin = localStorage.getItem('appvendas_is_admin') === 'true' || localStorage.getItem('appvendas_admin_session') === 'active';
    const isMasterAdminActive = (isAdminExplicit || ((hasMasterSub || isStoredAdmin) && !isTestBlockActive));

    if (isMasterAdminActive) {
      // Preserve and ensure full master admin privileges for Márcia Alves
      localStorage.setItem('appvendas_is_admin', 'true');
      localStorage.setItem('appvendas_admin_session', 'active');
      sessionStorage.setItem('appvendas_admin_session', 'active');
      localStorage.setItem('appvendas_pix_paid', 'true');
    } else {
      // 1. Remove legacy admin session flags for regular non-admin visitors
      localStorage.removeItem('appvendas_admin_session');
      localStorage.setItem('appvendas_is_admin', 'false');
      sessionStorage.removeItem('appvendas_admin_session');

      // 2. Sanitize companies list in localStorage so clients have their own store and are not named 'Meu Usuário' or 'Marcia Alves'
      const companiesRaw = localStorage.getItem('appvendas_companies_list_v1');
      if (companiesRaw) {
        try {
          const companies = JSON.parse(companiesRaw);
          if (Array.isArray(companies)) {
            let changed = false;
            const sanitized = companies.map(c => {
              let updatedOwner = c.ownerName;
              let updatedName = c.name;
              let updatedEmail = c.email;
              if (c.ownerName === 'Marcia Alves' || c.ownerName === 'Administrador' || c.ownerName === 'Meu Usuário' || !c.ownerName) {
                updatedOwner = 'Lojista';
                changed = true;
              }
              if (c.name === 'appvendas' || !c.name) {
                updatedName = 'Minha Loja';
                changed = true;
              }
              if (c.email === 'marciaalves050709@gmail.com') {
                updatedEmail = '';
                changed = true;
              }
              return { ...c, ownerName: updatedOwner, name: updatedName, email: updatedEmail };
            });
            if (changed) {
              localStorage.setItem('appvendas_companies_list_v1', JSON.stringify(sanitized));
            }
          }
        } catch {}
      }

      // 3. Sanitize payment settings in localStorage
      const sanitizePaymentSettings = (key: string) => {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        try {
          const s = JSON.parse(raw);
          let changed = false;
          if (s.merchantName === 'MARCIA ALVES' || s.merchantName === 'appvendas') {
            s.merchantName = 'Minha Loja';
            changed = true;
          }
          if (Array.isArray(s.sellers)) {
            s.sellers = s.sellers.map((sel: any) => {
              if (sel.name === 'Márcia Alves' || sel.name === 'Marcia Alves' || sel.name === 'Meu Usuário') {
                changed = true;
                return { ...sel, name: 'Atendente', merchantName: 'Minha Loja' };
              }
              return sel;
            });
          }
          if (changed) {
            localStorage.setItem(key, JSON.stringify(s));
          }
        } catch {}
      };

      sanitizePaymentSettings('descart_clean_payment_settings_v1');
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tenant_') && k.endsWith('_payment_settings')) {
          sanitizePaymentSettings(k);
        }
      }

      // 4. Sanitize subscription: enforce that unpaid users who had the old 10s auto-unlock are strictly blocked!
      const MIGRATION_KEY = 'appvendas_pix_security_v7_unpaid_blocked';
      if (localStorage.getItem(MIGRATION_KEY) !== 'true') {
        let isLegitPaid = false;
        if (subRaw) {
          try {
            const sub = JSON.parse(subRaw);
            // Master Admin or authentic verified client payments count
            if (
              sub.isSubscribed && 
              sub.lastPaymentRef && 
              !sub.lastPaymentRef.startsWith('PIX-RADAR-') &&
              !sub.lastPaymentRef.startsWith('COMPROVANTE-')
            ) {
              isLegitPaid = true;
            }
          } catch {}
        }

        if (!isLegitPaid) {
          // Unpaid users must be strictly blocked until real payment confirmation!
          localStorage.removeItem('appvendas_pix_paid');
          localStorage.removeItem('appvendas_pix_paid_timestamp');
          const blockedSub = {
            isSubscribed: false,
            trialStartDate: new Date().toISOString(),
            trialDurationDays: 0,
            planPrice: 94.98,
            planName: 'Plano Pro (Estoque + PDV + Loja WhatsApp)',
            subscriptionExpiresAt: '',
            lastPaymentRef: ''
          };
          localStorage.setItem('descart_clean_subscription_v1', JSON.stringify(blockedSub));
        }
        localStorage.setItem(MIGRATION_KEY, 'true');
      }
    }
  }
} catch (e) {
  console.warn('[Migration] Non-fatal storage check:', e);
}

// Register PWA service worker immediately for installability, offline support and instant updates
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' })
    .then((reg) => {
      console.log('[PWA] Service Worker registered with scope:', reg.scope);
      // Force update check so all users receive updates immediately
      reg.update().catch(() => {});
    })
    .catch((err) => {
      console.warn('[PWA] Service Worker registration:', err);
    });

  // Automatically reload when new service worker takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
