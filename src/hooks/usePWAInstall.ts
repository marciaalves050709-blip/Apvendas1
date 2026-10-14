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

export function setGlobalPrompt(prompt: BeforeInstallPromptEvent | null) {
  globalPrompt = prompt;
  if (typeof window !== 'undefined') {
    window.__PWA_INSTALL_PROMPT__ = prompt;
  }
  promptSubscribers.forEach((cb) => cb(prompt));
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

  /**
   * Fast, non-blocking install action:
   * - Immediately triggers native install prompt if available without freezing the UI thread.
   * - Uses Android Chrome Intent to escape restrictive webviews (WhatsApp/Instagram) and install cleanly.
   * - Never leaves the UI in an infinite loading/spinning state.
   */
  const install = async (): Promise<InstallResult> => {
    if (isStandalone) {
      return { success: true, action: 'already_installed' };
    }

    // Try to get available prompt
    const promptToUse = deferredPrompt || globalPrompt || (typeof window !== 'undefined' ? window.__PWA_INSTALL_PROMPT__ : null);

    // 1. If native prompt is ready: FIRE IMMEDIATELY without blocking
    if (promptToUse) {
      try {
        promptToUse.prompt();

        // Listen for choice in background so UI returns instantly
        promptToUse.userChoice
          .then((choice) => {
            if (choice.outcome === 'accepted') {
              setIsInstalled(true);
              setIsStandalone(true);
              setGlobalPrompt(null);
              try {
                localStorage.setItem('appvendas_pwa_installed', 'true');
              } catch {
                // ignore
              }
              window.dispatchEvent(new CustomEvent('pwa-installed'));
            }
          })
          .catch((err) => {
            console.warn('[PWA] userChoice catch:', err);
          });

        return { success: true, action: 'prompt' };
      } catch (err) {
        console.warn('[PWA] Prompt call error:', err);
      }
    }

    // 2. If inside an in-app browser on Android (e.g. WhatsApp, Instagram, Telegram)
    if (isInAppBrowser && isAndroid) {
      try {
        const fullUrl = new URL(window.location.href);
        fullUrl.searchParams.set('install', '1');
        const chromeIntent = `intent://${fullUrl.host}${fullUrl.pathname}${fullUrl.search}#Intent;scheme=https;package=com.android.chrome;end`;
        window.location.href = chromeIntent;
        return { success: true, action: 'android_intent' };
      } catch {
        // fallback to modal
      }
    }

    // 3. Fallback: return modal action immediately without blocking or waiting
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
