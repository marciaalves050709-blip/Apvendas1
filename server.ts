import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const PORT = 3000;

const app = express();
app.use(express.json({ limit: '15mb' }));

const DB_PATH = path.join(process.cwd(), 'stores_db.json');

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

// API: Save/Sync Store Catalog and Details
app.post('/api/stores/:slug', (req, res) => {
  try {
    const rawSlug = req.params.slug;
    const slug = normalizeSlug(rawSlug);
    if (!slug) {
      return res.status(400).json({ error: 'Store slug required' });
    }

    const { company, paymentSettings, products, activeSeller } = req.body;
    const db = readDb();

    db[slug] = {
      slug,
      company: company || { name: rawSlug },
      paymentSettings: paymentSettings || {},
      products: Array.isArray(products) ? products : [],
      activeSeller: activeSeller || null,
      updatedAt: new Date().toISOString()
    };

    writeDb(db);
    console.log(`[StoreDB] Store "${slug}" synced with ${db[slug].products.length} products`);
    res.json({ success: true, slug, productCount: db[slug].products.length });
  } catch (err: any) {
    console.error('[StoreDB] Error saving store:', err);
    res.status(500).json({ error: err.message || 'Failed to save store' });
  }
});

// API: Retrieve Store by Slug
app.get('/api/stores/:slug', (req, res) => {
  try {
    const slug = normalizeSlug(req.params.slug);
    const db = readDb();

    if (db[slug]) {
      return res.json(db[slug]);
    }

    // Secondary match: compare against stored company name or alternate slugs
    const found = Object.values(db).find((s: any) => {
      if (!s) return false;
      if (s.slug === slug) return true;
      if (s.company?.name && normalizeSlug(s.company.name) === slug) return true;
      if (s.company?.id && s.company.id === req.params.slug) return true;
      return false;
    });

    if (found) {
      return res.json(found);
    }

    res.status(404).json({ error: 'Loja não encontrada', slug });
  } catch (err: any) {
    console.error('[StoreDB] Error getting store:', err);
    res.status(500).json({ error: err.message || 'Failed to load store' });
  }
});

// API: List all synced stores (for debugging / health check)
app.get('/api/stores', (_req, res) => {
  try {
    const db = readDb();
    const list = Object.keys(db).map(slug => ({
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

// Direct Short URL Redirect: e.g. /loja/minha-empresa -> /?loja=minha-empresa
app.get('/loja/:slug', (req, res) => {
  const slug = encodeURIComponent(req.params.slug);
  res.redirect(`/?loja=${slug}`);
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
