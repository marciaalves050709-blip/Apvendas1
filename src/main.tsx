import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
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
    <App />
  </StrictMode>,
);
