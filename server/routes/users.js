const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { validateUsername, validateEmail, validatePassword, hashPassword, verifyPassword } = require('../utils/auth');
const { asyncHandler, ValidationError, AuthError, NotFoundError, ForbiddenError } = require('../utils/errorHandler');

const router = express.Router();

const validateUserId = (userId) => {
  if (!userId || typeof userId !== 'string' && typeof userId !== 'number') {
    throw new ValidationError('Некорректный ID пользователя');
  }
  
  if (typeof userId === 'string' && !/^[a-zA-Z0-9-_]+$/.test(userId)) {
    throw new ValidationError('ID пользователя содержит недопустимые символы');
  }
  
  return true;
};

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    throw new NotFoundError('Пользователь не найден');
  }
  
  const { password_hash, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
}));

router.put('/me', authenticate, asyncHandler(async (req, res) => {
  const { username, email } = req.body;
  const userId = req.user.userId;
  validateUserId(userId);
  
  const updates = {};

  if (username !== undefined) {
    if (typeof username !== 'string' || username.length < 3 || username.length > 20) {
      throw new ValidationError('Имя пользователя должно содержать от 3 до 20 символов');
    }
    
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      throw new ValidationError(usernameValidation.error);
    }
    
    const existingUser = await User.findByUsername(usernameValidation.username);
    if (existingUser && existingUser.id !== userId) {
      throw new ValidationError('Это имя пользователя уже занято');
    }
    
    updates.username = usernameValidation.username;
  }

  if (email !== undefined) {
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      throw new ValidationError(emailValidation.error);
    }
    
    const existingUser = await User.findByEmail(emailValidation.email);
    if (existingUser && existingUser.id !== userId) {
      throw new ValidationError('Этот email уже зарегистрирован');
    }
    
    updates.email = emailValidation.email;
  }

  if (Object.keys(updates).length === 0) {
    throw new ValidationError('Нет полей для обновления');
  }

  const updatedUser = await User.update(userId, updates);
  
  const { password_hash, ...userWithoutPassword } = updatedUser;
  res.json({ user: userWithoutPassword });
}));

router.put('/me/password', authenticate, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ValidationError('Текущий и новый пароль обязательны');
  }
  
  const pwdValidation = validatePassword(newPassword);
  if (!pwdValidation.valid) {
    throw new ValidationError(pwdValidation.error);
  }
  
  const userId = req.user.userId;
  const { pgPool } = require('../config/db');
  const row = await pgPool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  
  if (!row.rows.length) {
    throw new NotFoundError('User not found');
  }
  
  const valid = await verifyPassword(currentPassword, row.rows[0].password_hash);
  if (!valid) {
    throw new AuthError('Неверный текущий пароль');
  }
  
  const newHash = await hashPassword(newPassword);
  await User.changePassword(userId, newHash);
  res.json({ message: 'Пароль изменён' });
}));

router.post('/me/avatar', authenticate, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  const maxSize = 5 * 1024 * 1024;
  if (req.file.size > maxSize) {
    throw new ValidationError('File too large (maximum 5MB)');
  }

  const base64 = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype;
  const dataUrl = `data:${mimeType};base64,${base64}`;

  if (dataUrl.length > 10 * 1024 * 1024) {
    throw new ValidationError('Image too large after encoding. Please use a smaller image.');
  }

  const updatedUser = await User.update(req.user.userId, { avatarUrl: dataUrl });

  if (!updatedUser) {
    throw new NotFoundError('User not found');
  }

  res.json({ avatarUrl: updatedUser.avatar_url });
}));

router.put('/me/settings', authenticate, asyncHandler(async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    throw new ValidationError('Settings must be an object');
  }

  const updatedUser = await User.update(req.user.userId, { settings });
  if (!updatedUser) {
    throw new NotFoundError('User not found');
  }
  
  res.json({ settings: updatedUser.settings });
}));

router.get('/me/rooms', authenticate, asyncHandler(async (req, res) => {
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
}));

router.get('/me/activity-rooms', authenticate, asyncHandler(async (req, res) => {
  const DataStore = require('../services/DataStore');
  const rooms = await DataStore.getUserActivityRooms(req.user.userId);
  res.json({ rooms });
}));

