import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

const app = express();
app.use(express.json({ limit: '15mb' }));

const DB_PATH = path.join(process.cwd(), 'stores_db.json');

// Strict No-Cache & CORS middleware for Service Worker, Web Manifest, HTML entry points, and API calls
// Prevents Android Chrome and installed PWAs from serving stale service workers or cached stores
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (p.startsWith('/api/')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  }
  if (
    p === '/sw.js' ||
    p === '/manifest.webmanifest' ||
    p === '/manifest.json' ||
    p === '/' ||
    p.startsWith('/api/') ||
    p.endsWith('.html')
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

// Real-Time Live Push Synchronization Clients (Server-Sent Events)
const liveSyncClients = new Set<express.Response>();

// Heartbeat ping every 15 seconds to keep mobile 4G/WiFi connections active
setInterval(() => {
  for (const client of liveSyncClients) {
    try {
      client.write(': ping\n\n');
    } catch {
      liveSyncClients.delete(client);
    }
  }
}, 15000);

// API: Live Sync SSE Stream (Instant real-time push to all installed apps & browsers)
app.get('/api/live-sync', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform, no-store');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  liveSyncClients.add(res);

  // Send initial connection packet with current server version for installed PWA auto-update detection
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', version: '62', timestamp: Date.now(), clientsCount: liveSyncClients.size })}\n\n`);

  req.on('close', () => {
    liveSyncClients.delete(res);
  });
});

const readDb = (): Record<string, any> => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('[StoreDB] Error reading:', e);
  }
  return {};
};

const writeDb = (data: Record<string, any>) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[StoreDB] Error writing:', e);
  }
};

const normalizeSlug = (str: string): string => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim();
};

const cleanSlugAlphanumeric = (str: string): string => {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

// API: Save/Sync Store Catalog and Details (Always persists latest live catalog and pushes live to all connected PWAs)
app.post('/api/stores/:slug', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const rawSlug = req.params.slug;
    const slug = normalizeSlug(rawSlug) || 'loja';
    const cleanSlug = cleanSlugAlphanumeric(rawSlug) || 'loja';

    const { company, paymentSettings, products, activeSeller, forceClear } = req.body;
    const db = readDb();

    const productList = Array.isArray(products) ? products : [];
    const existingStore = db[slug] || db[cleanSlug] || (company?.id && db[company.id]);
    
    // Safety: If incoming products is empty, preserve existing store products unless forceClear is explicitly passed
    const finalProducts = productList.length > 0 
      ? productList 
      : (forceClear ? [] : (existingStore && Array.isArray(existingStore.products) ? existingStore.products : []));

    const storeData = {
      slug,
      cleanSlug,
      company: company || (existingStore?.company || { name: rawSlug }),
      paymentSettings: paymentSettings || (existingStore?.paymentSettings || {}),
      products: finalProducts,
      activeSeller: activeSeller || (existingStore?.activeSeller || null),
      updatedAt: new Date().toISOString()
    };

    // Store under primary slug (e.g. "minha-empresa")
    db[slug] = storeData;

    // Also store under clean alphanumeric (e.g. "minhaempresa")
    if (cleanSlug && cleanSlug !== slug) {
      db[cleanSlug] = storeData;
    }

    // Also store under company ID if provided (e.g. "empresa_principal")
    if (company && company.id) {
      db[company.id] = storeData;
    }

    // Smart latest store pointer: Only set as _latest if it contains products or if _latest has 0 products or matches this slug
    const currentLatest = db['_latest'];
    const currentLatestHasProducts = currentLatest && Array.isArray(currentLatest.products) && currentLatest.products.length > 0;
    if (finalProducts.length > 0 || !currentLatestHasProducts || currentLatest?.slug === slug) {
      db['_latest'] = storeData;
    }

    writeDb(db);
    console.log(`[StoreDB] Store "${slug}" synced with ${storeData.products.length} products. Broadcasting to ${liveSyncClients.size} live clients.`);

    // Instant Real-Time Push to all connected installed PWAs & buyers
    const broadcastPayload = JSON.stringify({
      type: 'STORE_UPDATED',
      slug,
      cleanSlug,
      companyId: company?.id,
      companyName: company?.name || rawSlug,
      storeData,
      timestamp: Date.now()
    });

    for (const client of liveSyncClients) {
      try {
        client.write(`data: ${broadcastPayload}\n\n`);
      } catch {
        liveSyncClients.delete(client);
      }
    }

    res.json({ 
      success: true, 
      slug, 
      cleanSlug, 
      productCount: storeData.products.length,
      clientsNotified: liveSyncClients.size,
      updatedAt: storeData.updatedAt
    });
  } catch (err: any) {
    console.error('[StoreDB] Error saving store:', err);
    res.status(500).json({ error: err.message || 'Failed to save store' });
  }
});

