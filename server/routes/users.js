const express = require('express');
const multer = require('multer');
const User = require('../models/User');
const Session = require('../models/Session');
const WebSocketHandler = require('../services/WebSocketHandler');
const FriendService = require('../services/FriendService');
const NotificationService = require('../services/NotificationService');
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

  if (username !== undefined && username !== null) {
    const shouldUpdateUsername = username.trim() !== '';
    
    if (shouldUpdateUsername) {
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
  }
    
  if (email !== undefined && email !== null) {
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
  await Session.deleteAllForUser(userId);
  WebSocketHandler.invalidateUserSockets(userId);
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

router.put('/me/bio', authenticate, asyncHandler(async (req, res) => {
  const { bio } = req.body;
  const { sanitizeUserBio } = require('../utils/security');
  const result = sanitizeUserBio(bio ?? '');

  if (result.error) {
    throw new ValidationError(result.error);
  }

  const updatedUser = await User.update(req.user.userId, { bio: result.bio });
  if (!updatedUser) {
    throw new NotFoundError('Пользователь не найден');
  }

  res.json({ bio: updatedUser.bio || '' });
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

  const meId = req.user.userId;
  const { pgPool } = require('../config/db');
  const query = `
    SELECT id, username, avatar_url, is_online, is_active, is_verified
    FROM users
    WHERE username ILIKE $1
      AND is_deleted IS NOT TRUE
      AND id <> $2
    ORDER BY is_online DESC, username ASC
    LIMIT 20
  `;
  const result = await pgPool.query(query, [`%${searchQuery.trim()}%`, meId]);

  const users = await Promise.all(
    result.rows.map(async (user) => {
      const friendshipStatus = await FriendService.getFriendshipStatus(meId, user.id);
      return {
        ...user,
        friendshipStatus: friendshipStatus.status
      };
    })
  );

  res.json(users);
}));

router.get('/messages/:userId', authenticate, asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId;
  validateUserId(targetUserId);

  const limit = req.query.limit != null ? parseInt(req.query.limit, 10) : 50;
  const before = req.query.before != null ? parseInt(req.query.before, 10) : null;

  const PersonalMessageStore = require('../services/PersonalMessageStore');
  const history = await PersonalMessageStore.getHistory(
    req.user.userId,
    targetUserId,
    limit,
    before
  );
  res.json(history);
}));

router.get('/contacts', authenticate, asyncHandler(async (req, res) => {
  const meId = req.user.userId;
  const { pgPool } = require('../config/db');

  const query = `
    WITH me_messages AS (
      SELECT
        pm.from_user_id,
        pm.to_user_id,
        pm.message,
        pm.timestamp,
        pm.delivered,
        pm.read,
        CASE
          WHEN pm.from_user_id = $1 THEN pm.to_user_id
          ELSE pm.from_user_id
        END AS other_user_id
      FROM personal_messages pm
      WHERE pm.from_user_id = $1 OR pm.to_user_id = $1
    ),
    last_per_other AS (
      SELECT
        other_user_id,
        MAX(timestamp) AS last_timestamp
      FROM me_messages
      WHERE other_user_id IS NOT NULL
      GROUP BY other_user_id
    ),
    undelivered_received AS (
      SELECT
        pm.from_user_id AS other_user_id,
        COUNT(*)::int AS undelivered_received_count
      FROM personal_messages pm
      WHERE pm.to_user_id = $1
        AND pm.delivered = false
      GROUP BY pm.from_user_id
    ),
    undelivered_sent AS (
      SELECT
        pm.to_user_id AS other_user_id,
        COUNT(*)::int AS undelivered_sent_count
      FROM personal_messages pm
      WHERE pm.from_user_id = $1
        AND pm.read = false
      GROUP BY pm.to_user_id
    )
    SELECT
      u.id,
      u.username,
      u.avatar_url,
      u.is_online,
      mm.message AS last_message,
      l.last_timestamp,
      COALESCE(ur.undelivered_received_count, 0) AS undelivered_received_count,
      COALESCE(us.undelivered_sent_count, 0) AS undelivered_sent_count
    FROM last_per_other l
    JOIN me_messages mm
      ON mm.other_user_id = l.other_user_id
     AND mm.timestamp = l.last_timestamp
    JOIN users u ON u.id = l.other_user_id
    LEFT JOIN undelivered_received ur ON ur.other_user_id = l.other_user_id
    LEFT JOIN undelivered_sent us ON us.other_user_id = l.other_user_id
    WHERE (u.is_deleted IS NOT TRUE OR u.is_deleted IS NULL)
    ORDER BY (COALESCE(ur.undelivered_received_count, 0) > 0) DESC,
             l.last_timestamp DESC NULLS LAST,
             u.username ASC
  `;

  const result = await pgPool.query(query, [meId]);

  res.json(
    result.rows.map(row => ({
      id: row.id,
      username: row.username,
      avatar_url: row.avatar_url,
      is_online: row.is_online,
      last_message: row.last_message,
      last_timestamp: typeof row.last_timestamp === 'number' 
        ? row.last_timestamp 
        : (row.last_timestamp ? new Date(row.last_timestamp).getTime() : 0),
      undelivered_received_count: row.undelivered_received_count,
      undelivered_sent_count: row.undelivered_sent_count
    }))
  );
}));

