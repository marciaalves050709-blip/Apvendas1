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

export type IOSBrowserType = 'safari' | 'chrome' | 'edge' | 'firefox' | 'in_app' | 'other';

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
  const [iosBrowser, setIosBrowser] = useState<IOSBrowserType>('other');
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

    // 2. Detect standalone mode (isInstalled must ONLY be true when actually running as standalone installed app)
    const checkStandalone = () => {
      const standaloneQuery = window.matchMedia('(display-mode: standalone)').matches;
      const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const runningStandalone = standaloneQuery || iosStandalone;
      setIsStandalone(runningStandalone);
      setIsInstalled(runningStandalone);
    };

    checkStandalone();

    // 3. Detect device type & in-app browsers accurately (including iOS WebViews & third-party iOS browsers)
    if (typeof window !== 'undefined' && window.navigator) {
      const ua = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1);
      const isWebView = /fban|fbav|fb_iab|instagram|whatsapp|micromessenger|tiktok|bytedance|barcelona|threads|line\/|telegram|twitter|linkedinapp|snapchat|pinterest|gsa\/|; wv\b|\bwv\)/.test(ua);
      setIsIOS(isIOSDevice);
      setIsAndroid(/android/.test(ua));
      setIsInAppBrowser(isWebView);

      if (isIOSDevice) {
        if (isWebView) {
          setIosBrowser('in_app');
        } else if (/crios\//.test(ua)) {
          setIosBrowser('chrome');
        } else if (/edgios\//.test(ua)) {
          setIosBrowser('edge');
        } else if (/fxios\//.test(ua)) {
          setIosBrowser('firefox');
        } else if (/safari\//.test(ua) && !/crios|fxios|edgios|opios/.test(ua)) {
          setIosBrowser('safari');
        } else {
          setIosBrowser('other');
        }
      }
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
      setGlobalPrompt(null);
      checkStandalone();
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

  const buildAndroidChromeIntentUrl = (targetUrl?: string) => {
    const fullUrl = new URL(targetUrl || window.location.href, window.location.origin);
    fullUrl.searchParams.set('install', '1');
    const fallbackEncoded = encodeURIComponent(fullUrl.toString());
    return `intent://${fullUrl.host}${fullUrl.pathname}${fullUrl.search}#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${fallbackEncoded};end`;
  };

  const openAndroidChromeIntent = (targetUrl?: string) => {
    try {
      const intentUri = buildAndroidChromeIntentUrl(targetUrl);
      window.location.href = intentUri;
      return true;
    } catch {
      return false;
    }
  };

  const openDirectInstallInBrowser = (targetUrl?: string) => {
    try {
      const url = new URL(targetUrl || window.location.href, window.location.origin);
      url.searchParams.set('install', '1');
      if (isInAppBrowser && isAndroid) {
        return openAndroidChromeIntent(url.toString());
      }
      const win = window.open(url.toString(), '_blank', 'noopener,noreferrer');
      return Boolean(win);
    } catch {
      return false;
    }
  };

  /**
   * Fast, non-blocking install action:
   * - Immediately triggers native install prompt on Android/Desktop.
   * - On iPhone/iPad, opens the guided iOS Safari instructions.
   * - Uses Android Chrome Intent with S.browser_fallback_url to escape Instagram/WhatsApp webviews.
   */
  const install = async (targetUrl?: string): Promise<InstallResult> => {
    if (isStandalone && !targetUrl) {
      return { success: true, action: 'already_installed' };
    }

    // 1. If on iOS (iPhone/iPad): Open the guided iOS installation modal directly
    if (isIOS) {
      return { success: true, action: 'modal' };
    }

    // Try to get available prompt
    const promptToUse = deferredPrompt || globalPrompt || (typeof window !== 'undefined' ? window.__PWA_INSTALL_PROMPT__ : null);

    // 2. If native prompt is ready (Android/Chrome): FIRE IMMEDIATELY
    if (promptToUse) {
      try {
        await promptToUse.prompt();
        const choice = await promptToUse.userChoice;
        if (choice.outcome === 'accepted') {
          setGlobalPrompt(null);
          window.dispatchEvent(new CustomEvent('pwa-installed'));
          return { success: true, outcome: 'accepted', action: 'prompt' };
        }
        return { success: false, outcome: 'dismissed', action: 'prompt' };
      } catch (err) {
        console.warn('[PWA] Prompt call error:', err);
      }
    }

    // 3. If inside an in-app browser on Android (e.g. Instagram, WhatsApp, Telegram)
    if (isInAppBrowser && isAndroid) {
      if (openAndroidChromeIntent(targetUrl)) {
        return { success: true, action: 'android_intent' };
      }
    }

    // 4. Fallback: return modal action immediately without blocking or waiting
    return { success: false, action: 'modal' };
  };

  return {
    isInstallable: Boolean(deferredPrompt || globalPrompt || (typeof window !== 'undefined' && window.__PWA_INSTALL_PROMPT__)),
    isInstalled,
    isStandalone,
    isIOS,
    iosBrowser,
    isAndroid,
    isIframe,
    isInAppBrowser,
    install,
    openDirectInstallInBrowser,
    openAndroidChromeIntent,
  };
}