// API: Retrieve Store by Slug or Latest (Guarantees installed apps & links get live products)
app.get('/api/stores/:slug', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const rawSlug = req.params.slug;
    const slug = normalizeSlug(rawSlug);
    const cleanSlug = cleanSlugAlphanumeric(rawSlug);
    const db = readDb();

    // 1. Direct key match
    if (db[slug]) return res.json(db[slug]);
    if (db[cleanSlug]) return res.json(db[cleanSlug]);
    if (db[rawSlug]) return res.json(db[rawSlug]);

    // 2. Special keywords: 'latest', 'default', 'current', '_latest', 'loja', 'store'
    const isLatestKeyword = ['latest', 'default', 'current', '_latest', 'loja', 'store', 'principal', 'empresa_principal'].includes(rawSlug.toLowerCase());
    if (isLatestKeyword) {
      if (db['_latest']) return res.json(db['_latest']);
      const all = Object.values(db).filter((s: any) => s && s.slug && s.slug !== '_latest');
      if (all.length > 0) {
        all.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        return res.json(all[0]);
      }
    }

    // 3. Flexible search across all stores
    const found = Object.values(db).find((s: any) => {
      if (!s) return false;
      if (s.slug === slug) return true;
      if (cleanSlug && (s.cleanSlug === cleanSlug || cleanSlugAlphanumeric(s.slug) === cleanSlug)) return true;
      if (s.company?.id && (s.company.id === rawSlug || s.company.id === slug)) return true;
      if (s.company?.name) {
        const compNorm = normalizeSlug(s.company.name);
        if (compNorm === slug) return true;
        if (cleanSlug && cleanSlugAlphanumeric(s.company.name) === cleanSlug) return true;
      }
      return false;
    });

    if (found) {
      return res.json(found);
    }

    // 4. Fallback only if generic keyword was requested or if exactly one store exists
    const allStores = Object.values(db).filter((s: any) => s && s.slug && s.slug !== '_latest');
    if (isLatestKeyword && allStores.length > 0) {
      allStores.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      return res.json(allStores[0]);
    }

    // Return empty store placeholder for the requested company slug rather than contaminating with another company's products
    res.json({
      slug: slug || rawSlug,
      company: { id: rawSlug, name: rawSlug.replace(/[-_]/g, ' ') },
      products: [],
      paymentSettings: {},
      activeSeller: null,
      isPlaceholder: true,
      updatedAt: null
    });
  } catch (err: any) {
    console.error('[StoreDB] Error getting store:', err);
    res.status(500).json({ error: err.message || 'Failed to load store' });
  }
});

// API: Get latest / active store directly
app.get('/api/store/latest', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  const db = readDb();
  
  // 1. If _latest has products, return it
  if (db['_latest'] && Array.isArray(db['_latest'].products) && db['_latest'].products.length > 0) {
    return res.json(db['_latest']);
  }

  // 2. Otherwise search for any store that has products, sorted by latest update
  const all = Object.values(db).filter((s: any) => s && s.slug && s.slug !== '_latest');
  const withProducts = all.filter((s: any) => Array.isArray(s.products) && s.products.length > 0);
  if (withProducts.length > 0) {
    withProducts.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return res.json(withProducts[0]);
  }

  // 3. Fallback to latest registered store
  if (all.length > 0) {
    all.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return res.json(all[0]);
  }

  res.status(404).json({ error: 'Nenhuma loja cadastrada ainda' });
});