router.post('/messages/mark-delivered/:userId', authenticate, asyncHandler(async (req, res) => {
  const meId = req.user.userId;
  const fromUserId = req.params.userId;
  validateUserId(fromUserId);

  const PersonalMessageStore = require('../services/PersonalMessageStore');

  const pending = await PersonalMessageStore.getPendingMessages(meId);

  const toMark = pending
    .filter(m => String(m.from_user_id) === String(fromUserId))
    .map(m => m.id);

  await PersonalMessageStore.markDelivered(toMark);

  res.json({ marked: toMark.length });
}));

router.post('/messages/mark-read/:userId', authenticate, asyncHandler(async (req, res) => {
  const meId = req.user.userId;
  const fromUserId = req.params.userId;
  validateUserId(fromUserId);

  const PersonalMessageStore = require('../services/PersonalMessageStore');

  const toMark = await PersonalMessageStore.getIncomingUnreadMessageIds(fromUserId, meId);
  if (toMark.length > 0) {
    await PersonalMessageStore.markRead(toMark);

    const WebSocketHandler = require('../services/WebSocketHandler');
    WebSocketHandler.notifyPersonalMessagesRead(fromUserId, meId, toMark);
  }

  res.json({ marked: toMark.length });
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


router.get('/me/friends', authenticate, asyncHandler(async (req, res) => {
  const friends = await FriendService.getFriends(req.user.userId, req.query.q);
  res.json({ friends });
}));

router.get('/me/friend-requests/incoming', authenticate, asyncHandler(async (req, res) => {
  const requests = await FriendService.getIncomingRequests(req.user.userId);
  res.json({ requests });
}));

router.get('/me/friend-requests/outgoing', authenticate, asyncHandler(async (req, res) => {
  const requests = await FriendService.getOutgoingRequests(req.user.userId);
  res.json({ requests });
}));

router.get('/me/friend-requests/count', authenticate, asyncHandler(async (req, res) => {
  const count = await FriendService.getIncomingCount(req.user.userId);
  res.json({ count });
}));

router.get('/me/notifications', authenticate, asyncHandler(async (req, res) => {
  const notifications = await NotificationService.getNotifications(req.user.userId, req.query.limit);
  const unreadCount = await NotificationService.getUnreadCount(req.user.userId);
  res.json({ notifications, unreadCount });
}));

router.post('/me/notifications/:notificationId/read', authenticate, asyncHandler(async (req, res) => {
  const notificationId = parseInt(req.params.notificationId, 10);
  if (!Number.isFinite(notificationId)) {
    throw new ValidationError('Некорректный ID уведомления');
  }
  await NotificationService.markRead(notificationId, req.user.userId);
  const unreadCount = await NotificationService.getUnreadCount(req.user.userId);
  res.json({ unreadCount });
}));

router.post('/me/notifications/read-all', authenticate, asyncHandler(async (req, res) => {
  await NotificationService.markAllRead(req.user.userId);
  res.json({ unreadCount: 0 });
}));

router.get('/:id/friendship-status', authenticate, asyncHandler(async (req, res) => {
  validateUserId(req.params.id);
  const status = await FriendService.getFriendshipStatus(req.user.userId, req.params.id);
  res.json(status);
}));

router.post('/:id/friend-request', authenticate, asyncHandler(async (req, res) => {
  validateUserId(req.params.id);
  const result = await FriendService.sendFriendRequest(req.user.userId, req.params.id);
  res.json(result);
}));

router.delete('/:id/friend-request', authenticate, asyncHandler(async (req, res) => {
  validateUserId(req.params.id);
  const result = await FriendService.cancelFriendRequest(req.user.userId, req.params.id);
  res.json(result);
}));

router.post('/:id/friend-request/accept', authenticate, asyncHandler(async (req, res) => {
  validateUserId(req.params.id);
  const result = await FriendService.acceptFriendRequest(req.user.userId, req.params.id);
  res.json(result);
}));

router.post('/:id/friend-request/decline', authenticate, asyncHandler(async (req, res) => {
  validateUserId(req.params.id);
  const result = await FriendService.declineFriendRequest(req.user.userId, req.params.id);
  res.json(result);
}));

router.delete('/:id/friends', authenticate, asyncHandler(async (req, res) => {
  validateUserId(req.params.id);
  const result = await FriendService.removeFriend(req.user.userId, req.params.id);
  res.json(result);
}));

router.get('/:id', optionalPublicUser, asyncHandler(async (req, res) => {
  validateUserId(req.params.id);
  const user = await FriendService.getPublicUser(req.params.id);
  if (!user) {
    throw new NotFoundError('Пользователь не найден');
  }

  let friendshipStatus = { status: 'none' };
  if (req.user?.userId) {
    friendshipStatus = await FriendService.getFriendshipStatus(req.user.userId, req.params.id);
  }

  res.json({
    user: {
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      bio: user.bio || ''
    },
    friendshipStatus
  });
}));

function optionalPublicUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const { authenticate } = require('../middleware/auth');
  return authenticate(req, res, next);
}

module.exports = router;
