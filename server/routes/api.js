const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const DataStore = require('../services/DataStore');
const RoomManager = require('../services/RoomManager');
const { sanitizeInput, sanitizeUsername, validateUsername, generateId } = require('../utils/security');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

const MAX_ROOM_NAME_LENGTH = 100;
const BCRYPT_ROUNDS = 10;

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const createRoomLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many rooms created from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many password attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const tokenRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many token requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const imageSaveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many image saves, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/image', imageSaveLimiter, (req, res) => {
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

router.post('/rooms', createRoomLimiter, async (req, res) => {
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
    
    DataStore.createRoom(roomId, {
      name,
      isPublic,
      hasPassword: !isPublic && !!password,
      passwordHash: hashedPassword
    });
    
    res.json({ roomId });
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rooms/public', apiLimiter, (req, res) => {
  try {
    const publicRooms = DataStore.getPublicRooms();
    const filesDir = path.join(__dirname, '../files');
    const result = publicRooms.map(room => {
      const onlineCount = RoomManager.getRoomUsers(room.id).length;
      // Показываем превью только для публичных комнат
      let thumbnailUrl = null;
      if (room.isPublic) {
        const thumbPath = path.join(filesDir, `${room.id}.jpg`);
        if (fs.existsSync(thumbPath)) {
          thumbnailUrl = `/files/${room.id}.jpg`;
        }
      }
      return {
        id: room.id,
        name: room.name,
        isPublic: room.isPublic,
        hasPassword: room.hasPassword,
        lastActivity: room.lastActivity,
        onlineCount,
        thumbnailUrl
      };
    });
    res.json(result);
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rooms/:id/exists', apiLimiter, (req, res) => {
  try {
    const id = sanitizeInput(req.params.id, 20);
    const room = DataStore.getRoomInfo(id);
    
    if (!room) {
      return res.json({ exists: false });
    }
    
    res.json({ 
      exists: true,
      hasPassword: room.hasPassword || false,
      name: room.name
    });
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/rooms/:id/verify-password', passwordVerifyLimiter, async (req, res) => {
  try {
    const id = sanitizeInput(req.params.id, 20);
    const password = req.body.password ? sanitizeInput(req.body.password, 50) : '';
    const room = DataStore.getRoomInfo(id);
    
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

router.post('/rooms/:id/join-public', tokenRequestLimiter, (req, res) => {
  try {
    const roomId = sanitizeInput(req.params.id, 20);
    
    if (!roomId) {
      return res.status(400).json({ error: 'ID комнаты не указан' });
    }
    
    const validation = validateUsername(req.body.username);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const username = sanitizeUsername(validation.username);
    
    const room = DataStore.getRoomInfo(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (!room.isPublic) {
      return res.status(403).json({ error: 'Room is private' });
    }
    
    const token = generateToken(roomId, username, true);
    res.json({ token });
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/rooms/:id/join-private', tokenRequestLimiter, async (req, res) => {
  try {
    const roomId = sanitizeInput(req.params.id, 20);
    const password = req.body.password ? sanitizeInput(req.body.password, 50) : '';
    
    if (!roomId) {
      return res.status(400).json({ error: 'ID комнаты не указан' });
    }
    
    const validation = validateUsername(req.body.username);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }
    
    const username = sanitizeUsername(validation.username);
    
    const room = DataStore.getRoomInfo(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (room.isPublic) {
      return res.status(400).json({ error: 'Use join-public for public rooms' });
    }
    
    if (room.hasPassword && room.passwordHash) {
      const isValid = await bcrypt.compare(password, room.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }
    
    const token = generateToken(roomId, username, false);
    res.json({ token });
  } catch (_) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