// API: List all synced stores (for debugging / health check)
app.get('/api/stores', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const db = readDb();
    const list = Object.keys(db)
      .filter(k => k !== '_latest')
      .map(slug => ({
        slug,
        name: db[slug].company?.name || slug,
        productsCount: Array.isArray(db[slug].products) ? db[slug].products.length : 0,
        updatedAt: db[slug].updatedAt
      }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// In-memory cache of generated short URLs keyed by exact destination URL
const shortUrlCache = new Map<string, string>();

// API: Fast, reliable server-side URL shortener (ALWAYS includes company name in slug, never returns nameless links)
app.post('/api/shorten', async (req, res) => {
  try {
    const { url, storeName } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Check cache first (exact URL match guarantees same products & company)
    const cached = shortUrlCache.get(url);
    if (cached) {
      return res.json({ shortUrl: cached });
    }

    // Extract store name from body or fallback to ?loja= / ?nome= query param or /loja/:slug pathname
    let resolvedStoreName = (storeName || '').trim();
    if (!resolvedStoreName || resolvedStoreName.toLowerCase() === 'loja') {
      try {
        const parsedUrl = new URL(url);
        resolvedStoreName = (parsedUrl.searchParams.get('nome') || parsedUrl.searchParams.get('loja') || resolvedStoreName).trim();
        if (!resolvedStoreName || resolvedStoreName.toLowerCase() === 'loja') {
          const parts = parsedUrl.pathname.split('/').filter(Boolean);
          if ((parts[0] === 'loja' || parts[0] === 'l') && parts[1]) {
            resolvedStoreName = decodeURIComponent(parts[1]);
          }
        }
      } catch {}
    }

    const cleanSlug = resolvedStoreName
      ? String(resolvedStoreName)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 18)
      : 'loja';

    const urlSlug = resolvedStoreName
      ? String(resolvedStoreName)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 32)
      : 'loja';

    // Deterministic 4-char hash of full URL (changes whenever products/company/settings change)
    let h = 0;
    for (let i = 0; i < url.length; i++) {
      h = ((h << 5) - h + url.charCodeAt(i)) | 0;
    }
    const urlHash = Math.abs(h).toString(36).slice(0, 4).padStart(4, '0');

    // 1. Try is.gd with custom slug containing company name + catalog hash: loja_${cleanSlug}_${urlHash}
    if (cleanSlug) {
      const candidateParams = [
        `loja_${cleanSlug.slice(0, 18)}_${urlHash}`,
        `loja_${cleanSlug.slice(0, 14)}_${urlHash}${Math.floor(Math.random() * 90 + 10)}`
      ];

      for (const customParam of candidateParams) {
        try {
          const resp = await fetch(`https://is.gd/create.php?format=simple&shorturl=${encodeURIComponent(customParam)}&url=${encodeURIComponent(url)}`, {
            signal: AbortSignal.timeout(4000)
          });
          if (resp.ok) {
            const text = (await resp.text()).trim();
            if (
              (text.startsWith('http://') || text.startsWith('https://')) &&
              !text.includes('Error') &&
              (text.includes(cleanSlug.slice(0, 6)) || text.includes('loja_'))
            ) {
              shortUrlCache.set(url, text);
              return res.json({ shortUrl: text });
            }
          }
        } catch {}
      }
    }

    // Fallback: ALWAYS return direct official short link with company name (NEVER nameless random link)
    const host = req.get('host') || 'www.apvendas1.com.br';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const baseOrigin = url.startsWith('http') ? (() => { try { return new URL(url).origin; } catch { return `${proto}://${host}`; } })() : `${proto}://${host}`;
    const directShort = `${baseOrigin}/loja/${encodeURIComponent(urlSlug || cleanSlug || 'loja')}`;
    return res.json({ shortUrl: directShort });
  } catch (err: any) {
    console.error('[ShortenAPI] Error:', err);
    res.status(500).json({ error: err.message || 'Shorten failed' });
  }
});

// API: System Version Check (Guarantees installed apps detect updates on startup)
app.get('/api/version', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({
    version: '62',
    versionName: 'v62.0',
    buildDate: new Date().toISOString(),
    features: [
      'Link encurtado garantido SEMPRE com o nome da empresa (nunca gera link aleatório sem nome)',
      'Links de compartilhamento agora carregam todos os produtos atualizados da empresa para novos usuários',
      'Sincronização automática por empresa em tempo real (Live Push SSE) e entre ambientes',
      'Proteção contra perda de produtos e isolamento completo entre múltiplas empresas',
      'Cadeado fechado automaticamente ao voltar para a Loja do Cliente'
    ]
  });
});

// Direct Short URL Redirects:
// e.g. /loja/maquiagemtop -> /?loja=maquiagemtop&tab=client-store
// e.g. /l/maquiagemtop -> /?loja=maquiagemtop&tab=client-store
app.get('/loja/:slug', (req, res) => {
  const slug = encodeURIComponent(req.params.slug);
  res.redirect(`/?loja=${slug}&tab=client-store`);
});

app.get('/l/:slug', (req, res) => {
  const slug = encodeURIComponent(req.params.slug);
  res.redirect(`/?loja=${slug}&tab=client-store`);
});

// Vite Middleware (Dev) or Static Assets (Prod)
if (!isProduction) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Full-Stack App] Running on http://0.0.0.0:${PORT}`);
});
