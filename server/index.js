const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const helmet = require('helmet');
const DataStore = require('./services/DataStore');
const WebSocketHandler = require('./services/WebSocketHandler');
const apiRouter = require('./routes/api');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const adminRouter = require('./routes/admin');
const galleryRouter = require('./routes/gallery');
const { pgPool } = require('./config/db');
const { errorMiddleware, setupGlobalErrorHandlers } = require('./utils/errorHandler');

setupGlobalErrorHandlers();

const app = express();
require('express-ws')(app);

app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;

const ROOM_CLEANUP_INTERVAL = 60 * 60 * 1000;
const ROOM_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://maxcdn.bootstrapcdn.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://mc.yandex.ru"],
      imgSrc: ["'self'", "data:", "https:", "https://mc.yandex.ru"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://risovanie.online',
      'http://localhost:3000',
      'https://paint-online-back.onrender.com'
    ];

    if (process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, origin || allowedOrigins[0]);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    }

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://risovanie.online',
    'http://localhost:3000',
    'https://paint-online-back.onrender.com'
  ];
  
  if (process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL) {
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
      res.header('Access-Control-Allow-Origin', allowedOrigins[0]);
    }
  } else {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '5mb' }));


app.get(/^\/help(?:\/.*)?$/, (req, res) => {
  const indexPath = path.join(__dirname, '../client/build', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(500).send('Internal Server Error');
    }
  });
});

function send404Page(res) {
  const indexPath = path.join(__dirname, '../client/build', 'index.html');
  const fallback = '<div id="server-404-fallback" style="text-align:center;padding:2rem 1rem;font-family:sans-serif;max-width:400px;margin:0 auto;"><p style="margin:0 0 1rem;">Страница не найдена.</p><a href="/" style="color:#0066cc;">На главную</a></div>';
  let html;
  try {
    html = fs.readFileSync(indexPath, 'utf8');
    html = html.replace(/<body>\s*/i, '<body>\n    ' + fallback + '\n    ');
  } catch (_) {
    html = '<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>404 — Страница не найдена</title></head><body>' + fallback + '</body></html>';
  }
  res.status(404).setHeader('Content-Type', 'text/html').send(html);
}

app.get('/404', (req, res) => {
 send404Page(res);
});


app.get('/files/coloring_:id.:ext', async (req, res) => {
 const id = req.params.id;
 const ext = req.params.ext;

 if (!id || !/^\d+$/.test(id) || !['jpg','jpeg','png','gif','webp'].includes(ext)) {
 return res.status(404).send('Not found');
 }

 try {
 const result = await pgPool.query(
 'SELECT image_data FROM coloring_pages WHERE id = $1',
 [parseInt(id,10)]
 );

 if (result.rows.length === 0 || !result.rows[0].image_data) {
 return res.status(404).send('Image not found');
 }

 const imageData = result.rows[0].image_data;
 const match = imageData.match(/^data:image\/(jpeg|png|gif|webp);base64,(.+)$/s);
 if (!match) {
 return res.status(500).send('Invalid image data');
 }

 const mimeType = match[1];
 const buffer = Buffer.from(match[2], 'base64');

 res.setHeader('Content-Type', mimeType);
 res.setHeader('Cache-Control', 'public, max-age=86400');
 
 const origin = req.headers.origin;
 const allowedOrigins = ['https://risovanie.online', 'http://localhost:3000', 'https://paint-online-back.onrender.com'];
 if (!origin || allowedOrigins.includes(origin)) {
   res.setHeader('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
 }
 
 res.send(buffer);
 } catch (error) {
 console.error('Legacy coloring image error:', error);
 res.status(500).send('Server error');
 }
});

app.get('/favicon.ico', async (req, res) => {
  try {
    const result = await pgPool.query(
      'SELECT image_data FROM coloring_pages WHERE id = 1 LIMIT 1'
    );

    if (result.rows.length > 0 && result.rows[0].image_data) {
      const imageData = result.rows[0].image_data;
      const match = imageData.match(/^data:image\/(jpeg|png|gif|webp);base64,(.+)$/s);
      if (match) {
        const mimeType = match[1] === 'jpg' ? 'image/jpeg' : `image/${match[1]}`;
        const buffer = Buffer.from(match[2], 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(buffer);
      }
    }
    
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.redirect('/favicon.png');
  } catch (error) {
    console.error('Favicon error:', error);
    res.status(404).send('Not found');
  }
});

app.use('/files', (req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://risovanie.online',
    'http://localhost:3000',
    'https://paint-online-back.onrender.com'
  ];
  
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'require-corp');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}, express.static(path.join(__dirname, 'files'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    const origin = res.req.headers.origin;
    const allowedOrigins = [
      'https://risovanie.online',
      'http://localhost:3000',
      'https://paint-online-back.onrender.com'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
    }
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
}));

