import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Middleware to automatically recover existing installed PWAs that request stale bundle chunks
const staleChunkRecoveryPlugin = () => ({
  name: 'stale-chunk-recovery',
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      // If an existing installed app requests a stale /assets/*.js from an older build
      if (req.url && req.url.startsWith('/assets/') && req.url.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
        res.end(`
          console.warn('[PWA Auto-Recovery] Stale build chunk requested. Clearing caches and reloading with fresh code...');
          if ('caches' in window) {
            caches.keys().then(function(keys) {
              return Promise.all(keys.map(function(k) { return caches.delete(k); }));
            }).catch(function() {});
          }
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
              return Promise.all(regs.map(function(r) { return r.unregister(); }));
            }).catch(function() {});
          }
          try { sessionStorage.clear(); } catch(e) {}
          window.location.href = '/?atualizado=' + Date.now();
        `);
        return;
      }
      next();
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      staleChunkRecoveryPlugin(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
