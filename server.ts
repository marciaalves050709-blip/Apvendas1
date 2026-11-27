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
    p.startsWith('/loja/') ||
    p.startsWith('/l/') ||
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
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', version: '75', timestamp: Date.now(), clientsCount: liveSyncClients.size })}\n\n`);

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

const normalizePhoneVariants = (phone?: string): string[] => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 8) return [];
  const variants = new Set<string>();
  variants.add(digits);
  if (digits.startsWith('55') && digits.length >= 12) {
    variants.add(digits.slice(2));
  } else if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    variants.add('55' + digits);
  }
  return Array.from(variants);
};

const collectStorePhones = (storeData: any): string[] => {
  const raw = new Set<string>();
  if (!storeData) return [];
  if (storeData.company?.phone) raw.add(String(storeData.company.phone));
  if (storeData.paymentSettings?.merchantWhatsapp) raw.add(String(storeData.paymentSettings.merchantWhatsapp));
  if (storeData.activeSeller?.whatsapp) raw.add(String(storeData.activeSeller.whatsapp));
  if (Array.isArray(storeData.paymentSettings?.sellers)) {
    for (const s of storeData.paymentSettings.sellers) {
      if (s?.whatsapp) raw.add(String(s.whatsapp));
    }
  }
  if (Array.isArray(storeData.registeredPhones)) {
    for (const p of storeData.registeredPhones) {
      if (p) raw.add(String(p));
    }
  }
  const canonical = new Set<string>();
  for (const r of raw) {
    const d = r.replace(/\D/g, '');
    if (d.length >= 8) {
      canonical.add(d.startsWith('55') && d.length >= 12 ? d.slice(2) : d);
    }
  }
  return Array.from(canonical);
};

const findStoreByPhone = (db: Record<string, any>, phoneInput: string): any | null => {
  const variants = normalizePhoneVariants(phoneInput);
  if (variants.length === 0) return null;

  const phoneIndex = db['_phoneIndex'] || {};
  for (const v of variants) {
    const indexedSlug = phoneIndex[v];
    if (indexedSlug && db[indexedSlug] && !String(indexedSlug).startsWith('_')) {
      return db[indexedSlug];
    }
  }

  // Fallback scan across all stored companies
  const candidates: any[] = [];
  for (const [k, s] of Object.entries(db)) {
    if (k.startsWith('_') || !s || typeof s !== 'object' || !s.slug) continue;
    const storePhones = collectStorePhones(s);
    const hasMatch = storePhones.some(sp => {
      const spVars = normalizePhoneVariants(sp);
      return spVars.some(sv => variants.includes(sv));
    });
    if (hasMatch) {
      candidates.push(s);
    }
  }
  if (candidates.length > 0) {
    candidates.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return candidates[0];
  }
  return null;
};

const sanitizePublicStore = (store: any) => {
  if (!store || typeof store !== 'object') return store;
  const { accessPassword, ...rest } = store;
  return {
    ...rest,
    hasPassword: Boolean(accessPassword && String(accessPassword).trim().length >= 4)
  };
};

