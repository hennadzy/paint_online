const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const DataStore = require('../services/DataStore');
const { sanitizeInput, generateId } = require('../utils/security');

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
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rooms/public', apiLimiter, (req, res) => {
  try {
    const publicRooms = DataStore.getPublicRooms();
    res.json(publicRooms);
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
