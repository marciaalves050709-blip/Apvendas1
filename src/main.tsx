import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Automatic global migration and cache sanitization for existing and new users
try {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const isAdminExplicit = urlParams.get('admin')?.toLowerCase() === 'marcia2026' || urlParams.get('admin')?.toLowerCase() === 'marcia';
    
    if (!isAdminExplicit) {
      // 1. Remove legacy admin session flags from older builds
      localStorage.removeItem('appvendas_admin_session');
      localStorage.setItem('appvendas_is_admin', 'false');
      sessionStorage.removeItem('appvendas_admin_session');

      // 2. Sanitize companies list in localStorage so existing users don't see Marcia Alves as company owner
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
              if (c.ownerName === 'Marcia Alves' || c.ownerName === 'Administrador' || !c.ownerName) {
                updatedOwner = 'Meu Usuário';
                changed = true;
              }
              if (c.name === 'appvendas' || !c.name) {
                updatedName = 'Minha Empresa';
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
            s.merchantName = 'Minha Empresa';
            changed = true;
          }
          if (Array.isArray(s.sellers)) {
            s.sellers = s.sellers.map((sel: any) => {
              if (sel.name === 'Márcia Alves' || sel.name === 'Marcia Alves') {
                changed = true;
                return { ...sel, name: 'Atendente', merchantName: 'Minha Empresa' };
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

      // 4. Sanitize subscription if it was set to master admin by mistake on a client device
      const subRaw = localStorage.getItem('descart_clean_subscription_v1');
      if (subRaw) {
        try {
          const sub = JSON.parse(subRaw);
          if (sub.lastPaymentRef?.includes('MASTER-ADMIN')) {
            sub.lastPaymentRef = 'PRO-CLIENTE';
            sub.planPrice = 94.98;
            localStorage.setItem('descart_clean_subscription_v1', JSON.stringify(sub));
          }
        } catch {}
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
