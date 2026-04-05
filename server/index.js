const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
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
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

app.use(cors({
  origin: function (origin, callback) {
    if (process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL) {
      return callback(null, true);
    }

    const allowedOrigins = [
      'https://risovanie.online',
      'http://localhost:3000',
      'https://paint-online-back.onrender.com'
    ];

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
  if (process.env.NODE_ENV === 'production' ||
      process.env.RENDER_EXTERNAL_URL ||
      origin === 'https://risovanie.online' ||
      origin === 'http://localhost:3000') {
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

 if (result.rows.length ===0 || !result.rows[0].image_data) {
 return res.status(404).send('Image not found');
 }

 const imageData = result.rows[0].image_data;
 const match = imageData.match(/^data:([^;]+);base64,(.+)$/s);
 if (!match) {
 return res.status(500).send('Invalid image data');
 }

 const mimeType = match[1];
 const buffer = Buffer.from(match[2], 'base64');

 res.setHeader('Content-Type', mimeType);
 res.setHeader('Cache-Control', 'public, max-age=86400');
 res.setHeader('Access-Control-Allow-Origin', '*');
 res.send(buffer);
 } catch (error) {
 console.error('Legacy coloring image error:', error);
 res.status(500).send('Server error');
 }
});

app.use('/files', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}, express.static(path.join(__dirname, 'files'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cache-Control', 'public, max-age=86400');
  }
}));
app.use(express.static(path.join(__dirname, '../client/build')));

app.ws('/', (ws, req) => {
  WebSocketHandler.setupConnection(ws);
});

app.ws('/ws/personal', (ws, req) => {
  WebSocketHandler.setupPersonalConnection(ws);
});

app.use('/', apiRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/gallery', galleryRouter);

app.use(errorMiddleware);

// SEO: Server-rendered meta tags for bots (без JavaScript)
const SEO_PAGES = {
  '/coloring': {
    title: 'Раскраски онлайн - бесплатные раскраски для детей и взрослых',
    description: 'Раскраски онлайн бесплатно. Раскрашивайте картинки прямо в браузере без скачивания. Большая коллекция раскрасок для детей и взрослых.',
    keywords: 'раскраски онлайн, раскраски для детей, раскраски бесплатно, раскраски для взрослых, онлайн раскраски'
  },
  '/gallery': {
    title: 'Галерея рисунков - лучшие работы пользователей',
    description: 'Галерея рисунков пользователей Рисование.Онлайн. Смотрите, оценивайте и добавляйте свои работы в галерею.',
    keywords: 'галерея рисунков, рисунки онлайн, галерея art, рисование онлайн галерея'
  }
};

app.get('/coloring', (req, res) => {
  const indexPath = path.join(__dirname, '../client/build', 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  const seo = SEO_PAGES['/coloring'];
  html = html
    .replace(/<title>.*?<\/title>/, `<title>${seo.title}</title>`)
    .replace(/<meta name="description" content=".*?"/, `<meta name="description" content="${seo.description}"`)
    .replace(/<meta name="keywords" content=".*?"/, `<meta name="keywords" content="${seo.keywords}"`)
    .replace(/<meta property="og:title" content=".*?"/, `<meta property="og:title" content="${seo.title}"`)
    .replace(/<meta property="og:description" content=".*?"/, `<meta property="og:description" content="${seo.description}"`)
    .replace(/<link rel="canonical" href=".*?"/, `<link rel="canonical" href="https://risovanie.online/coloring"`);
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
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

const CLIENT_ROUTES = ['/', '/login', '/register', '/reset-password', '/profile', '/404', '/coloring', '/gallery'];

app.get('*', (req, res) => {
  const pathname = req.path;
  const normalizedPath = pathname.replace(/\/+$/, '');
  const indexPath = path.join(__dirname, '../client/build', 'index.html');

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

    try {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS coloring_pages (
          id SERIAL PRIMARY KEY,
          title VARCHAR(100) NOT NULL,
          image_url TEXT NOT NULL,
          thumbnail_url TEXT,
          image_data TEXT,
          created_at BIGINT NOT NULL,
          is_active BOOLEAN DEFAULT true
        );
        CREATE INDEX IF NOT EXISTS idx_coloring_pages_active ON coloring_pages(is_active);
      `);
    } catch (_) { }

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
          approved_at BIGINT
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
          created_at BIGINT NOT NULL,
          updated_at BIGINT,
          is_deleted BOOLEAN DEFAULT FALSE
        );
        CREATE INDEX IF NOT EXISTS idx_gallery_drawings_status ON gallery_drawings(status);
        CREATE INDEX IF NOT EXISTS idx_gallery_drawings_user ON gallery_drawings(user_id);
        CREATE INDEX IF NOT EXISTS idx_gallery_drawings_likes ON gallery_drawings(likes_count DESC);
        CREATE INDEX IF NOT EXISTS idx_gallery_likes_drawing ON gallery_likes(drawing_id);
        CREATE INDEX IF NOT EXISTS idx_gallery_comments_drawing_id ON gallery_comments(drawing_id);
        CREATE INDEX IF NOT EXISTS idx_gallery_comments_user_id ON gallery_comments(user_id);
        CREATE INDEX IF NOT EXISTS idx_gallery_comments_created_at ON gallery_comments(created_at DESC);
      `);
    } catch (_) { }

    try {
      await pgPool.query(`ALTER TABLE coloring_pages ADD COLUMN IF NOT EXISTS image_data TEXT`);
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
          created_at BIGINT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_pm_to_user ON personal_messages(to_user_id, delivered);
        CREATE INDEX IF NOT EXISTS idx_pm_conversation ON personal_messages(from_user_id, to_user_id);
      `);
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

    const bcrypt = require('bcrypt');
    const { hashPassword } = require('./utils/auth');

    const adminExists = await pgPool.query(
      "SELECT id FROM users WHERE email = 'admin@admin.com'"
    );

    if (adminExists.rows.length === 0) {
      const adminPasswordHash = await hashPassword('Hbcjdfkrf!13');
      await pgPool.query(
        `INSERT INTO users (username, email, password_hash, role, created_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin', 'admin@admin.com', adminPasswordHash, 'superadmin', Date.now(), true]
      );
      console.log('Default admin user created: admin@admin.com');
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
