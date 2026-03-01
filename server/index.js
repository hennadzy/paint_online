const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const DataStore = require('./services/DataStore');
const WebSocketHandler = require('./services/WebSocketHandler');
const apiRouter = require('./routes/api');

const app = express();
require('express-ws')(app);
const PORT = process.env.PORT || 5000;

const ROOM_CLEANUP_INTERVAL = 60 * 60 * 1000;
const ROOM_EXPIRATION_TIME = 3 * 24 * 60 * 60 * 1000;

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
    // Разрешаем все источники в production для файлов
    if (process.env.NODE_ENV === 'production') {
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 86400
}));

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

// Маршрут /404 до статики — чтобы всегда отдавать 404, а не 200
app.get('/404', (req, res) => {
  send404Page(res);
});

// Статические файлы с правильными заголовками CORS
app.use('/files', (req, res, next) => {
  // Устанавливаем правильные CORS заголовки для файлов
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');

  // Для опционального запроса OPTIONS
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}, express.static(path.join(__dirname, 'files'), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Дополнительные заголовки для каждого файла
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    res.header('Cache-Control', 'public, max-age=86400');
  }
}));
app.use(express.static(path.join(__dirname, '../client/build')));

app.ws('/', (ws, req) => {
  WebSocketHandler.setupConnection(ws);
});

app.use('/', apiRouter);

app.get('*', (req, res) => {
  const segments = req.path.split('/').filter(Boolean);
  const indexPath = path.join(__dirname, '../client/build', 'index.html');
  let is404 = false;
  if (segments.length > 1) {
    is404 = true;
  } else if (segments.length === 1) {
    const roomId = segments[0];
    const roomExists = !!DataStore.getRoomInfo(roomId);
    if (!roomExists) {
      is404 = true;
    }
  }
  if (is404) {
    send404Page(res);
  } else {
    res.sendFile(indexPath);
  }
});

setInterval(() => {
  try {
    DataStore.cleanupExpiredRooms(ROOM_EXPIRATION_TIME);
  } catch (_) { }
}, ROOM_CLEANUP_INTERVAL);

['SIGTERM', 'SIGINT'].forEach((sig) => {
  process.on(sig, () => process.exit(0));
});

app.listen(PORT, () => { });

module.exports = app;
