import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { CLIENT_APP_VERSION, CLIENT_CACHE_NAME } from './config/version';

// Automatic global migration and cache sanitization for existing and new users
try {
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const adminParam = urlParams.get('admin')?.toLowerCase() || urlParams.get('chave')?.toLowerCase() || urlParams.get('key')?.toLowerCase();
    const isAdminExplicit = adminParam === 'marcia2026' || adminParam === '0507';
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

      // 4. Sanitize subscription: Ensure new users receive a 2-day free trial!
      const TRIAL_2DAYS_KEY = 'appvendas_trial_2days_v50';
      const isUrlTrial = urlParams.has('teste') || urlParams.has('trial') || urlParams.has('novo') || urlParams.has('degustacao');

      if (localStorage.getItem(TRIAL_2DAYS_KEY) !== 'true' || isUrlTrial) {
        const isPixPaidStored = localStorage.getItem('appvendas_pix_paid') === 'true';
        let isLegitPaid = isPixPaidStored;
        if (subRaw) {
          try {
            const sub = JSON.parse(subRaw);
            if (sub.isSubscribed && sub.lastPaymentRef) {
              isLegitPaid = true;
            }
          } catch {}
        }

        const isAdminStored = localStorage.getItem('appvendas_is_admin') === 'true' || localStorage.getItem('appvendas_admin_session') === 'active';
        if (!isLegitPaid && !isAdminStored) {
          let existingSub: any = null;
          if (subRaw) {
            try {
              existingSub = JSON.parse(subRaw);
            } catch {}
          }

          const isTrialExpiredAlready = existingSub?.trialStartDate && (Date.now() - new Date(existingSub.trialStartDate).getTime() > 2 * 24 * 60 * 60 * 1000);

          // Grant fresh 2-day free trial for new users, trial link visitors, or devices zeroed out by old legacy migrations
          if (!existingSub || existingSub.trialDurationDays === 0 || !existingSub.trialDurationDays || isUrlTrial || isTrialExpiredAlready) {
            const trialSub = {
              isSubscribed: false,
              trialStartDate: new Date().toISOString(),
              trialDurationDays: 2,
              planPrice: 94.98,
              planName: 'Plano Pro (2 Dias Grátis de Teste)',
              subscriptionExpiresAt: '',
              lastPaymentRef: ''
            };
            localStorage.setItem('descart_clean_subscription_v1', JSON.stringify(trialSub));
            localStorage.removeItem('appvendas_test_block_active');
          }
        }
        localStorage.setItem(TRIAL_2DAYS_KEY, 'true');
      }
    }
  }
} catch (e) {
  console.warn('[Migration] Non-fatal storage check:', e);
}

// Force-bust stale caches and register PWA service worker with auto-update
const CURRENT_SW_VERSION = CLIENT_APP_VERSION;
const CURRENT_CACHE_NAME = CLIENT_CACHE_NAME;