app.ws('/', (ws, req) => {
  WebSocketHandler.setupConnection(ws);
});

app.ws('/ws/personal', (ws, req) => {
  WebSocketHandler.setupPersonalConnection(ws);
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api', apiRouter);

app.get('/sitemap.xml', async (req, res) => {
  try {
    const [resultDrawings, resultSections] = await Promise.all([
      pgPool.query(
        `SELECT id, approved_at, created_at
         FROM gallery_drawings
         WHERE status = 'approved'
         ORDER BY approved_at DESC
         LIMIT 5000`
      ),
      pgPool.query(
        `SELECT id, slug, created_at
         FROM coloring_sections
         ORDER BY created_at DESC
         LIMIT 5000`
      )
    ]);

    const drawings = resultDrawings.rows;
    const coloringSections = resultSections.rows;

    const baseUrl = 'https://risovanie.online';
    const now = new Date().toISOString().split('T')[0];

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
<!-- DYNAMIC SITEMAP - Generated 2026-01-17 -->

  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${baseUrl}/"/>
  </url>
  <url>
    <loc>${baseUrl}/coloring</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${baseUrl}/coloring"/>
  </url>
  <url>
    <loc>${baseUrl}/gallery</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${baseUrl}/gallery"/>
  </url>
  <url>
    <loc>${baseUrl}/help</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${baseUrl}/help"/>
  </url>`;

    // Coloring sections & rooms
    for (const section of coloringSections) {
      const sectionSlug = encodeURIComponent(section.slug);
      const sectionDate = section.created_at
        ? new Date(section.created_at).toISOString().split('T')[0]
        : now;

      sitemap += `
  <url>
    <loc>${baseUrl}/coloring/${sectionSlug}</loc>
    <lastmod>${sectionDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${baseUrl}/coloring/${sectionSlug}"/>
  </url>`;

const pagesResult = await pgPool.query(
         `SELECT slug, created_at
         FROM coloring_pages
         WHERE section_id = $1 AND is_active = true
         ORDER BY created_at DESC
         LIMIT 5000`,
         [section.id]
       );

      for (const page of pagesResult.rows) {
        const pageSlug = encodeURIComponent(page.slug);
        const pageDate = page.created_at ? new Date(page.created_at).toISOString().split('T')[0] : now;

        sitemap += `
   <url>
     <loc>${baseUrl}/coloring/${sectionSlug}/${pageSlug}</loc>
     <lastmod>${pageDate}</lastmod>
     <changefreq>weekly</changefreq>
     <priority>0.6</priority>
     <xhtml:link rel="alternate" hreflang="ru" href="${baseUrl}/coloring/${sectionSlug}/${pageSlug}"/>
   </url>`;
      }
    }

    for (const drawing of drawings) {
      const drawingDate = drawing.approved_at
        ? new Date(drawing.approved_at).toISOString().split('T')[0]
        : new Date(drawing.created_at).toISOString().split('T')[0];

      sitemap += `
  <url>
    <loc>${baseUrl}/gallery/${drawing.id}</loc>
    <lastmod>${drawingDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${baseUrl}/gallery/${drawing.id}"/>
  </url>`;
    }

    sitemap += `
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);
  } catch (e) {
    const baseUrl = 'https://risovanie.online';
    const now = new Date().toISOString().split('T')[0];
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${baseUrl}/"/>
  </url>
  <url>
    <loc>${baseUrl}/coloring</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${baseUrl}/coloring"/>
  </url>
  <url>
    <loc>${baseUrl}/gallery</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${baseUrl}/gallery"/>
  </url>
  <url>
    <loc>${baseUrl}/help</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <xhtml:link rel="alternate" hreflang="ru" href="${baseUrl}/help"/>
  </url>
</urlset>`;
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(fallbackSitemap);
  }
});

app.use(errorMiddleware);

const SEO_PAGES = {
  '/coloring': {
    title: 'Раскраски онлайн для детей и взрослых - раскрашивайте бесплатно',
    description: 'Онлайн раскраски на Рисование.Онлайн: бесплатные картинки для раскрашивания в браузере. Выбирайте сюжет, раскрашивайте на телефоне и ПК, сохраняйте результат.',
    keywords: 'раскраски онлайн, картинки для раскрашивания, раскрашивать в браузере, раскраски для детей и взрослых, бесплатные раскраски'
  },
  '/gallery': {
    title: 'Галерея рисунков пользователей - работы сообщества Рисование.Онлайн',
    description: 'Смотрите галерею рисунков пользователей: цифровые иллюстрации, скетчи и детские рисунки. Открывайте каждую работу, читайте комментарии и делитесь мнением.',
    keywords: 'галерея рисунков пользователей, рисунки онлайн, работы художников, цифровые рисунки, комментарии к рисункам'
  },
  '/help': {
    title: 'Справка — Рисование.Онлайн | Ответы на вопросы',
    description: 'Справка по рисованию онлайн: как начать рисовать, настройки инструментов, создание комнат, авторизация, галерея, личные сообщения. Ответы на частые вопросы.',
    keywords: 'справка рисование онлайн, как рисовать, инструкции, настройки инструментов, создание комнат, авторизация, галерея, личные сообщения, частые вопросы'
  }
};

app.use(express.static(path.join(__dirname, '../client/build')));

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderColoringSeoPage(res, { canonicalUrl, h1Text = null, seoOverride = {}, indexableSectionHtml = null }) {
  const indexPath = path.join(__dirname, '../client/build', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  const baseSeo = SEO_PAGES['/coloring'] || {};
  const seo = {
    title: seoOverride.title || baseSeo.title || 'Раскраски онлайн',
    description: seoOverride.description || baseSeo.description || '',
    keywords: seoOverride.keywords || baseSeo.keywords || ''
  };

  html = html
    .replace(/<title>.*?<\/title>/, `<title>${seo.title}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${seo.description}"`)
    .replace(/<meta name="keywords" content=".*?"/, `<meta name="keywords" content="${seo.keywords}"`)
    .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${seo.title}"`)
    .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${seo.description}"`)
    .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="${canonicalUrl}"`);

  const safeH1 = escapeHtml(h1Text || seo.title);
  const safeDescription = escapeHtml(seo.description || '');

  const indexableContent = indexableSectionHtml ? `
    <section style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">
      ${indexableSectionHtml}
    </section>
  ` : `
    <section style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">
      <h1>${safeH1}</h1>
      <p>${safeDescription}</p>
    </section>
  `;

  // Вставляем скрытый контент перед root
  html = html.replace('<div id="root"></div>', `${indexableContent}<div id="root"></div>`);

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}

app.get('/coloring', (req, res) => {
  const canonical = 'https://risovanie.online/coloring';
  renderColoringSeoPage(res, {
    canonicalUrl: canonical,
    h1Text: 'Раскраски онлайн',
    seoOverride: {
      title: SEO_PAGES['/coloring']?.title,
      description: SEO_PAGES['/coloring']?.description,
      keywords: SEO_PAGES['/coloring']?.keywords,
    }
  });
});

app.get('/coloring/:sectionSlug', async (req, res) => {
  const { sectionSlug } = req.params;
  const canonical = `https://risovanie.online/coloring/${encodeURIComponent(sectionSlug)}`;

  try {
    const sectionRes = await pgPool.query(
      `SELECT slug, title, seo_text
       FROM coloring_sections
       WHERE slug = $1`,
      [sectionSlug]
    );

    if (sectionRes.rows.length === 0) {
      // Если раздела нет — отдаем базовую `/coloring` SEO-подмену.
      return renderColoringSeoPage(res, {
        canonicalUrl: canonical,
        h1Text: `Раскраски: ${sectionSlug}`
      });
    }

    const section = sectionRes.rows[0];

    // Внутренняя структура: ссылка на главную и основной каталог
    const indexableSectionHtml = `
      <h1>${escapeHtml(section.title)}</h1>
      <p>${escapeHtml(section.seo_text)}</p>
      <p>
        <a href="https://risovanie.online/">Главная</a> ·
        <a href="https://risovanie.online/coloring">все раскраски</a>
      </p>
    `;

    const seoDescription = String(section.seo_text || '').slice(0, 300);
    const seoKeywords = `раскраски онлайн, ${section.title}`;

    renderColoringSeoPage(res, {
      canonicalUrl: canonical,
      h1Text: section.title,
      seoOverride: {
        title: section.title,
        description: seoDescription,
        keywords: seoKeywords
      },
      indexableSectionHtml
    });
  } catch (e) {
    console.error('Coloring section seo error:', e);
    return send404Page(res);
  }
});

app.get('/coloring/:sectionSlug/:pageSlug', async (req, res) => {
  const { sectionSlug, pageSlug } = req.params;
  const canonical = `https://risovanie.online/coloring/${encodeURIComponent(sectionSlug)}/${encodeURIComponent(pageSlug)}`;

  try {
    const pageRes = await pgPool.query(
      `SELECT
         cp.slug,
         cp.title,
         cp.seo_text,
         cs.slug AS section_slug,
         cs.title AS section_title,
         cs.seo_text AS section_seo_text
       FROM coloring_pages cp
       JOIN coloring_sections cs ON cs.id = cp.section_id
       WHERE cs.slug = $1 AND cp.slug = $2 AND cp.is_active = true`,
      [sectionSlug, pageSlug]
    );

    if (pageRes.rows.length === 0) {
      return send404Page(res);
    }

    const page = pageRes.rows[0];

    const indexableSectionHtml = `
      <h1>${escapeHtml(page.title)}</h1>
      <p>${escapeHtml(page.seo_text)}</p>
      <p>
        <a href="https://risovanie.online/">Главная</a> ·
        <a href="https://risovanie.online/coloring/${escapeHtml(page.section_slug)}">в раздел ${escapeHtml(page.section_title)}</a> ·
        <a href="https://risovanie.online/coloring">все раскраски</a>
      </p>
    `;

    const seoDescription = String(page.seo_text || '').slice(0, 300);
    const seoKeywords = `раскраски онлайн, ${page.title}, ${page.section_title}`;

    renderColoringSeoPage(res, {
      canonicalUrl: canonical,
      h1Text: page.title,
      seoOverride: {
        title: page.title,
        description: seoDescription,
        keywords: seoKeywords
      },
      indexableSectionHtml
    });
  } catch (e) {
    console.error('Coloring page seo error:', e);
    return send404Page(res);
  }
});

app.get('/gallery', (req, res) => {
  const indexPath = path.join(__dirname, '../client/build', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  
  const seo = SEO_PAGES['/gallery'];
  html = html
    .replace(/<title>.*?<\/title>/, `<title>${seo.title}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${seo.description}"`)
    .replace(/<meta name="keywords" content=".*?"/, `<meta name="keywords" content="${seo.keywords}"`)
    .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${seo.title}"`)
    .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${seo.description}"`)
    .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="https://risovanie.online/gallery"`);
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

app.get('/help', (req, res) => {
  res.setHeader('X-Robots-Tag', 'index');

  const indexPath = path.join(__dirname, '../client/build', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  const seo = SEO_PAGES['/help'];
  html = html
    .replace(/<title>.*?<\/title>/, `<title>${seo.title}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${seo.description}"`)
    .replace(/<meta name="keywords" content=".*?"/, `<meta name="keywords" content="${seo.keywords}"`)
    .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${seo.title}"`)
    .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${seo.description}"`)
    .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="https://risovanie.online/help"`);

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

app.get('/help/', (req, res) => {
  const indexPath = path.join(__dirname, '../client/build', 'index.html');
  return res.sendFile(indexPath);
});

app.get('/help/*', (req, res) => {
  const indexPath = path.join(__dirname, '../client/build', 'index.html');
  return res.sendFile(indexPath);
});

app.get('/gallery/:id', async (req, res) => {
  const drawingId = parseInt(req.params.id, 10);
  if (!Number.isFinite(drawingId) || drawingId <= 0) {
    return send404Page(res);
  }

  res.setHeader('X-Robots-Tag', 'index');

  const indexPath = path.join(__dirname, '../client/build', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  try {
    const result = await pgPool.query(
      `SELECT gd.id, gd.title, gd.created_at, gd.approved_at, u.username AS author_name
       FROM gallery_drawings gd
       JOIN users u ON u.id = gd.user_id
       WHERE gd.id = $1 AND gd.status = 'approved'`,
      [drawingId]
    );

    if (result.rows.length === 0) {
      return send404Page(res);
    }

    const drawing = result.rows[0];
    const commentsResult = await pgPool.query(
      `SELECT gc.comment, u.username AS author_name
       FROM gallery_comments gc
       JOIN users u ON u.id = gc.user_id
       WHERE gc.drawing_id = $1 AND gc.is_deleted = FALSE
       ORDER BY gc.created_at ASC
       LIMIT 50`,
      [drawingId]
    );
    const seoTitle = `${drawing.title} - рисунок в галерее Рисование.Онлайн`;
    const seoDescription = `Рисунок "${drawing.title}" автора ${drawing.author_name}. Смотрите изображение и комментарии к работе в галерее Рисование.Онлайн.`;
    const canonical = `https://risovanie.online/gallery/${drawing.id}`;
    const seoKeywords = `рисунок ${drawing.title}, галерея рисунков, комментарии к рисунку, ${drawing.author_name}`;

    html = html
      .replace(/<title>.*?<\/title>/, `<title>${seoTitle}</title>`)
      .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${seoDescription}"`)
      .replace(/<meta name="keywords" content=".*?"/, `<meta name="keywords" content="${seoKeywords}"`)
      .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${seoTitle}"`)
      .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${seoDescription}"`)
      .replace(/<meta property="og:url" content=".*?"/, `<meta property="og:url" content="${canonical}"`)
      .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="${canonical}"`);

    const commentsHtml = commentsResult.rows
      .map(comment => `<li><strong>${escapeHtml(comment.author_name)}:</strong> ${escapeHtml(comment.comment)}</li>`)
      .join('');

    const indexableContent = `<section style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">
      <h1>${escapeHtml(drawing.title)}</h1>
      <p>Автор: ${escapeHtml(drawing.author_name)}</p>
      <h2>Комментарии к рисунку</h2>
      <ul>${commentsHtml || '<li>Комментариев пока нет.</li>'}</ul>
    </section>`;

    html = html.replace('<div id="root"></div>', `${indexableContent}<div id="root"></div>`);
  } catch (error) {
    console.error('Gallery drawing seo error:', error);
    return send404Page(res);
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

const CLIENT_ROUTES = ['/', '/login', '/register', '/reset-password', '/profile', '/404', '/coloring', '/gallery', '/help'];

CLIENT_ROUTES.forEach(route => {
  if (route !== '/*') {
    app.get(route, (req, res) => {
      const indexPath = path.join(__dirname, '../client/build', 'index.html');
      return res.sendFile(indexPath);
    });
  }
});

app.get('*', (req, res) => {
  const normalizedPath = (req.path || '').replace(/\/+$/, '');
  const indexPath = path.join(__dirname, '../client/build', 'index.html');

  // SPA fallback для роутов React Router.
  // /coloring/:sectionSlug и /coloring/:sectionSlug/:pageSlug должны обслуживаться клиентом,
  // если для них не отданы SEO-страницы выше.
  if (normalizedPath === '/help' || normalizedPath.startsWith('/help')) {
    return res.sendFile(indexPath);
  }

  if (normalizedPath === '/coloring' || normalizedPath.startsWith('/coloring/')) {
    return res.sendFile(indexPath);
  }

  if (normalizedPath === '/gallery' || normalizedPath.startsWith('/gallery/')) {
    // /gallery/:id уже имеет отдельный handler, но для остальных подойдёт SPA.
    return res.sendFile(indexPath);
  }

  if (CLIENT_ROUTES.includes(normalizedPath)) {
    return res.sendFile(indexPath);
  }

  const segments = normalizedPath.split('/').filter(Boolean);

  if (segments.length !== 1) {
    return send404Page(res);
  }

  const roomId = segments[0];
  DataStore.getRoomInfo(roomId)
    .then(room => {
      if (!room) {
        send404Page(res);
      } else {
        res.setHeader('X-Robots-Tag', 'noindex');

        res.sendFile(indexPath);
      }
    })
    .catch(() => {
      send404Page(res);
    });
});


setInterval(async () => {
  try {
    await DataStore.cleanupExpiredRooms(ROOM_EXPIRATION_TIME);
  } catch (_) { }
}, ROOM_CLEANUP_INTERVAL);

const INACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000;
setInterval(async () => {
  try {
    const RoomManager = require('./services/RoomManager');
    await RoomManager.checkInactiveUsers();
  } catch (_) { }
}, INACTIVITY_CHECK_INTERVAL);

setInterval(async () => {
  try {
    const Session = require('./models/Session');
    await Session.cleanExpired();
  } catch (error) {
    console.error('Session cleanup error:', error);
  }
}, 6 * 60 * 60 * 1000);

['SIGTERM', 'SIGINT'].forEach((sig) => {
  process.on(sig, () => process.exit(0));
});

async function initDb() {
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(20) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        is_public BOOLEAN NOT NULL DEFAULT true,
        has_password BOOLEAN NOT NULL DEFAULT false,
        password_hash VARCHAR(60),
        created_at BIGINT NOT NULL,
        last_activity BIGINT NOT NULL,
        weight INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS strokes (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(20) REFERENCES rooms(id) ON DELETE CASCADE,
        stroke_data JSONB NOT NULL,
        username VARCHAR(30) NOT NULL,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cancelled_strokes (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(20) REFERENCES rooms(id) ON DELETE CASCADE,
        stroke_data JSONB NOT NULL,
        username VARCHAR(30) NOT NULL,
        created_at BIGINT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        avatar_url TEXT,
        created_at BIGINT NOT NULL,
        last_login BIGINT,
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        settings JSONB DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) UNIQUE NOT NULL,
        expires_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL,
        ip_address TEXT,
        user_agent TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_strokes_room_id ON strokes(room_id);
      CREATE INDEX IF NOT EXISTS idx_cancelled_strokes_room_user ON cancelled_strokes(room_id, username);
      CREATE INDEX IF NOT EXISTS idx_rooms_last_activity ON rooms(last_activity);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

      CREATE TABLE IF NOT EXISTS favorite_rooms (
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        room_id VARCHAR(20) REFERENCES rooms(id) ON DELETE CASCADE,
        created_at BIGINT NOT NULL,
        PRIMARY KEY (user_id, room_id)
      );

      CREATE TABLE IF NOT EXISTS user_room_activity (
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        room_id VARCHAR(20) REFERENCES rooms(id) ON DELETE CASCADE,
        last_activity BIGINT NOT NULL,
        PRIMARY KEY (user_id, room_id)
      );
    `);
    console.log('Database tables ready');

    // Создаём таблицу coloring_sections ПЕРЕД использованием
    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS coloring_sections (
          id SERIAL PRIMARY KEY,
          slug VARCHAR(80) NOT NULL UNIQUE,
          title VARCHAR(120) NOT NULL,
          seo_text TEXT NOT NULL,
          created_at BIGINT NOT NULL
        );
      `);
      console.log('Table coloring_sections ready');
      
      // Автоматическая миграция: добавляем поле image_url если его нет
      await pgPool.query(`
        ALTER TABLE coloring_sections
        ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL;
      `);
      console.log('✅ Migration: Added image_url column to coloring_sections');
    } catch (err) {
      console.error('Warning: Could not create coloring_sections table:', err.message);
    }

    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS coloring_pages (
          id SERIAL PRIMARY KEY,
          title VARCHAR(100) NOT NULL,
          slug VARCHAR(160) NOT NULL UNIQUE,
          image_url TEXT NOT NULL,
          thumbnail_url TEXT,
          image_data TEXT,
          alt TEXT,
          created_at BIGINT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          section_id INTEGER REFERENCES coloring_sections(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_coloring_pages_active_section ON coloring_pages(section_id, is_active);
        CREATE INDEX IF NOT EXISTS idx_coloring_pages_section_id ON coloring_pages(section_id);
      `);
      console.log('Table coloring_pages ready');
    } catch (err) {
      console.error('Warning: Could not create coloring_pages table:', err.message);
    }

    // Migration for coloring_pages restructuring (room -> section)
    try {
      await pgPool.query(`ALTER TABLE coloring_pages ADD COLUMN IF NOT EXISTS slug VARCHAR(160) UNIQUE`);
      await pgPool.query(`ALTER TABLE coloring_pages ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES coloring_sections(id) ON DELETE SET NULL`);
      await pgPool.query(`ALTER TABLE coloring_pages ADD COLUMN IF NOT EXISTS alt TEXT`);
      await pgPool.query(`UPDATE coloring_pages SET slug = LOWER(REPLACE(REPLACE(title, ' ', '-'), '''', '')) WHERE slug IS NULL`);
      await pgPool.query(`UPDATE coloring_pages SET section_id = (SELECT id FROM coloring_sections ORDER BY id LIMIT 1) WHERE section_id IS NULL AND EXISTS (SELECT 1 FROM coloring_sections)`);
      // Fix NOT NULL constraint on section_id - allow NULL
      await pgPool.query(`ALTER TABLE coloring_pages ALTER COLUMN section_id DROP NOT NULL`);
    } catch (err) {
      console.log('Coloring pages migration note:', err.message);
    }

    try {
      const { generateSlug, ensureUniqueColoringPageSlug } = require('./utils/slug');
      const pages = await pgPool.query('SELECT id, title, slug FROM coloring_pages');
      for (const page of pages.rows) {
        const expected = generateSlug(page.title);
        if (!expected) continue;

        const currentSlug = page.slug || '';
        const hasNonLatinSlug = !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(currentSlug);
        if (!hasNonLatinSlug && currentSlug === expected) continue;

        const newSlug = await ensureUniqueColoringPageSlug(pgPool, expected, page.id);
        if (newSlug !== currentSlug) {
          await pgPool.query('UPDATE coloring_pages SET slug = $1 WHERE id = $2', [newSlug, page.id]);
        }
      }
      console.log('Coloring pages slug transliteration migration done');
    } catch (err) {
      console.log('Coloring pages slug transliteration note:', err.message);
    }

    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS gallery_drawings (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(20) NOT NULL,
          image_data TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          likes_count INTEGER DEFAULT 0,
          created_at BIGINT NOT NULL,
          approved_at BIGINT,
          alt TEXT,
          author_name TEXT
        );
        CREATE TABLE IF NOT EXISTS gallery_likes (
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          drawing_id INTEGER REFERENCES gallery_drawings(id) ON DELETE CASCADE,
          created_at BIGINT NOT NULL,
          PRIMARY KEY (user_id, drawing_id)
        );
        CREATE TABLE IF NOT EXISTS gallery_comments (
          id SERIAL PRIMARY KEY,
          drawing_id INTEGER NOT NULL REFERENCES gallery_drawings(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          comment TEXT NOT NULL,
          likes_count INTEGER DEFAULT 0,
          created_at BIGINT NOT NULL,
          updated_at BIGINT,
          is_deleted BOOLEAN DEFAULT FALSE
        );
        CREATE TABLE IF NOT EXISTS gallery_comment_likes (
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          comment_id INTEGER REFERENCES gallery_comments(id) ON DELETE CASCADE,
          created_at BIGINT NOT NULL,
          PRIMARY KEY (user_id, comment_id)
        );
        CREATE INDEX IF NOT EXISTS idx_gallery_drawings_status ON gallery_drawings(status);
        CREATE INDEX IF NOT EXISTS idx_gallery_drawings_user ON gallery_drawings(user_id);
        CREATE INDEX IF NOT EXISTS idx_gallery_drawings_likes ON gallery_drawings(likes_count DESC);
        CREATE INDEX IF NOT EXISTS idx_gallery_likes_drawing ON gallery_likes(drawing_id);
        CREATE INDEX IF NOT EXISTS idx_gallery_comments_drawing_id ON gallery_comments(drawing_id);
        CREATE INDEX IF NOT EXISTS idx_gallery_comments_user_id ON gallery_comments(user_id);
        CREATE INDEX IF NOT EXISTS idx_gallery_comments_created_at ON gallery_comments(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_gallery_comment_likes_comment ON gallery_comment_likes(comment_id);
      `);
    } catch (_) { }

    try {
      await pgPool.query(`ALTER TABLE gallery_comments ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0`);
    } catch (_) { }

    try {
      await pgPool.query(`ALTER TABLE coloring_pages ADD COLUMN IF NOT EXISTS image_data TEXT`);
    } catch (_) { }

    try {
      await pgPool.query(`ALTER TABLE coloring_pages ADD COLUMN IF NOT EXISTS alt TEXT`);
    } catch (_) { }

    try {
      await pgPool.query(`ALTER TABLE gallery_drawings ADD COLUMN IF NOT EXISTS alt TEXT`);
    } catch (_) { }

    try {
      await pgPool.query(`ALTER TABLE gallery_drawings ADD COLUMN IF NOT EXISTS author_name TEXT`);
    } catch (_) { }

    try {
      await pgPool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS weight INTEGER DEFAULT 0`);
    } catch (_) { }
    try {
      await pgPool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL`);
    } catch (_) { }
    try {
      await pgPool.query(`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`);
    } catch (_) { }

    // Seed coloring sections if table is empty
    try {
      const sectionsCount = await pgPool.query('SELECT COUNT(*) FROM coloring_sections');
      const count = parseInt(sectionsCount.rows[0]?.count || '0', 10);
      
      if (count === 0) {
        console.log('Seeding coloring sections...');
        await pgPool.query(`
          INSERT INTO coloring_sections (slug, title, seo_text, created_at)
          VALUES
            ('multiki', 'Мультфильмы', 'Мультфильмы — это любимые герои, яркие сюжеты и радость творчества для детей и взрослых. На странице раскрасок «Мультфильмы» собраны картинки с узнаваемыми персонажами, выразительными эмоциями и динамичными сценами, чтобы процесс раскрашивания был увлекательным.', EXTRACT(EPOCH FROM NOW())::BIGINT),
            ('kino', 'Кино', 'Раздел раскрасок «Кино» — это возможность создать яркие постеры, героев и фантастические сцены в формате раскраски прямо в браузере. Здесь собраны рисунки, вдохновлённые популярными фильмами и киноисториями: драматичные кадры, волшебные моменты, приключения и киноперсонажи.', EXTRACT(EPOCH FROM NOW())::BIGINT),
            ('games', 'Игры', 'Раскраски «Игры» — место, где знакомые персонажи, уровни и приключения превращаются в красивый рисунок. Здесь вы найдёте подборки раскрасок по игровым темам: герои, персонажи-помощники, фантастические локации, магические эффекты и яркие сцены.', EXTRACT(EPOCH FROM NOW())::BIGINT),
            ('skazki', 'Сказки', 'Раздел «Сказки» — это добрые герои, волшебные сцены и захватывающие сюжеты, которые легко и интересно раскрасить в браузере. Здесь собраны раскраски по мотивам сказочных историй: персонажи, домики, лесные тропинки, магические предметы.', EXTRACT(EPOCH FROM NOW())::BIGINT),
            ('priroda', 'Природа', 'Раскраски «Природа» — это красивые пейзажи, деревья, цветы, сезонные сюжеты и всё, что вдохновляет на спокойное творчество. Здесь собраны рисунки с миром вокруг: лес, поля, закаты, растения и природные элементы.', EXTRACT(EPOCH FROM NOW())::BIGINT),
            ('animals', 'Животные', 'Раздел «Животные» — это раскраски с любимыми питомцами, дикими зверями и персонажами из мультфильмов про животных. Здесь собраны сюжеты, которые легко раскрасить и приятно рассматривать: кошки, собаки, птицы, морские обитатели и лесные жители.', EXTRACT(EPOCH FROM NOW())::BIGINT),
            ('mandaly', 'Мандалы', 'Мандалы — это завораживающие узоры, которые помогают расслабиться и погрузиться в спокойный ритм творчества. В разделе «Мандалы» собраны раскраски с круговыми орнаментами, симметричными деталями и красивыми повторяющимися элементами.', EXTRACT(EPOCH FROM NOW())::BIGINT),
            ('cosmos', 'Космос', 'Раскраски «Космос» — это звёзды, планеты, туманности и фантастические пейзажи, которые хочется раскрашивать снова и снова. На странице вы найдёте сюжеты, вдохновлённые вселенной: от простых контуров с планетами до более детализированных картинок.', EXTRACT(EPOCH FROM NOW())::BIGINT),
            ('technique', 'Техника', 'Раздел «Техника» — это раскраски про машины, механизмы, детали и изобретения. Здесь собраны рисунки с элементами техники: автомобили, самолёты, роботы, колёса, шестерёнки и интересные механические сцены.', EXTRACT(EPOCH FROM NOW())::BIGINT),
            ('celebrities', 'Знаменитости', 'Раздел «Знаменитости» создан для тех, кто любит узнаваемые образы и вдохновляющие сюжеты. Здесь собраны раскраски с персонажами в стиле известных людей, образами артистов и яркими портретными мотивами.', EXTRACT(EPOCH FROM NOW())::BIGINT)
          ON CONFLICT (slug) DO NOTHING;
        `);
        const newCount = await pgPool.query('SELECT COUNT(*) FROM coloring_sections');
        console.log(`✅ Seeded ${newCount.rows[0]?.count || 0} coloring sections`);
      }
      
      // Migration: Add default images to sections without image_url
      const sectionsWithImages = await pgPool.query(`
        UPDATE coloring_sections
        SET image_url = CASE
          WHEN slug = 'multiki' THEN '/uploads/coloring/cartoons-section.jpg'
          WHEN slug = 'kino' THEN '/uploads/coloring/cinema-section.jpg'
          WHEN slug = 'games' THEN '/uploads/coloring/games-section.jpg'
          WHEN slug = 'skazki' THEN '/uploads/coloring/fairytales-section.jpg'
          WHEN slug = 'priroda' THEN '/uploads/coloring/nature-section.jpg'
          WHEN slug = 'animals' THEN '/uploads/coloring/animals-section.jpg'
          WHEN slug = 'mandaly' THEN '/uploads/coloring/mandalas-section.jpg'
          WHEN slug = 'cosmos' THEN '/uploads/coloring/space-section.jpg'
          WHEN slug = 'technique' THEN '/uploads/coloring/technique-section.jpg'
          WHEN slug = 'celebrities' THEN '/uploads/coloring/celebrities-section.jpg'
          ELSE image_url
        END
        WHERE image_url IS NULL;
      `);
      console.log(`✅ Migration: Updated ${sectionsWithImages.rowCount || 0} sections with default image URLs`);
    } catch (err) {
      console.error('Warning: Could not seed coloring sections:', err.message);
    }

    try {
      await pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false`);
    } catch (_) { }
    try {
      await pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`);
    } catch (_) { }
    try {
      await pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false`);
    } catch (_) { }

    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS personal_messages (
          id SERIAL PRIMARY KEY,
          from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          timestamp BIGINT NOT NULL,
          delivered BOOLEAN DEFAULT false,
          read BOOLEAN DEFAULT false,
          created_at BIGINT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_pm_to_user ON personal_messages(to_user_id, delivered);
        CREATE INDEX IF NOT EXISTS idx_pm_conversation ON personal_messages(from_user_id, to_user_id);
      `);
      await pgPool.query(`ALTER TABLE personal_messages ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;`);
      await pgPool.query(`CREATE INDEX IF NOT EXISTS idx_pm_read ON personal_messages(from_user_id, to_user_id, read);`);
    } catch (_) { }

    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(100) NOT NULL UNIQUE,
          expires_at BIGINT NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          created_at BIGINT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
      `);
    } catch (_) { }

    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS app_config (
          key VARCHAR(64) PRIMARY KEY,
          value JSONB NOT NULL DEFAULT '{}',
          updated_at BIGINT NOT NULL
        );
      `);
    } catch (_) { }

    const bcrypt = require('bcrypt');
    const { hashPassword } = require('./utils/auth');

    const adminExists = await pgPool.query(
      "SELECT id FROM users WHERE email = 'admin@admin.com'"
    );

    if (adminExists.rows.length === 0) {
      const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD;
      if (!adminPassword) {
        console.error('ERROR: ADMIN_DEFAULT_PASSWORD environment variable is not set.');
        console.error('Admin account cannot be created without a password.');
        console.error('Please set ADMIN_DEFAULT_PASSWORD and restart the server.');
        throw new Error('ADMIN_DEFAULT_PASSWORD is required for initial admin account creation');
      }
      const adminPasswordHash = await hashPassword(adminPassword);
      await pgPool.query(
        `INSERT INTO users (username, email, password_hash, role, created_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin', 'admin@admin.com', adminPasswordHash, 'superadmin', Date.now(), true]
      );
      console.log('Default admin user created: admin@admin.com');
      console.log('IMPORTANT: Change the default admin password immediately after first login!');
    }
  } catch (err) {
    console.error('Failed to initialize database tables:', err.message);
    console.warn('Server will start without database functionality');
  }
}

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database connection error:', err.message);
  console.warn('Server will start without database functionality');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (without database)`);
  });
});

module.exports = app;