// API: Verify company restricted-area password (NEVER exposes stored password to clients)
app.post('/api/stores/:slug/verify-password', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  try {
    const rawSlug = decodeURIComponent(String(req.params.slug || '')).trim();
    const password = String(req.body?.password || '').trim();
    const upper = password.replace(/[\s\-\(\)\.]+/g, '').toUpperCase();
    const isMaster =
      ['MARCIA2026', 'ADMINMARCIA', 'MESTRA58', 'MASTER2026', 'MARCIA0507', '0507', '050709', 'MARCIA050709', 'MARCIAALVES050709', 'MARCIA58', 'MARCIAALVES2026', 'MASTERADMIN', 'MASTERADMINMARCIA'].includes(upper) ||
      upper.includes('MARCIA2026') ||
      upper.includes('050709') ||
      upper.includes('MARCIA0507');

    const db = readDb();
    const slug = normalizeSlug(rawSlug);
    const cleanSlug = cleanSlugAlphanumeric(rawSlug);
    let store = (!rawSlug.startsWith('_') && (db[slug] || db[cleanSlug] || db[rawSlug])) || null;
    if (!store) {
      store = Object.entries(db)
        .filter(([k]) => !k.startsWith('_'))
        .map(([, s]) => s)
        .find((s: any) =>
          s && typeof s === 'object' && (
            s.slug === slug ||
            s.cleanSlug === cleanSlug ||
            s.company?.id === rawSlug ||
            normalizeSlug(s.company?.name) === slug
          )
        ) || null;
    }
    const storedPass = store?.accessPassword ? String(store.accessPassword).trim() : '';

    const valid = isMaster || (storedPass ? password === storedPass : password === '1234');
    res.json({ valid, hasPassword: Boolean(storedPass) });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

// API: Save/Sync Store Catalog and Details (Always persists latest live catalog and pushes live to all connected PWAs)
app.post('/api/stores/:slug', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const rawSlug = req.params.slug;
    let slug = normalizeSlug(rawSlug) || 'loja';
    let cleanSlug = cleanSlugAlphanumeric(rawSlug) || 'loja';

    const {
      company,
      paymentSettings,
      products,
      activeSeller,
      forceClear,
      registeredPhones,
      setAsActive,
      isRename,
      isNewRegistration,
      companyPassword
    } = req.body;
    const db = readDb();

    // Prevent slug collision between two different companies when registering a brand-new company
    if (isNewRegistration && company?.id) {
      const candidateExisting = db[slug] || db[cleanSlug];
      if (
        candidateExisting &&
        candidateExisting.company?.id &&
        candidateExisting.company.id !== company.id &&
        ((Array.isArray(candidateExisting.products) && candidateExisting.products.length > 0) ||
          (Array.isArray(candidateExisting.registeredPhones) && candidateExisting.registeredPhones.length > 0))
      ) {
        const suffix = String(company.id).replace(/[^a-z0-9]/gi, '').slice(-4) || Math.random().toString(36).slice(2, 6);
        slug = `${slug}-${suffix}`;
        cleanSlug = `${cleanSlug}${suffix}`;
      }
    }

    const productList = Array.isArray(products) ? products : [];
    const byCompId = company?.id && db[company.id] ? db[company.id] : null;
    const existingStore =
      db[slug] ||
      db[cleanSlug] ||
      (byCompId && (byCompId.slug === slug || isRename || setAsActive === true) ? byCompId : null);
    
    // Safety: If incoming products is empty, preserve existing store products unless forceClear is explicitly passed
    const finalProducts = productList.length > 0 
      ? productList 
      : (forceClear ? [] : (existingStore && Array.isArray(existingStore.products) ? existingStore.products : []));

    const cleanIncomingPassword = typeof companyPassword === 'string' && companyPassword.trim().length >= 4
      ? companyPassword.trim()
      : (existingStore?.accessPassword || '');

    const storeDraft = {
      slug,
      cleanSlug,
      company: company ? { ...company, slug } : (existingStore?.company || { name: rawSlug, slug }),
      paymentSettings: paymentSettings || (existingStore?.paymentSettings || {}),
      products: finalProducts,
      activeSeller: activeSeller || (existingStore?.activeSeller || null),
      registeredPhones: Array.isArray(registeredPhones) ? registeredPhones : (existingStore?.registeredPhones || []),
    };
    const mergedPhones = collectStorePhones(storeDraft);
    const storeData = {
      ...storeDraft,
      registeredPhones: mergedPhones,
      ...(cleanIncomingPassword ? { accessPassword: cleanIncomingPassword } : {}),
      ...(setAsActive === true ? { isExplicitActive: true } : {}),
      updatedAt: new Date().toISOString()
    };

    const prevPayloadHash = existingStore ? JSON.stringify({
      company: existingStore.company,
      paymentSettings: existingStore.paymentSettings,
      products: existingStore.products,
      activeSeller: existingStore.activeSeller,
      registeredPhones: existingStore.registeredPhones || [],
      accessPassword: existingStore.accessPassword || ''
    }) : '';

    const nextPayloadHash = JSON.stringify({
      company: storeData.company,
      paymentSettings: storeData.paymentSettings,
      products: storeData.products,
      activeSeller: storeData.activeSeller,
      registeredPhones: storeData.registeredPhones,
      accessPassword: storeData.accessPassword || ''
    });

    // Always ensure _phoneIndex links every registered mobile phone to this store slug
    if (!db['_phoneIndex'] || typeof db['_phoneIndex'] !== 'object') {
      db['_phoneIndex'] = {};
    }
    let phoneIndexChanged = false;
    for (const phoneNum of mergedPhones) {
      for (const variant of normalizePhoneVariants(phoneNum)) {
        if (db['_phoneIndex'][variant] !== slug) {
          db['_phoneIndex'][variant] = slug;
          phoneIndexChanged = true;
        }
      }
    }

    const hasExistingLatestProducts = Boolean(db['_latest'] && Array.isArray(db['_latest'].products) && db['_latest'].products.length > 0);
    const shouldUpdateLatest =
      (isNewRegistration && finalProducts.length === 0 && hasExistingLatestProducts)
        ? false
        : (
            setAsActive === true ||
            (setAsActive !== false && (
              finalProducts.length > 0 ||
              !hasExistingLatestProducts ||
              db['_latest']?.slug === slug
            ))
          );
    const latestAlreadyMatches =
      !shouldUpdateLatest ||
      (db['_latest']?.slug === slug && prevPayloadHash === nextPayloadHash);

    if (prevPayloadHash && prevPayloadHash === nextPayloadHash && latestAlreadyMatches) {
      if (phoneIndexChanged) {
        writeDb(db);
      }
      return res.json({
        success: true,
        unchanged: true,
        slug,
        cleanSlug,
        registeredPhones: storeData.registeredPhones,
        productCount: storeData.products.length,
        clientsNotified: 0,
        updatedAt: existingStore.updatedAt || storeData.updatedAt
      });
    }

    // Store under primary slug (e.g. "minha-empresa")
    db[slug] = storeData;

    // Also store under clean alphanumeric (e.g. "minhaempresa")
    if (cleanSlug && cleanSlug !== slug) {
      db[cleanSlug] = storeData;
    }

    // Store under company ID only if unclaimed, same slug, or explicitly promoted as active/renamed
    if (company && company.id) {
      if (!db[company.id] || db[company.id].slug === slug || setAsActive === true || isRename) {
        db[company.id] = storeData;
      }
    }

    // Smart latest store pointer: tracks the canonical active store across AI Studio & Installed PWAs
    if (shouldUpdateLatest) {
      db['_latest'] = storeData;
    }

    writeDb(db);
    console.log(`[StoreDB] Store "${slug}" synced with ${storeData.products.length} products and ${mergedPhones.length} phone(s). Broadcasting to ${liveSyncClients.size} live clients.`);

    const publicStoreData = sanitizePublicStore(storeData);

    // Instant Real-Time Push to all connected installed PWAs & buyers (NEVER broadcasts password)
    const broadcastPayload = JSON.stringify({
      type: 'STORE_UPDATED',
      slug,
      cleanSlug,
      companyId: company?.id,
      companyName: company?.name || rawSlug,
      setAsActive: setAsActive === true,
      storeData: publicStoreData,
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

    // 1. Direct key match (ignore private keys starting with _)
    if (!rawSlug.startsWith('_')) {
      if (db[slug]) return res.json(sanitizePublicStore(db[slug]));
      if (db[cleanSlug]) return res.json(sanitizePublicStore(db[cleanSlug]));
      if (db[rawSlug]) return res.json(sanitizePublicStore(db[rawSlug]));
    }

    // 2. Special keywords: 'latest', 'default', 'current', '_latest', 'loja', 'store'
    const isLatestKeyword = ['latest', 'default', 'current', '_latest', 'loja', 'store', 'principal', 'empresa_principal'].includes(rawSlug.toLowerCase());
    if (isLatestKeyword) {
      if (db['_latest']) return res.json(sanitizePublicStore(db['_latest']));
      const all = Object.entries(db).filter(([k, s]: [string, any]) => !k.startsWith('_') && s && s.slug).map(([, s]) => s);
      if (all.length > 0) {
        all.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        return res.json(sanitizePublicStore(all[0]));
      }
    }

    // 3. Flexible search across all stores
    const found = Object.entries(db)
      .filter(([k]) => !k.startsWith('_'))
      .map(([, s]) => s)
      .find((s: any) => {
        if (!s || typeof s !== 'object') return false;
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
      return res.json(sanitizePublicStore(found));
    }

    // 3b. Short-link lookup fallback (/l/:code -> maquiagemtop_1t22 -> maquiagemtop)
    const shortLinks = db['_shortLinks'] || {};
    const shortRec = shortLinks[rawSlug] || shortLinks[slug];
    if (shortRec) {
      const targetSlug = normalizeSlug(shortRec.slug || shortRec.storeName || '');
      const liveStore = (targetSlug && db[targetSlug]) || (shortRec.companyId && db[shortRec.companyId]) || (shortRec.zap && findStoreByPhone(db, shortRec.zap));
      const baseStore = liveStore || {
        slug: targetSlug || rawSlug,
        cleanSlug: cleanSlugAlphanumeric(targetSlug || rawSlug),
        company: shortRec.company || { id: shortRec.companyId || `empresa_${targetSlug}`, name: shortRec.storeName || targetSlug },
        paymentSettings: shortRec.paymentSettings || {},
        products: Array.isArray(shortRec.products) ? shortRec.products : [],
        activeSeller: shortRec.activeSeller || null,
        registeredPhones: collectStorePhones(shortRec),
        updatedAt: shortRec.updatedAt || new Date().toISOString()
      };
      const mergedProducts = Array.isArray(liveStore?.products) && liveStore.products.length > 0
        ? liveStore.products
        : (Array.isArray(shortRec.products) ? shortRec.products : baseStore.products || []);
      const boundZap = String(shortRec.zap || '').replace(/\D/g, '');
      const patchedSettings = {
        ...(baseStore.paymentSettings || {}),
        ...(boundZap ? { merchantWhatsapp: boundZap } : {}),
        ...(shortRec.pix ? { pixKey: shortRec.pix } : {}),
        ...(shortRec.banco ? { receivingBank: shortRec.banco } : {})
      };
      if (Array.isArray(patchedSettings.sellers) && boundZap) {
        patchedSettings.sellers = patchedSettings.sellers.map((s: any, idx: number) =>
          idx === 0 || s.id === patchedSettings.activeSellerId ? { ...s, whatsapp: boundZap } : s
        );
      }
      return res.json(sanitizePublicStore({
        ...baseStore,
        products: mergedProducts,
        paymentSettings: patchedSettings,
        company: {
          ...(baseStore.company || {}),
          ...(boundZap ? { phone: boundZap } : {})
        }
      }));
    }

    // Strip hash suffix (_xxxx or -xxxx) if code was generated on another mirror
    const baseWithoutHash = rawSlug.replace(/[_-][a-z0-9]{3,8}$/i, '');
    if (baseWithoutHash && baseWithoutHash !== rawSlug) {
      const strippedSlug = normalizeSlug(baseWithoutHash);
      const strippedClean = cleanSlugAlphanumeric(baseWithoutHash);
      if (db[strippedSlug]) return res.json(sanitizePublicStore(db[strippedSlug]));
      if (db[strippedClean]) return res.json(sanitizePublicStore(db[strippedClean]));
    }

    // 3c. Phone-number lookup fallback if rawSlug is a phone number
    const byPhone = findStoreByPhone(db, rawSlug);
    if (byPhone) {
      return res.json(sanitizePublicStore(byPhone));
    }

    // 4. Fallback only if generic keyword was requested
    const allStores = Object.entries(db).filter(([k, s]: [string, any]) => !k.startsWith('_') && s && s.slug).map(([, s]) => s);
    if (isLatestKeyword && allStores.length > 0) {
      allStores.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      return res.json(sanitizePublicStore(allStores[0]));
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
  
  // 1. Return _latest if explicitly marked active/renamed OR if it already holds products
  if (
    db['_latest'] &&
    db['_latest'].company?.name &&
    (db['_latest'].isExplicitActive || (Array.isArray(db['_latest'].products) && db['_latest'].products.length > 0))
  ) {
    return res.json(sanitizePublicStore(db['_latest']));
  }

  // 2. Otherwise search for any store that has products, sorted by latest update
  const all = Object.values(db).filter((s: any) => s && s.slug && s.slug !== '_latest');
  const withProducts = all.filter((s: any) => Array.isArray(s.products) && s.products.length > 0);
  if (withProducts.length > 0) {
    withProducts.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return res.json(sanitizePublicStore(withProducts[0]));
  }

  // 3. Fallback to latest registered store
  if (all.length > 0) {
    all.sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return res.json(sanitizePublicStore(all[0]));
  }

  res.status(404).json({ error: 'Nenhuma loja cadastrada ainda' });
});

// API: Lookup store and its updated products directly by registered mobile phone number
app.get('/api/stores/by-phone/:phone', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const db = readDb();
    const found = findStoreByPhone(db, req.params.phone);
    if (found) {
      return res.json(sanitizePublicStore({
        ...found,
        found: true,
        registeredPhones: collectStorePhones(found)
      }));
    }
    return res.json({
      found: false,
      isPlaceholder: true,
      products: []
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Deduplicated catalog of all companies + registered phone numbers + products (for Admin Test Area)
app.get('/api/admin/stores-catalog', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const db = readDb();
    const byKey = new Map<string, any>();
    for (const [k, s] of Object.entries(db)) {
      if (k.startsWith('_') || !s || typeof s !== 'object' || !s.slug) continue;
      const dedupeKey = s.company?.id || s.slug || k;
      const existing = byKey.get(dedupeKey);
      const sTime = new Date(s.updatedAt || 0).getTime();
      const eTime = existing ? new Date(existing.updatedAt || 0).getTime() : -1;
      if (!existing || sTime >= eTime) {
        byKey.set(dedupeKey, {
          slug: s.slug,
          company: s.company || { id: dedupeKey, name: s.slug },
          registeredPhones: collectStorePhones(s),
          paymentSettings: s.paymentSettings || {},
          activeSeller: s.activeSeller || null,
          products: Array.isArray(s.products) ? s.products : [],
          productsCount: Array.isArray(s.products) ? s.products.length : 0,
          updatedAt: s.updatedAt || null
        });
      }
    }
    const stores = Array.from(byKey.values()).sort(
      (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );
    res.json({ stores });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: List all synced stores (for debugging / health check)
app.get('/api/stores', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const db = readDb();
    const list = Object.keys(db)
      .filter(k => !k.startsWith('_'))
      .map(slug => ({
        slug,
        name: db[slug].company?.name || slug,
        phones: collectStorePhones(db[slug]),
        productsCount: Array.isArray(db[slug].products) ? db[slug].products.length : 0,
        updatedAt: db[slug].updatedAt
      }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// In-memory cache of generated short URLs keyed by company slug + phone + catalog signature
const shortUrlCache = new Map<string, string>();

const computeShortHash = (input: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0).toString(36) + '0000').slice(0, 4);
};

const parseCompactProductsParam = (pParam: string): any[] => {
  if (!pParam) return [];
  try {
    return pParam
      .split('*')
      .filter(Boolean)
      .map((itemStr, idx) => {
        const parts = itemStr.split('_');
        const rawName = (parts[0] || '').replace(/\+/g, ' ');
        let name = `Produto ${idx + 1}`;
        try { name = decodeURIComponent(rawName) || name; } catch { name = rawName || name; }
        const salePrice = parseFloat(parts[1]) || 0;
        const currentStock = parseInt(parts[2], 10) || 50;
        const unit = parts[3] || 'UN';
        const rawCat = (parts[4] || 'Outros').replace(/\+/g, ' ');
        let category = 'Outros';
        try { category = decodeURIComponent(rawCat) || 'Outros'; } catch { category = rawCat || 'Outros'; }
        const wholesalePrice = parts[5] ? parseFloat(parts[5]) : undefined;
        const wholesaleMinQty = parts[6] ? parseInt(parts[6], 10) : undefined;
        return {
          id: `p_share_${idx + 1}`,
          name,
          sku: `PROD-${idx + 1}`,
          barcode: '',
          salePrice,
          costPrice: 0,
          currentStock,
          minStock: 2,
          maxStock: 1000,
          unit,
          category,
          itemsPerUnit: 1,
          description: '',
          ...(wholesalePrice ? { wholesalePrice } : {}),
          ...(wholesaleMinQty ? { wholesaleMinQty } : {}),
          updatedAt: new Date().toISOString()
        };
      });
  } catch {
    return [];
  }
};

// API: Resolve clean short-link code (/l/:code) directly into live store, phone, and updated products
app.get('/api/short/:code', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const rawCode = decodeURIComponent(String(req.params.code || '')).trim();
    const db = readDb();
    const shortLinks = db['_shortLinks'] || {};
    const rawNorm = normalizeSlug(rawCode);
    const shortRec =
      shortLinks[rawCode] ||
      shortLinks[rawCode.toLowerCase()] ||
      shortLinks[rawNorm] ||
      null;

    // Try exact code as store slug BEFORE stripping any trailing hash (protects store names like "loja_da_ana")
    const exactSlug = normalizeSlug(shortRec?.slug || shortRec?.storeName || '');
    const directStoreFromCode = !shortRec ? (db[rawNorm] || db[cleanSlugAlphanumeric(rawCode)] || null) : null;
    const fallbackBase = rawCode.replace(/[_-][a-z0-9]{3,8}$/i, '');
    const targetSlug = exactSlug || directStoreFromCode?.slug || normalizeSlug(fallbackBase || rawCode);
    const cleanTarget = cleanSlugAlphanumeric(targetSlug);

    const byCompId = shortRec?.companyId && db[shortRec.companyId] ? db[shortRec.companyId] : null;
    const liveStore =
      (targetSlug && db[targetSlug]) ||
      (cleanTarget && db[cleanTarget]) ||
      directStoreFromCode ||
      (byCompId && byCompId.slug === targetSlug ? byCompId : null) ||
      (shortRec?.zap && findStoreByPhone(db, shortRec.zap)) ||
      null;

    if (!shortRec && !liveStore) {
      return res.json({
        found: false,
        isPlaceholder: true,
        slug: targetSlug,
        company: { id: `empresa_${targetSlug}`, name: (fallbackBase || rawCode).replace(/[-_]/g, ' ') },
        products: [],
        paymentSettings: {}
      });
    }

    const baseStore = liveStore || {
      slug: targetSlug,
      cleanSlug: cleanTarget,
      company: shortRec?.company || { id: shortRec?.companyId || `empresa_${targetSlug}`, name: shortRec?.storeName || targetSlug },
      paymentSettings: shortRec?.paymentSettings || {},
      products: Array.isArray(shortRec?.products) ? shortRec.products : [],
      activeSeller: shortRec?.activeSeller || null,
      registeredPhones: collectStorePhones(shortRec),
      updatedAt: shortRec?.updatedAt || new Date().toISOString()
    };

    const mergedProducts =
      Array.isArray(liveStore?.products) && liveStore.products.length > 0
        ? liveStore.products
        : (Array.isArray(shortRec?.products) ? shortRec.products : baseStore.products || []);

    const boundZap = String(shortRec?.zap || '').replace(/\D/g, '');
    const patchedSettings = {
      ...(baseStore.paymentSettings || {}),
      ...(boundZap ? { merchantWhatsapp: boundZap } : {}),
      ...(shortRec?.pix ? { pixKey: shortRec.pix } : {}),
      ...(shortRec?.banco ? { receivingBank: shortRec.banco } : {})
    };
    if (Array.isArray(patchedSettings.sellers) && boundZap) {
      patchedSettings.sellers = patchedSettings.sellers.map((s: any, idx: number) =>
        idx === 0 || s.id === patchedSettings.activeSellerId ? { ...s, whatsapp: boundZap } : s
      );
    }

    return res.json(sanitizePublicStore({
      ...baseStore,
      found: true,
      shortCode: rawCode,
      products: mergedProducts,
      paymentSettings: patchedSettings,
      company: {
        ...(baseStore.company || {}),
        ...(boundZap ? { phone: boundZap } : {})
      }
    }));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to resolve short code' });
  }
});

// API: Clean URL shortener — ALWAYS returns a clean URL with ONLY the company name (NEVER exposes ?loja=&nome=&pix=&p= query codes)
app.post('/api/shorten', async (req, res) => {
  try {
    const { url, storeName, company, paymentSettings, activeSeller, products, zap } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    let parsedUrlObj: URL | null = null;
    try {
      parsedUrlObj = new URL(url);
    } catch {}

    let resolvedStoreName = (storeName || company?.name || '').trim();
    if ((!resolvedStoreName || resolvedStoreName.toLowerCase() === 'loja') && parsedUrlObj) {
      resolvedStoreName = (parsedUrlObj.searchParams.get('nome') || parsedUrlObj.searchParams.get('loja') || resolvedStoreName).trim();
      if (!resolvedStoreName || resolvedStoreName.toLowerCase() === 'loja') {
        const parts = parsedUrlObj.pathname.split('/').filter(Boolean);
        if ((parts[0] === 'loja' || parts[0] === 'l') && parts[1]) {
          resolvedStoreName = decodeURIComponent(parts[1]).replace(/[_-][a-z0-9]{3,8}$/i, '');
        }
      }
    }

    const cleanSlug = resolvedStoreName
      ? String(resolvedStoreName)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 24)
      : 'loja';

    const urlSlug = resolvedStoreName
      ? String(resolvedStoreName)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 48)
      : 'loja';

    const PUBLIC_DOMAIN_ORIGIN = 'https://www.apvendas1.com.br';
    const host = req.get('host') || 'www.apvendas1.com.br';
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    let baseOrigin = `${proto}://${host}`;
    if (parsedUrlObj) {
      baseOrigin = parsedUrlObj.origin;
    }
    if (baseOrigin.includes('ais-dev-') || baseOrigin.includes('ais-pre-')) {
      baseOrigin = PUBLIC_DOMAIN_ORIGIN;
    }

    const resolvedZap = String(
      zap ||
      parsedUrlObj?.searchParams.get('zap') ||
      activeSeller?.whatsapp ||
      paymentSettings?.merchantWhatsapp ||
      company?.phone ||
      ''
    ).replace(/\D/g, '');
    const resolvedCompanyId = String(parsedUrlObj?.searchParams.get('empresa') || company?.id || '').trim();
    const resolvedPix = String(parsedUrlObj?.searchParams.get('pix') || activeSeller?.pixKey || paymentSettings?.pixKey || '').trim();
    const resolvedBanco = String(parsedUrlObj?.searchParams.get('banco') || activeSeller?.receivingBank || paymentSettings?.receivingBank || '').trim();
    const compactProducts = parsedUrlObj?.searchParams.get('p')
      ? parseCompactProductsParam(parsedUrlObj.searchParams.get('p') || '')
      : [];
    const resolvedProducts = Array.isArray(products) && products.length > 0 ? products : compactProducts;

    const hashSeed = `${baseOrigin}|${urlSlug}|${resolvedZap}|${resolvedPix}|${resolvedProducts.map((p: any) => `${p.name}:${p.salePrice}:${p.currentStock}`).join(',')}`;
    const urlHash = computeShortHash(hashSeed || url);
    const shortCode = `${cleanSlug || 'loja'}_${urlHash}`;
    const cleanSelfShortUrl = `${baseOrigin}/l/${encodeURIComponent(shortCode)}`;

    // Persist short link record + store catalog cleanly in stores_db.json so BOTH /l/:code and /loja/:slug ALWAYS hydrate live data with zero query params
    const db = readDb();
    if (!db['_shortLinks'] || typeof db['_shortLinks'] !== 'object') {
      db['_shortLinks'] = {};
    }
    const byCompId = resolvedCompanyId && db[resolvedCompanyId] ? db[resolvedCompanyId] : null;
    const existingStore =
      (urlSlug && db[urlSlug]) ||
      (cleanSlug && db[cleanSlugAlphanumeric(urlSlug)]) ||
      (byCompId && byCompId.slug === urlSlug ? byCompId : null);
    const finalRecordProducts = resolvedProducts.length > 0
      ? resolvedProducts
      : (Array.isArray(existingStore?.products) ? existingStore.products : []);

    const recordCompany = company || existingStore?.company || { id: resolvedCompanyId || `empresa_${urlSlug}`, name: resolvedStoreName || urlSlug, phone: resolvedZap };
    const recordSettings = paymentSettings || existingStore?.paymentSettings || { merchantWhatsapp: resolvedZap, pixKey: resolvedPix, receivingBank: resolvedBanco };
    const recordSeller = activeSeller || existingStore?.activeSeller || null;
    const nowIso = new Date().toISOString();

    db['_shortLinks'][shortCode] = {
      code: shortCode,
      slug: urlSlug || 'loja',
      storeName: resolvedStoreName || urlSlug || 'Loja',
      companyId: resolvedCompanyId || existingStore?.company?.id || '',
      zap: resolvedZap,
      pix: resolvedPix,
      banco: resolvedBanco,
      company: recordCompany,
      paymentSettings: recordSettings,
      activeSeller: recordSeller,
      products: finalRecordProducts,
      updatedAt: nowIso
    };

    // ALSO keep db[urlSlug] / db[cleanSlug] up to date so direct /loja/:slug and /l/:code fallback NEVER open an empty store!
    if (urlSlug && urlSlug !== 'loja' && (finalRecordProducts.length > 0 || !existingStore)) {
      const storeDraft = {
        slug: urlSlug,
        cleanSlug: cleanSlugAlphanumeric(urlSlug),
        company: { ...recordCompany, slug: urlSlug },
        paymentSettings: recordSettings,
        products: finalRecordProducts,
        activeSeller: recordSeller,
        registeredPhones: Array.isArray(existingStore?.registeredPhones) ? existingStore.registeredPhones : [],
        updatedAt: nowIso
      };
      const mergedPhones = collectStorePhones(storeDraft);
      const upsertedStore = { ...storeDraft, registeredPhones: mergedPhones };
      db[urlSlug] = upsertedStore;
      if (upsertedStore.cleanSlug && upsertedStore.cleanSlug !== urlSlug) {
        db[upsertedStore.cleanSlug] = upsertedStore;
      }
      if (recordCompany?.id && (!db[recordCompany.id] || db[recordCompany.id].slug === urlSlug)) {
        db[recordCompany.id] = upsertedStore;
      }
      if (!db['_phoneIndex'] || typeof db['_phoneIndex'] !== 'object') {
        db['_phoneIndex'] = {};
      }
      for (const phoneNum of mergedPhones) {
        for (const variant of normalizePhoneVariants(phoneNum)) {
          if (!db['_phoneIndex'][variant] || existingStore?.slug === urlSlug) {
            db['_phoneIndex'][variant] = urlSlug;
          }
        }
      }
    }

    // Ensure _phoneIndex knows this registered mobile number if not yet indexed
    if (resolvedZap.length >= 8 && urlSlug && urlSlug !== 'loja') {
      if (!db['_phoneIndex'] || typeof db['_phoneIndex'] !== 'object') {
        db['_phoneIndex'] = {};
      }
      for (const variant of normalizePhoneVariants(resolvedZap)) {
        if (!db['_phoneIndex'][variant] || existingStore?.slug === urlSlug) {
          db['_phoneIndex'][variant] = urlSlug;
        }
      }
    }
    writeDb(db);

    const cacheKey = `${shortCode}|${cleanSelfShortUrl}`;
    const cached = shortUrlCache.get(cacheKey);
    if (cached) {
      return res.json({ shortUrl: cached, cleanSelfShortUrl, shortCode });
    }

    const isLocalOrigin = baseOrigin.includes('localhost') || baseOrigin.includes('127.0.0.1');

    // Build full snapshot target URL on public domain so external opens via is.gd never hit Cookie check AND always deliver products + phone
    const buildPublicSnapshotUrl = () => {
      const targetUrl = new URL(`/loja/${encodeURIComponent(urlSlug || 'loja')}`, baseOrigin);
      if (parsedUrlObj && parsedUrlObj.searchParams.get('p')) {
        parsedUrlObj.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));
        return targetUrl.toString();
      }
      targetUrl.searchParams.set('loja', urlSlug || 'loja');
      targetUrl.searchParams.set('nome', resolvedStoreName || urlSlug || 'Loja');
      targetUrl.searchParams.set('tab', 'client-store');
      if (resolvedCompanyId) targetUrl.searchParams.set('empresa', resolvedCompanyId);
      if (resolvedZap) targetUrl.searchParams.set('zap', resolvedZap);
      if (resolvedPix) targetUrl.searchParams.set('pix', resolvedPix);
      if (resolvedBanco) targetUrl.searchParams.set('banco', resolvedBanco);
      if (finalRecordProducts.length > 0) {
        const compactItems: string[] = [];
        for (const p of finalRecordProducts.slice(0, 60)) {
          const safeName = (p.name || 'Produto').replace(/[_*~|]/g, ' ').trim().slice(0, 32);
          const safeCat = (p.category || 'Outros').replace(/[_*~|]/g, ' ').trim().slice(0, 20);
          const price = Number(p.salePrice) || 0;
          const stock = Number(p.currentStock) || 0;
          const unit = (p.unit || 'UN').replace(/[_*~|]/g, '').trim().slice(0, 6);
          const wp = p.wholesalePrice ? Number(p.wholesalePrice) : '';
          const wq = p.wholesaleMinQty ? Number(p.wholesaleMinQty) : '';
          const entry = (wp && wq)
            ? `${safeName}_${price}_${stock}_${unit}_${safeCat}_${wp}_${wq}`
            : `${safeName}_${price}_${stock}_${unit}_${safeCat}`;
          if (encodeURIComponent([...compactItems, entry].join('*')).length > 3000) break;
          compactItems.push(entry);
        }
        if (compactItems.length > 0) {
          targetUrl.searchParams.set('p', compactItems.join('*'));
        }
      }
      return targetUrl.toString();
    };

    const isGdTargetUrl = buildPublicSnapshotUrl();

    // Create company-named is.gd link pointing to public domain snapshot URL (never ais-pre- Cookie check, zero query codes visible in shared link!)
    if (!isLocalOrigin && cleanSlug && cleanSlug !== 'loja') {
      const rand2 = Math.floor(10 + Math.random() * 89).toString();
      const rand4 = Math.random().toString(36).slice(2, 6);
      const rand5 = Math.random().toString(36).slice(2, 7);
      const basePrefix = cleanSlug.slice(0, 22) || 'loja';
      const candidateParams = [
        shortCode,
        `${basePrefix}_${urlHash}${rand2}`,
        `${basePrefix}_${rand4}`,
        `${basePrefix}_${rand5}`
      ].filter((slug, idx, arr) => slug.length >= 5 && slug.length <= 30 && arr.indexOf(slug) === idx);

      const expectedCheck = cleanSlug.slice(0, 20);
      for (const customParam of candidateParams) {
        try {
          const resp = await fetch('https://is.gd/create.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              format: 'simple',
              shorturl: customParam,
              url: isGdTargetUrl
            }).toString(),
            signal: AbortSignal.timeout(2500)
          });
          if (resp.ok) {
            const text = (await resp.text()).trim();
            if (
              (text.startsWith('http://') || text.startsWith('https://')) &&
              !text.includes('Error') &&
              text.toLowerCase().includes(expectedCheck)
            ) {
              shortUrlCache.set(cacheKey, text);
              return res.json({ shortUrl: text, cleanSelfShortUrl, shortCode });
            }
          } else if (resp.status === 406 || resp.status === 400) {
            try {
              const checkRes = await fetch(`https://is.gd/${customParam}`, {
                method: 'HEAD',
                redirect: 'manual',
                signal: AbortSignal.timeout(1500)
              });
              const loc = checkRes.headers.get('location') || '';
              if (loc === isGdTargetUrl && !loc.includes('ais-pre-') && !loc.includes('ais-dev-')) {
                const reusable = `https://is.gd/${customParam}`;
                shortUrlCache.set(cacheKey, reusable);
                return res.json({ shortUrl: reusable, cleanSelfShortUrl, shortCode });
              }
            } catch {}
          }
        } catch {}
      }
    }

    // Fallback: ALWAYS return ultra-clean URL without ais-pre- or raw query codes
    return res.json({ shortUrl: cleanSelfShortUrl, cleanSelfShortUrl, shortCode });
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
    version: '75',
    versionName: 'v75.0',
    buildDate: new Date().toISOString(),
    features: [
      'Área de produtos 100% limpa e isolada ao abrir o link principal para cada empresa cadastrar loja, senha e celular próprios (v75)',
      'Senha exclusiva por empresa com verificação isolada sem acesso cruzado entre lojas (v75)',
      'Instalação guiada e abertura direta no Safari para iPhone/iPad por empresa e telefone vinculado (v74)',
      'Números de telefone totalmente ocultos na interface, painéis e formulários (v73)'
    ]
  });
});

// Helper to escape HTML safely
const escapeHtml = (str: string): string =>
  String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Keep manifest short_name <= 12 chars without cutting awkwardly
const makeShortName12 = (raw: string): string => {
  const cleaned = String(raw || 'appvendas').trim();
  if (!cleaned) return 'appvendas';
  return cleaned.slice(0, 12).trim() || 'appvendas';
};

// Resolve seller/channel from store using opaque channelKey (sellerId or canal_N — never phone digits)
const resolveChannelFromStore = (store: any, canalParam: string) => {
  if (!canalParam) return null;
  const sellers = Array.isArray(store?.paymentSettings?.sellers) ? store.paymentSettings.sellers : [];
  const byId = sellers.find((s: any) => s?.id === canalParam);
  if (byId) return byId;
  const m = canalParam.match(/^canal_(\d+)$/i);
  if (m) {
    const idx = parseInt(m[1], 10) - 1;
    if (sellers[idx]) return sellers[idx];
  }
  return null;
};

// Dynamic Web App Manifest per company & linked channel (ZERO exposed phone digits!)
app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');

  try {
    const db = readDb();
    const shortLinks = db['_shortLinks'] || {};

    let qSlug = typeof req.query.slug === 'string' ? req.query.slug.trim() : '';
    let qNome = typeof req.query.nome === 'string' ? req.query.nome.trim() : '';
    let qLoja = typeof req.query.loja === 'string' ? req.query.loja.trim() : '';
    let qCanal = typeof req.query.canal === 'string' ? req.query.canal.trim() : '';
    let qEmpresa = typeof req.query.empresa === 'string' ? req.query.empresa.trim() : '';
    let refererShortCode = '';

    // Inspect Referer when manifest is requested without explicit query params (e.g. cold open on /loja/:slug or /l/:code)
    const referer = req.get('referer');
    if (referer && !qSlug && !qLoja && !qNome) {
      try {
        const refUrl = new URL(referer);
        const parts = refUrl.pathname.split('/').filter(Boolean);
        if (parts[0] === 'loja' && parts[1]) {
          qSlug = decodeURIComponent(parts[1]);
        } else if (parts[0] === 'l' && parts[1]) {
          refererShortCode = decodeURIComponent(parts[1]);
        }
        qLoja = qLoja || (refUrl.searchParams.get('loja') || '').trim();
        qNome = qNome || (refUrl.searchParams.get('nome') || '').trim();
        qCanal = qCanal || (refUrl.searchParams.get('canal') || '').trim();
        qEmpresa = qEmpresa || (refUrl.searchParams.get('empresa') || '').trim();
      } catch {}
    }

    const shortRec = refererShortCode
      ? (shortLinks[refererShortCode] || shortLinks[refererShortCode.toLowerCase()] || shortLinks[normalizeSlug(refererShortCode)] || null)
      : null;

    const rawLookup = shortRec?.slug || shortRec?.storeName || qSlug || qLoja || qNome || '';
    const normSlug = normalizeSlug(rawLookup);
    const cleanSlug = cleanSlugAlphanumeric(rawLookup);
    const byCompId = (qEmpresa && db[qEmpresa]) ? db[qEmpresa] : (shortRec?.companyId && db[shortRec.companyId] ? db[shortRec.companyId] : null);
    const dbStore =
      (normSlug && db[normSlug]) ||
      (cleanSlug && db[cleanSlug]) ||
      (byCompId && (!normSlug || byCompId.slug === normSlug) ? byCompId : null) ||
      null;

    const isCompanySpecific = Boolean(normSlug && normSlug !== 'appvendas');

    const displayName = (
      qNome ||
      dbStore?.company?.name ||
      shortRec?.storeName ||
      (qSlug ? qSlug.replace(/[-_]+/g, ' ') : '') ||
      (qLoja ? qLoja.replace(/[-_]+/g, ' ') : '')
    ).trim();

    if (!isCompanySpecific || !displayName) {
      return res.json({
        id: '/',
        name: 'appvendas - PDV e Estoque',
        short_name: 'appvendas',
        description: 'Sistema completo de controle de estoque, vendas PDV e catálogo WhatsApp.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        categories: ['business', 'productivity', 'shopping'],
        prefer_related_applications: false,
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      });
    }

    const storeSlug = normalizeSlug(dbStore?.slug || normSlug) || 'loja';
    const matchedSeller = resolveChannelFromStore(dbStore || shortRec, qCanal);
    const channelLabel = matchedSeller?.name && matchedSeller.name !== 'Atendente' ? String(matchedSeller.name).trim() : '';

    const baseStartPath = refererShortCode
      ? `/l/${encodeURIComponent(refererShortCode)}`
      : `/loja/${encodeURIComponent(storeSlug)}`;
    const startUrl = qCanal
      ? `${baseStartPath}?canal=${encodeURIComponent(qCanal)}`
      : baseStartPath;

    const appName = channelLabel
      ? `${displayName} • ${channelLabel}`
      : `${displayName} - Catálogo Oficial`;

    return res.json({
      id: startUrl,
      name: appName,
      short_name: makeShortName12(displayName),
      description: `Catálogo digital e pedidos da loja ${displayName}.`,
      lang: 'pt-BR',
      dir: 'ltr',
      start_url: startUrl,
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      theme_color: '#059669',
      background_color: '#0f172a',
      categories: ['shopping', 'business'],
      prefer_related_applications: false,
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    });
  } catch {
    return res.json({
      id: '/',
      name: 'appvendas - PDV e Estoque',
      short_name: 'appvendas',
      description: 'Sistema completo de controle de estoque, vendas PDV e catálogo WhatsApp.',
      lang: 'pt-BR',
      dir: 'ltr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      theme_color: '#4f46e5',
      background_color: '#0f172a',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    });
  }
});

