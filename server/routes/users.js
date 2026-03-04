// server/routes/users.js
const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { validateUsername, validateEmail } = require('../utils/auth');

const router = express.Router();

// Multer configuration for avatar uploads
const upload = multer({ 
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

/**
 * GET /api/users/me
 * Получить профиль текущего пользователя (уже есть в auth.js, но продублируем для полноты)
 */
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

/**
 * PUT /api/users/me
 * Обновить профиль (username, email)
 */
router.put('/me', authenticate, async (req, res) => {
  try {
    const { username, email } = req.body;
    const userId = req.user.userId;
    const updates = {};

    // Валидация и обновление username
    if (username !== undefined) {
      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return res.status(400).json({ error: usernameValidation.error });
      }
      // Проверка уникальности username (исключая текущего пользователя)
      const existingUser = await User.findByUsername(usernameValidation.username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.username = usernameValidation.username;
    }

    // Валидация и обновление email
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

    // Выполняем обновление в БД
    const updatedUser = await User.update(userId, updates);
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/users/me/avatar
 * Загрузить аватар
 */
router.post('/me/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Конвертируем буфер в base64 data URL
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Обновляем пользователя
    const updatedUser = await User.update(req.user.userId, { avatarUrl: dataUrl });

    res.json({ avatarUrl: updatedUser.avatar_url });
  } catch (error) {
    console.error('Avatar upload error:', error);
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/users/me/settings
 * Обновить настройки пользователя
 */
router.put('/me/settings', authenticate, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings must be an object' });
    }

    // Можно добавить валидацию структуры настроек, если нужно

    const updatedUser = await User.update(req.user.userId, { settings });
    res.json({ settings: updatedUser.settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/users/me/rooms
 * Получить список комнат, созданных пользователем
 */
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

/**
 * GET /api/users/me/favorites
 * Получить список избранных комнат
 */
router.get('/me/favorites', authenticate, async (req, res) => {
  try {
    const { pgPool } = require('../config/db');
    const query = `
      SELECT r.id, r.name, r.is_public AS "isPublic", r.has_password AS "hasPassword",
             r.last_activity AS "lastActivity", f.created_at AS "favoritedAt"
      FROM favorite_rooms f
      JOIN rooms r ON f.room_id = r.id
      WHERE f.user_id = $1 AND (r.is_deleted IS NOT TRUE OR r.is_deleted IS NULL)
      ORDER BY f.created_at DESC
    `;
    const result = await pgPool.query(query, [req.user.userId]);
    res.json({ favorites: result.rows });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/users/me/favorites/:roomId
 * Добавить комнату в избранное
 */
router.post('/me/favorites/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;
    const { pgPool } = require('../config/db');

    // Проверяем существование комнаты
    const roomCheck = await pgPool.query('SELECT id FROM rooms WHERE id = $1', [roomId]);
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Добавляем в избранное
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

/**
 * DELETE /api/users/me/favorites/:roomId
 * Удалить комнату из избранного
 */
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