router.get('/active', authenticate, asyncHandler(async (req, res) => {
  const { pgPool } = require('../config/db');
  const query = `
    SELECT id, username, avatar_url, is_online, is_active, is_verified
    FROM users
    WHERE is_active IS NOT FALSE AND is_deleted IS NOT TRUE
    ORDER BY is_online DESC, username ASC
    LIMIT 50
  `;
  const result = await pgPool.query(query, []);
  res.json(result.rows);
}));

router.get('/search', authenticate, asyncHandler(async (req, res) => {
  const searchQuery = req.query.q;
  if (!searchQuery || searchQuery.trim().length < 2) {
    return res.json([]);
  }

  const { pgPool } = require('../config/db');
  const query = `
    SELECT id, username, avatar_url, is_online, is_active, is_verified
    FROM users
    WHERE username ILIKE $1 AND is_deleted IS NOT TRUE
    ORDER BY is_online DESC, username ASC
    LIMIT 20
  `;
  const result = await pgPool.query(query, [`%${searchQuery}%`]);
  res.json(result.rows);
}));

router.get('/messages/:userId', authenticate, asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId;
  validateUserId(targetUserId);
  
  const PersonalMessageStore = require('../services/PersonalMessageStore');
  const history = await PersonalMessageStore.getHistory(req.user.userId, targetUserId);
  res.json(history);
}));

router.post('/messages', authenticate, asyncHandler(async (req, res) => {
  const { toUserId, message, timestamp } = req.body;
  
  if (!toUserId) {
    throw new ValidationError('ID получателя обязателен');
  }
  validateUserId(toUserId);
  
  if (!message || typeof message !== 'string') {
    throw new ValidationError('Сообщение обязательно и должно быть строкой');
  }

  const { sanitizeChatMessage } = require('../utils/security');
  const sanitized = sanitizeChatMessage(message);
  if (!sanitized || sanitized.trim().length === 0) {
    throw new ValidationError('Сообщение пусто после санитизации');
  }

  const { pgPool } = require('../config/db');
  const recipientCheck = await pgPool.query(
    'SELECT id, username FROM users WHERE id = $1 AND is_deleted IS NOT TRUE',
    [toUserId]
  );
  if (recipientCheck.rows.length === 0) {
    throw new NotFoundError('Получатель не найден');
  }

  const PersonalMessageStore = require('../services/PersonalMessageStore');
  const ts = timestamp || Date.now();
  const fromUserId = req.user.userId;

  const senderRow = await pgPool.query('SELECT username FROM users WHERE id = $1', [fromUserId]);
  const fromUsername = senderRow.rows[0]?.username || fromUserId;

  const msgId = await PersonalMessageStore.saveMessage(fromUserId, toUserId, sanitized, ts);

  const WebSocketHandler = require('../services/WebSocketHandler');
  await WebSocketHandler.deliverPersonalMessageToUser(
    toUserId, fromUserId, fromUsername, sanitized, ts, msgId
  );

  res.json({
    id: msgId,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    message: sanitized,
    timestamp: ts
  });
}));

router.post('/me/favorites/:roomId', authenticate, asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  if (!roomId || typeof roomId !== 'string') {
    throw new ValidationError('Некорректный ID комнаты');
  }
  
  const userId = req.user.userId;
  const { pgPool } = require('../config/db');

  const roomCheck = await pgPool.query('SELECT id FROM rooms WHERE id = $1', [roomId]);
  if (roomCheck.rows.length === 0) {
    throw new NotFoundError('Комната не найдена');
  }

  await pgPool.query(
    'INSERT INTO favorite_rooms (user_id, room_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [userId, roomId, Date.now()]
  );

  res.json({ message: 'Добавлено в избранное' });
}));

router.delete('/me/favorites/:roomId', authenticate, asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  if (!roomId || typeof roomId !== 'string') {
    throw new ValidationError('Некорректный ID комнаты');
  }
  
  const userId = req.user.userId;
  const { pgPool } = require('../config/db');

  await pgPool.query(
    'DELETE FROM favorite_rooms WHERE user_id = $1 AND room_id = $2',
    [userId, roomId]
  );

  res.json({ message: 'Удалено из избранного' });
}));

module.exports = router;
