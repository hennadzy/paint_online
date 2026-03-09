const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { validateUsername, validateEmail, validatePassword, hashPassword, verifyPassword } = require('../utils/auth');

const router = express.Router();

const upload = multer({ 
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me', authenticate, async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.userId;
    const updates = {};

    if (username !== undefined) {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return res.status(400).json({ error: usernameValidation.error });
      }
      const existingUser = await User.findByUsername(usernameValidation.username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.username = usernameValidation.username;
    }

    if (email !== undefined) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return res.status(400).json({ error: emailValidation.error });
      }
      const existingUser = await User.findByEmail(emailValidation.email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      updates.email = emailValidation.email;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedUser = await User.update(userId, updates);
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
    }
    const pwdValidation = validatePassword(newPassword);
    if (!pwdValidation.valid) {
      return res.status(400).json({ error: pwdValidation.error });
    }
    const userId = req.user.userId;
    const { pgPool } = require('../config/db');
    const row = await pgPool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (!row.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    const valid = await verifyPassword(currentPassword, row.rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }
    const newHash = await hashPassword(newPassword);
    await User.changePassword(userId, newHash);
    res.json({ message: 'Пароль изменён' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/me/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const maxSize = 5 * 1024 * 1024;
    if (req.file.size > maxSize) {
      return res.status(400).json({ error: 'File too large (maximum 5MB)' });
    }

    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    if (dataUrl.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large after encoding. Please use a smaller image.' });
    }

    const updatedUser = await User.update(req.user.userId, { avatarUrl: dataUrl });

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ avatarUrl: updatedUser.avatar_url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === '22001') {
      return res.status(400).json({ error: 'Image too large. Please use a smaller image (under 5MB).' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/me/settings', authenticate, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings must be an object' });
    }

    const updatedUser = await User.update(req.user.userId, { settings });
    res.json({ settings: updatedUser.settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me/rooms', authenticate, async (req, res) => {
  try {
    const { pgPool } = require('../config/db');
    const query = `
      SELECT id, name, is_public AS "isPublic", has_password AS "hasPassword", 
             created_at AS "createdAt", last_activity AS "lastActivity"
      FROM rooms
      WHERE owner_id = $1 AND (is_deleted IS NOT TRUE OR is_deleted IS NULL)
      ORDER BY last_activity DESC
    `;
    const result = await pgPool.query(query, [req.user.userId]);
    res.json({ rooms: result.rows });
  } catch (error) {
    console.error('Get user rooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me/activity-rooms', authenticate, async (req, res) => {
  try {
    const DataStore = require('../services/DataStore');
    const rooms = await DataStore.getUserActivityRooms(req.user.userId);
    res.json({ rooms });
  } catch (error) {
    console.error('Get activity rooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/me/favorites/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;
    const { pgPool } = require('../config/db');

    const roomCheck = await pgPool.query('SELECT id FROM rooms WHERE id = $1', [roomId]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await pgPool.query(
      'INSERT INTO favorite_rooms (user_id, room_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [userId, roomId, Date.now()]
    );

    res.json({ message: 'Added to favorites' });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/me/favorites/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;
    const { pgPool } = require('../config/db');

    await pgPool.query(
      'DELETE FROM favorite_rooms WHERE user_id = $1 AND room_id = $2',
      [userId, roomId]
    );

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
