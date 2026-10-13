import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __PWA_INSTALL_PROMPT__?: BeforeInstallPromptEvent | null;
  }
}

export interface InstallResult {
  success: boolean;
  outcome?: 'accepted' | 'dismissed';
  action: 'prompt' | 'opened_window' | 'ios_share' | 'android_intent' | 'modal' | 'already_installed';
}

// Global singleton prompt holder & subscriber list to keep all components in sync
let globalPrompt: BeforeInstallPromptEvent | null = null;
const promptSubscribers = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

function setGlobalPrompt(prompt: BeforeInstallPromptEvent | null) {
  globalPrompt = prompt;
  if (typeof window !== 'undefined') {
    window.__PWA_INSTALL_PROMPT__ = prompt;
  }
  promptSubscribers.forEach((cb) => cb(prompt));
}

// Helper to wait for beforeinstallprompt if page was just loaded
function waitForPrompt(timeoutMs = 1200): Promise<BeforeInstallPromptEvent | null> {
  return new Promise((resolve) => {
    if (globalPrompt) {
      return resolve(globalPrompt);
    }
    if (typeof window !== 'undefined' && window.__PWA_INSTALL_PROMPT__) {
      return resolve(window.__PWA_INSTALL_PROMPT__);
    }

    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    const onReady = (e: Event) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        window.removeEventListener('pwa-prompt-ready', onReady);
        window.removeEventListener('beforeinstallprompt', onReady);
        const p = (e as CustomEvent).detail || (e as BeforeInstallPromptEvent);
        resolve(p);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pwa-prompt-ready', onReady, { once: true });
      window.addEventListener('beforeinstallprompt', onReady, { once: true });
    }
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (globalPrompt) return globalPrompt;
    if (typeof window !== 'undefined' && window.__PWA_INSTALL_PROMPT__) {
      return window.__PWA_INSTALL_PROMPT__;
    }
    return null;
  });

  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);

  useEffect(() => {
    // 1. Detect iframe
    try {
      setIsIframe(window.self !== window.top);
    } catch {
      setIsIframe(true);
    }

    // 2. Detect standalone mode / already installed
    const checkStandalone = () => {
      const standaloneQuery = window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      let persistedInstalled = false;
      try {
        persistedInstalled = localStorage.getItem('appvendas_pwa_installed') === 'true';
      } catch {
        // ignore
      }
      const runningStandalone = standaloneQuery || iosStandalone;
      setIsStandalone(runningStandalone);
      setIsInstalled(runningStandalone || persistedInstalled);
    };

    checkStandalone();

    // 3. Detect device type & in-app browsers
    if (typeof window !== 'undefined' && window.navigator) {
      const ua = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(ua));
      setIsAndroid(/android/.test(ua));
      setIsInAppBrowser(/fban|fbav|instagram|whatsapp|micromessenger|tiktok|line\//.test(ua));
    }

    // 4. Subscribe to prompt updates
    const onPromptChange = (prompt: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(prompt);
    };
    promptSubscribers.add(onPromptChange);

    // Check if prompt was already stored on window
    if (typeof window !== 'undefined' && window.__PWA_INSTALL_PROMPT__) {
      setGlobalPrompt(window.__PWA_INSTALL_PROMPT__);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setGlobalPrompt(promptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setGlobalPrompt(null);
      try {
        localStorage.setItem('appvendas_pwa_installed', 'true');
      } catch {
        // ignore
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-prompt-ready', ((e: CustomEvent) => {
      if (e.detail) setGlobalPrompt(e.detail);
    }) as EventListener);
    window.addEventListener('pwa-installed', handleAppInstalled);

    // 5. Check if page was opened with ?install=1 / ?install=now / ?install=true
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('install')) {
        // User explicitly opened the page to install
        setTimeout(async () => {
          const prompt = await waitForPrompt(2000);
          if (prompt) {
            try {
              await prompt.prompt();
              const choice = await prompt.userChoice;
              if (choice.outcome === 'accepted') {
                handleAppInstalled();
              }
            } catch {
              // ignore
            }
          }
        }, 600);
      }
    } catch {
      // ignore
    }

    return () => {
      promptSubscribers.delete(onPromptChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const openDirectInstallInBrowser = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('install', '1');
      const win = window.open(url.toString(), '_blank');
      return Boolean(win);
    } catch {
      return false;
    }
  };

  const install = async (): Promise<InstallResult> => {
    // If already running inside standalone app
    if (isStandalone) {
      return { success: true, action: 'already_installed' };
    }

    // Try prompt
    let promptToUse = deferredPrompt || globalPrompt || (typeof window !== 'undefined' ? window.__PWA_INSTALL_PROMPT__ : null);

    // If prompt not ready yet and not iOS or iframe, wait a moment for it
    if (!promptToUse && !isIOS && !isIframe && !isInAppBrowser) {
      promptToUse = await waitForPrompt(1200);
    }

    // If native prompt is available: EXECUTE DIRECTLY
    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const { outcome } = await promptToUse.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setIsStandalone(true);
          setGlobalPrompt(null);
          try {
            localStorage.setItem('appvendas_pwa_installed', 'true');
          } catch {
            // ignore
          }
          return { success: true, outcome: 'accepted', action: 'prompt' };
        }
        return { success: false, outcome: 'dismissed', action: 'prompt' };
      } catch (err) {
        console.warn('[PWA] Direct prompt launch error:', err);
      }
    }

    // If inside an iframe (e.g. AI Studio preview), open in top/new tab with ?install=1
    if (isIframe) {
      const opened = openDirectInstallInBrowser();
      if (opened) {
        return { success: true, action: 'opened_window' };
      }
    }

    // If inside in-app browser on Android (e.g. WhatsApp / Instagram)
    if (isInAppBrowser && isAndroid) {
      try {
        const fullUrl = new URL(window.location.href);
        fullUrl.searchParams.set('install', '1');
        const chromeIntent = `intent://${fullUrl.host}${fullUrl.pathname}${fullUrl.search}#Intent;scheme=https;package=com.android.chrome;end`;
        window.location.href = chromeIntent;
        return { success: true, action: 'android_intent' };
      } catch {
        // fallback
      }
    }

    // If on iOS Safari: trigger native Web Share sheet so user can tap "Adicionar à Tela de Início"
    if (isIOS && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'appvendas - PDV e Estoque',
          text: 'Instale o appvendas na sua Tela de Início',
          url: window.location.href,
        });
        return { success: true, action: 'ios_share' };
      } catch {
        // user closed share sheet, fall through to modal
      }
    }

    return { success: false, action: 'modal' };
  };

  return {
    isInstallable: Boolean(deferredPrompt || globalPrompt || (typeof window !== 'undefined' && window.__PWA_INSTALL_PROMPT__)),
    isInstalled,
    isStandalone,
    isIOS,
    isAndroid,
    isIframe,
    isInAppBrowser,
    install,
    openDirectInstallInBrowser,
  };
}
