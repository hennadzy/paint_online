const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const DataStore = require('./services/DataStore');
const WebSocketHandler = require('./services/WebSocketHandler');
const apiRouter = require('./routes/api');

const app = express();
const WSServer = require('express-ws')(app);
const PORT = process.env.PORT || 5000;

const ROOM_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const ROOM_EXPIRATION_TIME = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Middleware: Redirect www to non-www
 */
app.use((req, res, next) => {
  const host = req.get('host');
  if (host === 'www.risovanie.online') {
    return res.redirect(301, `https://risovanie.online${req.url}`);
  }
  next();
});

/**
 * Security: Helmet configuration
 */
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
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false
}));

/**
 * CORS configuration
 */
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://risovanie.online',
      'https://www.risovanie.online',
      'http://localhost:3000'
    ];
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'production' && origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 86400
}));

/**
 * Body parser
 */
app.use(express.json({ limit: '5mb' }));

/**
 * Static files
 */
app.use(express.static(path.join(__dirname, '../client/build')));

/**
 * WebSocket endpoint
 */
app.ws('/', (ws, req) => {
  WebSocketHandler.setupConnection(ws);
});

/**
 * API routes
 */
app.use('/', apiRouter);

/**
 * Catch-all route for SPA
 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

/**
 * Cleanup timer for expired rooms
 */
setInterval(() => {
  try {
    DataStore.cleanupExpiredRooms(ROOM_EXPIRATION_TIME);
  } catch (error) {
    console.error('Error during room cleanup:', error);
  }
}, ROOM_CLEANUP_INTERVAL);

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