const injectStoreMeta = (html: string, req: express.Request): string => {
  try {
    const paramSlug = typeof req.params?.slug === 'string' ? decodeURIComponent(req.params.slug) : '';
    const isShortPath = req.path.toLowerCase().startsWith('/l/');
    const rawLoja = typeof req.query.loja === 'string' ? req.query.loja : paramSlug;
    const rawNome = typeof req.query.nome === 'string' ? req.query.nome : '';
    const rawCanal = typeof req.query.canal === 'string' ? req.query.canal.trim() : '';
    if (!rawLoja && !rawNome) return html;

    const db = readDb();
    const shortLinks = db['_shortLinks'] || {};
    const shortRec = (paramSlug && (shortLinks[paramSlug] || shortLinks[paramSlug.toLowerCase()] || shortLinks[normalizeSlug(paramSlug)])) || null;

    const rawLojaNorm = normalizeSlug(rawLoja);
    const rawLojaClean = cleanSlugAlphanumeric(rawLoja);
    const exactMatchBeforeStrip = (!shortRec && rawLoja) ? (db[rawLojaNorm] || db[rawLojaClean] || null) : null;
    const strippedFromCode = (isShortPath && !exactMatchBeforeStrip && rawLoja) ? rawLoja.replace(/[_-][a-z0-9]{3,8}$/i, '') : rawLoja;
    const lookupKey = shortRec?.slug || shortRec?.storeName || rawNome || exactMatchBeforeStrip?.slug || strippedFromCode || rawLoja;
    const slug = normalizeSlug(lookupKey);
    const clean = cleanSlugAlphanumeric(lookupKey);
    const byCompId = shortRec?.companyId && db[shortRec.companyId] ? db[shortRec.companyId] : null;
    const dbStore =
      db[slug] ||
      db[clean] ||
      db[lookupKey] ||
      exactMatchBeforeStrip ||
      (byCompId && byCompId.slug === slug ? byCompId : null) ||
      (shortRec?.zap && findStoreByPhone(db, shortRec.zap)) ||
      null;

    const displayName = (rawNome || dbStore?.company?.name || shortRec?.storeName || strippedFromCode || rawLoja).replace(/[-_]+/g, ' ').trim();
    if (!displayName) return html;

    const resolvedProducts =
      Array.isArray(dbStore?.products) && dbStore.products.length > 0
        ? dbStore.products
        : (Array.isArray(shortRec?.products) ? shortRec.products : []);

    const matchedSeller = resolveChannelFromStore(dbStore || shortRec, rawCanal);
    const effectiveSlug = dbStore?.slug || slug || 'loja';
    const manifestHref = `/manifest.webmanifest?slug=${encodeURIComponent(effectiveSlug)}&nome=${encodeURIComponent(displayName)}${rawCanal ? `&canal=${encodeURIComponent(rawCanal)}` : ''}`;

    const titleText = `${displayName} - Catálogo Oficial & Pedidos`;
    const descText = `Confira o catálogo digital atualizado da ${displayName} e faça seus pedidos direto pelo WhatsApp!`;

    let updatedHtml = html
      .replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(titleText)}</title>`)
      .replace(/<meta[^>]+name=["']description["'][^>]*>/i, `<meta name="description" content="${escapeHtml(descText)}" />`)
      .replace(/<meta[^>]+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${escapeHtml(titleText)}" />`)
      .replace(/<meta[^>]+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapeHtml(descText)}" />`)
      .replace(/<meta[^>]+name=["']apple-mobile-web-app-title["'][^>]*>/i, `<meta name="apple-mobile-web-app-title" content="${escapeHtml(makeShortName12(displayName))}" />`)
      .replace(/<link[^>]+rel=["']manifest["'][^>]*>/i, `<link rel="manifest" href="${manifestHref}" />`);

    // Inject synchronous hydration payload so cold opens on /l/:code or /loja/:slug load company + channel + products immediately
    if (shortRec || dbStore) {
      const boundZap = String(matchedSeller?.whatsapp || shortRec?.zap || '').replace(/\D/g, '');
      const baseCompany = dbStore?.company || shortRec?.company || { id: `empresa_${effectiveSlug}`, name: displayName, slug: effectiveSlug };
      const baseSettings = {
        ...(dbStore?.paymentSettings || shortRec?.paymentSettings || {}),
        ...(matchedSeller?.id ? { activeSellerId: matchedSeller.id } : {}),
        ...(boundZap ? { merchantWhatsapp: boundZap } : {}),
        ...(matchedSeller?.pixKey ? { pixKey: matchedSeller.pixKey } : (shortRec?.pix ? { pixKey: shortRec.pix } : {})),
        ...(matchedSeller?.receivingBank ? { receivingBank: matchedSeller.receivingBank } : (shortRec?.banco ? { receivingBank: shortRec.banco } : {}))
      };
      const initialPayload = {
        slug: effectiveSlug,
        company: {
          ...baseCompany,
          name: displayName,
          ...(boundZap ? { phone: boundZap } : {})
        },
        paymentSettings: baseSettings,
        products: resolvedProducts,
        zap: boundZap,
        canal: rawCanal || undefined
      };
      const safeJson = JSON.stringify(initialPayload).replace(/</g, '\\u003c');
      updatedHtml = updatedHtml.replace(
        '</head>',
        `<script>window.__INITIAL_SHORT_LINK_DATA__=${safeJson};</script>\n</head>`
      );
    }

    return updatedHtml;
  } catch {
    return html;
  }
};

// Vite Middleware (Dev) or Static Assets (Prod)
// Both serve 200 OK HTML directly on /, /loja/:slug, and /l/:slug (eliminates SW redirect errors & enables instant social previews)
if (!isProduction) {
  const vite = await createViteServer({
    server: { middlewareMode: true, allowedHosts: true },
    appType: 'spa',
  });
  app.get(['/', '/loja/:slug', '/l/:slug'], async (req, res, next) => {
    try {
      const indexPath = path.join(process.cwd(), 'index.html');
      const template = fs.readFileSync(indexPath, 'utf-8');
      const transformed = await vite.transformIndexHtml(req.originalUrl, template);
      const html = injectStoreMeta(transformed, req);
      res.status(200).set({
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
      }).end(html);
    } catch (e) {
      next(e);
    }
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      }
    }
  }));
  app.get(['/', '/loja/:slug', '/l/:slug', '*'], (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    try {
      const rawHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
      res.status(200).type('text/html').send(injectStoreMeta(rawHtml, req));
    } catch {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Full-Stack App] Running on http://0.0.0.0:${PORT}`);
});
