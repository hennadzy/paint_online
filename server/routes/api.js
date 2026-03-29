const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const DataStore = require('../services/DataStore');
const RoomManager = require('../services/RoomManager');
const { sanitizeInput, sanitizeUsername, validateUsername, generateId } = require('../utils/security');
const { generateToken } = require('../utils/jwt');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { pgPool } = require('../config/db');

const router = express.Router();

const MAX_ROOM_NAME_LENGTH = 20;
const BCRYPT_ROUNDS = 10;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const createRoomLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many rooms created from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const passwordVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many password attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const tokenRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many token requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

const imageSaveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many image saves, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});

router.post('/image', imageSaveLimiter, (req, res) => {
  const origin = req.headers.origin;
  if (process.env.NODE_ENV === 'production' ||
      origin === 'https://risovanie.online' ||
      origin === 'http://localhost:3000') {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

try {
    const id = sanitizeInput(String(req.query.id || ''), 50).replace(/[^a-zA-Z0-9_-]/g, '') || 'image';
    const img = req.body?.img;
    if (!img || typeof img !== 'string') {
      return res.status(400).json({ error: 'Invalid image data' });
    }
    const match = img.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid image format' });
    }
    const ext = match[1] === 'png' ? 'png' : 'jpg';
    const base64 = match[2];
    const filesDir = path.join(__dirname, '../files');
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }
    const filename = `${id}.${ext}`;
    const filepath = path.join(filesDir, filename);
    fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));
    res.json({ ok: true });
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/rooms', createRoomLimiter, optionalAuthenticate, async (req, res) => {
  try {
    const name = sanitizeInput(req.body.name, MAX_ROOM_NAME_LENGTH);
    const isPublic = Boolean(req.body.isPublic);
    const password = req.body.password ? sanitizeInput(req.body.password, 50) : null;

    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }

    const roomId = generateId();

    let hashedPassword = null;
    if (!isPublic && password) {
      hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    const ownerId = req.user ? req.user.userId : null;

    await DataStore.createRoom(roomId, {
      name,
      isPublic,
      hasPassword: !isPublic && !!password,
      passwordHash: hashedPassword,
      ownerId
    });

    res.json({ roomId });
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rooms/public', apiLimiter, async (req, res) => {
  try {
    const allRooms = await DataStore.getAllRooms();
    const filesDir = path.join(__dirname, '../files');
    
    const result = await Promise.all(allRooms.map(async room => {
      const onlineUsers = await RoomManager.getRoomUsers(room.id);
      const onlineCount = onlineUsers.length;
      let thumbnailUrl = null;
      if (room.isPublic) {
        const jpgPath = path.join(filesDir, `${room.id}.jpg`);
        const pngPath = path.join(filesDir, `${room.id}.png`);
        if (fs.existsSync(jpgPath)) {
          thumbnailUrl = `/files/${room.id}.jpg`;
        } else if (fs.existsSync(pngPath)) {
          thumbnailUrl = `/files/${room.id}.png`;
        }
      }
      return {
        id: room.id,
        name: room.name,
        isPublic: room.isPublic,
        hasPassword: room.hasPassword,
        lastActivity: room.lastActivity,
        onlineCount,
        thumbnailUrl,
        ownerId: room.ownerId || null
      };
    }));
    res.json(result);
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rooms/:id/exists', apiLimiter, async (req, res) => {
  try {
    const id = sanitizeInput(req.params.id, 20);
    const room = await DataStore.getRoomInfo(id);

    if (!room) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      hasPassword: room.hasPassword || false,
      name: room.name,
      ownerId: room.ownerId || null
    });
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/rooms/:id/verify-password', passwordVerifyLimiter, async (req, res) => {
  try {
    const id = sanitizeInput(req.params.id, 20);
    const password = req.body.password ? sanitizeInput(req.body.password, 50) : '';
    const room = await DataStore.getRoomInfo(id);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.hasPassword || !room.passwordHash) {
      return res.json({ valid: true });
    }

    const isValid = await bcrypt.compare(password, room.passwordHash);
    res.json({ valid: isValid });
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/rooms/:id/join-public', tokenRequestLimiter, async (req, res) => {
  try {
    const roomId = sanitizeInput(req.params.id, 20);

    if (!roomId) {
      return res.status(400).json({ error: 'ID комнаты не указан' });
    }

    const authHeader = req.headers.authorization;
    let isPrivileged = false;
    let authUserId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const Session = require('../models/Session');
      const session = await Session.findByToken(token);
      if (session) {
        authUserId = session.user_id;
        if (session.role === 'admin' || session.role === 'superadmin') {
          isPrivileged = true;
        }
      }
    }

    let username;
    if (isPrivileged) {
      if (req.body.username && req.body.username.trim().toLowerCase() === 'admin') {
        username = 'Admin';
      } else {
        username = sanitizeUsername(req.body.username || 'Admin');
        if (!username || username.trim().length < 2) username = 'Admin';
      }
    } else {
      const validation = validateUsername(req.body.username);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      username = sanitizeUsername(validation.username);
    }

    const room = await DataStore.getRoomInfo(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isPublic) {
      return res.status(403).json({ error: 'Room is private' });
    }

    const currentUsers = await RoomManager.getRoomUsers(roomId);
    if (currentUsers.length >= 10) {
      return res.status(403).json({ error: 'Достигнуто максимальное количество пользователей в комнате (10). Попробуйте позже.' });
    }

    const token = generateToken(roomId, username, true, isPrivileged ? 'admin' : 'user', authUserId);
    res.json({ token, username });
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/rooms/:id/join-private', tokenRequestLimiter, async (req, res) => {
  try {
    const roomId = sanitizeInput(req.params.id, 20);
    const password = req.body.password ? sanitizeInput(req.body.password, 50) : '';

    const authHeader = req.headers.authorization;
    let isPrivileged = false;
    let authUserId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const Session = require('../models/Session');
      const session = await Session.findByToken(token);
      if (session) {
        authUserId = session.user_id;
        if (session.role === 'admin' || session.role === 'superadmin') {
          isPrivileged = true;
        }
      }
    }

    if (!roomId) {
      return res.status(400).json({ error: 'ID комнаты не указан' });
    }

    const currentUsers = await RoomManager.getRoomUsers(roomId);
    if (currentUsers.length >= 10) {
      return res.status(403).json({ error: 'Достигнуто максимальное количество пользователей в комнате (10). Попробуйте позже.' });
    }

    let username;
    if (isPrivileged) {
      if (req.body.username && req.body.username.trim().toLowerCase() === 'admin') {
        username = 'Admin';
      } else {
        username = sanitizeUsername(req.body.username || 'Admin');
        if (!username || username.trim().length < 2) username = 'Admin';
      }
    } else {
      const validation = validateUsername(req.body.username);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      username = sanitizeUsername(validation.username);
    }

    const room = await DataStore.getRoomInfo(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.isPublic) {
      return res.status(400).json({ error: 'Use join-public for public rooms' });
    }

    if (!isPrivileged) {
      if (room.hasPassword && room.passwordHash) {
        const isValid = await bcrypt.compare(password, room.passwordHash);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid password' });
        }
      }
    }

    const token = generateToken(roomId, username, false, isPrivileged ? 'admin' : 'user', authUserId);
    res.json({ token, username });
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/rooms/:id', authenticate, async (req, res) => {
  try {
    const roomId = sanitizeInput(req.params.id, 20);
    const room = await DataStore.getRoomInfo(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isCreator = req.user && room.ownerId && String(room.ownerId) === String(req.user.userId);
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Только создатель комнаты может изменять её настройки' });
    }

    const { isPublic, password } = req.body;
    const updates = {};
    if (typeof isPublic === 'boolean') {
      updates.isPublic = isPublic;
      updates.hasPassword = !isPublic;
      updates.passwordHash = null;
    }
    if (password !== undefined && !updates.isPublic) {
      const pwd = password ? sanitizeInput(password, 50) : null;
      updates.hasPassword = !!pwd;
      updates.passwordHash = pwd ? await bcrypt.hash(pwd, BCRYPT_ROUNDS) : null;
    }

    if (Object.keys(updates).length > 0) {
      await DataStore.updateRoomVisibility(roomId, updates);
    }
    const updated = await DataStore.getRoomInfo(roomId);
    res.json({ room: updated });
  } catch (err) {
    console.error('Update room error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/coloring-pages', apiLimiter, async (req, res) => {
  try {
    const result = await pgPool.query(
      `SELECT id, title, image_url, thumbnail_url, created_at
       FROM coloring_pages
       WHERE is_active = true
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get coloring pages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Public endpoint: serve coloring page image from DB (persistent across restarts)
router.get('/coloring-pages/image/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const result = await pgPool.query(
      `SELECT image_data FROM coloring_pages WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageData = result.rows[0].image_data;
    const match = imageData.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) {
      return res.status(500).json({ error: 'Invalid image data' });
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(buffer);
  } catch (error) {
    console.error('Get coloring page image error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/rooms/:id', authenticate, async (req, res) => {
  try {
    const roomId = sanitizeInput(req.params.id, 20);
    const room = await DataStore.getRoomInfo(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const isCreator = req.user && room.ownerId && String(room.ownerId) === String(req.user.userId);
    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'superadmin');
    if (!isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Только создатель комнаты может удалить её' });
    }

    await DataStore.deleteRoom(roomId);
    res.json({ message: 'Room deleted successfully' });
  } catch (err) {
    console.error('Delete room error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