if (typeof window !== 'undefined') {
  // Support forced cache cleanup via URL parameter (?atualizar=1 or ?limpar_cache=1)
  const params = new URLSearchParams(window.location.search);
  const isForcedRefresh = params.has('atualizar') || params.has('limpar_cache') || params.has('novo_app');
  const justUpdatedParam = params.get('atualizado');

  if (justUpdatedParam || params.has('app_ver')) {
    try {
      sessionStorage.setItem('appvendas_just_updated_ver', CURRENT_SW_VERSION);
      const cleanedUrl = new URL(window.location.href);
      cleanedUrl.searchParams.delete('atualizado');
      cleanedUrl.searchParams.delete('app_ver');
      window.history.replaceState({}, '', cleanedUrl.pathname + (cleanedUrl.search || '') + (cleanedUrl.hash || ''));
    } catch {}
  }

  // Purge any old cache versions directly on the client
  if ('caches' in window) {
    try {
      caches.keys().then((keys) => {
        keys.forEach((key) => {
          if (key !== CURRENT_CACHE_NAME || isForcedRefresh) {
            console.log('[PWA] Purging outdated cache:', key);
            caches.delete(key).catch(() => {});
          }
        });
      });
    } catch {}
  }

  let lastVersionCheckMs = 0;
  const checkServerVersionAndUpgrade = (force = false) => {
    const now = Date.now();
    if (!force && now - lastVersionCheckMs < 10000) return;
    lastVersionCheckMs = now;

    fetch(`/api/version?t=${now}`, { cache: 'no-store' })
      .then((r) => {
        const ct = r.headers.get('content-type') || '';
        return r.ok && ct.includes('application/json') ? r.json() : null;
      })
      .then((data) => {
        if (data && data.version) {
          const serverVer = String(data.version).replace(/^v/i, '').trim();
          const clientVer = String(CURRENT_SW_VERSION).replace(/^v/i, '').trim();
          if (serverVer && clientVer && serverVer !== clientVer) {
            window.dispatchEvent(new CustomEvent('app-update-available', { detail: { version: serverVer } }));
            const reloadTsKey = `pwa_version_upgraded_ts_${serverVer}`;
            const lastUpgradeTs = Number(sessionStorage.getItem(reloadTsKey) || '0');
            if (!lastUpgradeTs || Date.now() - lastUpgradeTs > 15000) {
              sessionStorage.setItem(reloadTsKey, String(Date.now()));
              console.log(`[PWA] Upgrading installed app from v${clientVer} to v${serverVer}...`);
              if (typeof (window as any).__clearAppCacheAndReload === 'function') {
                (window as any).__clearAppCacheAndReload(serverVer);
              }
            }
          }
        }
      })
      .catch(() => {});
  };

  (window as any).__checkAppUpdateNow = () => checkServerVersionAndUpgrade(true);

  // Run immediately on boot and listen to focus/visibility/online + 15s real-time interval
  checkServerVersionAndUpgrade(true);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkServerVersionAndUpgrade(true);
    }
  });
  window.addEventListener('focus', () => checkServerVersionAndUpgrade());
  window.addEventListener('online', () => checkServerVersionAndUpgrade(true));
  setInterval(() => checkServerVersionAndUpgrade(), 15 * 1000);

  if ('serviceWorker' in navigator) {
    // If forced refresh requested, unregister previous workers first
    if (isForcedRefresh) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      }).catch(() => {});
    }

    // Only reload on controllerchange if there was ALREADY an active controller (upgrade)
    // AND we haven't reloaded yet in this session (prevents screen jumping loop)
    const hadPreviousController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if ((window as any).__is_reloading_app) return;
      if (hadPreviousController && !sessionStorage.getItem('pwa_controller_reloaded')) {
        sessionStorage.setItem('pwa_controller_reloaded', 'true');
        console.log('[PWA] Controller changed -> Refreshing once to load new version');
        window.location.reload();
      }
    });

    // Listen for activation messages from a newer Service Worker (ignore same version re-registration)
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SW_ACTIVATED') {
        const swVer = String(event.data.version || '').replace(/^v/i, '').trim();
        console.log('[PWA] Service worker active:', event.data.version);
        if (swVer && swVer !== CURRENT_SW_VERSION) {
          window.dispatchEvent(new CustomEvent('app-update-available', { detail: { version: swVer } }));
          const reloadTsKey = `pwa_version_upgraded_ts_${swVer}`;
          const lastUpgradeTs = Number(sessionStorage.getItem(reloadTsKey) || '0');
          if (!lastUpgradeTs || Date.now() - lastUpgradeTs > 15000) {
            sessionStorage.setItem(reloadTsKey, String(Date.now()));
            if (typeof (window as any).__clearAppCacheAndReload === 'function') {
              (window as any).__clearAppCacheAndReload(swVer);
            }
          }
        }
      }
    });

    navigator.serviceWorker.register(`/sw.js?v=${CURRENT_SW_VERSION}`, { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        reg.update().catch(() => {});
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.dispatchEvent(new CustomEvent('app-update-available', { detail: { registration: reg } }));
        }
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.dispatchEvent(new CustomEvent('app-update-available', { detail: { registration: reg } }));
              }
            });
          }
        });

        // Whenever the user opens or switches back to the installed app on phone/desktop, check for updates
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {});
          }
        });

        window.addEventListener('focus', () => {
          reg.update().catch(() => {});
        });

        // Periodic background update check every 2 minutes
        setInterval(() => {
          reg.update().catch(() => {});
        }, 2 * 60 * 1000);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration:', err);
      });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
