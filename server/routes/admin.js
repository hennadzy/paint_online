const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/User');
const DataStore = require('../services/DataStore');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { validateUsername, validateEmail, validatePassword, hashPassword } = require('../utils/auth');
const { pgPool } = require('../config/db');
const bcrypt = require('bcrypt');
const validator = require('validator');
const { generateToken } = require('../utils/jwt');
const PersonalMessageStore = require('../services/PersonalMessageStore');
const MailService = require('../services/MailService');
const WebSocketHandler = require('../services/WebSocketHandler');
const { sanitizeBroadcastSubject, sanitizeBroadcastBody } = require('../utils/security');
const RoleCapabilitiesService = require('../services/RoleCapabilitiesService');

const MAX_BROADCAST_RECIPIENTS = 2000;
const MAX_BROADCAST_SELECTED = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const router = express.Router();


const coloringUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Только изображения JPEG, PNG, GIF и WebP разрешены'));
    }
  }
});

const validateImageFile = (buffer, mimetype) => {
  if (!buffer || buffer.length < 4) return false;
  
  const signatures = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'image/webp': [0x52, 0x49, 0x46, 0x46] 
  };
  
  const expected = signatures[mimetype];
  if (!expected) return false;
  
  for (let i = 0; i < expected.length; i++) {
    if (buffer[i] !== expected[i]) return false;
  }
  
  if (mimetype === 'image/webp') {
    if (buffer.length < 12) return false;
    const webpSignature = buffer.toString('ascii', 8, 12);
    if (webpSignature !== 'WEBP') return false;
  }
  
  return true;
};

router.use(authenticate);
router.use(requireSuperAdmin);

const toEpochMs = (value) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return null;
    if (/^\d+(\.\d+)?$/.test(s)) {
      const n = Number(s);
      if (!Number.isFinite(n) || n <= 0) return null;
      return n < 1e12 ? n * 1000 : n;
    }
    const parsed = Date.parse(s);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1e12 ? n * 1000 : n;
};

router.get('/stats', async (req, res) => {
  try {
    const userStats = await pgPool.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active THEN 1 END) as active_users,
        COUNT(CASE WHEN created_at > $1 THEN 1 END) as new_users_7d
      FROM users
    `, [Date.now() - 7 * 24 * 60 * 60 * 1000]);

    const roomStats = await pgPool.query(`
      SELECT
        COUNT(*) as total_rooms,
        COUNT(CASE WHEN is_public THEN 1 END) as public_rooms,
        COUNT(CASE WHEN has_password THEN 1 END) as private_rooms,
        COUNT(CASE WHEN last_activity > $1 THEN 1 END) as active_rooms_7d
      FROM rooms
    `, [Date.now() - 7 * 24 * 60 * 60 * 1000]);

    const strokeStats = await pgPool.query(`
      SELECT COUNT(*) as total_strokes FROM strokes
    `);

    const recentUsers = await pgPool.query(`
      SELECT id, username, email, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 5
    `);

    res.json({
      users: {
        total: parseInt(userStats.rows[0].total_users, 10),
        active: parseInt(userStats.rows[0].active_users, 10),
        new7d: parseInt(userStats.rows[0].new_users_7d, 10)
      },
      rooms: {
        total: parseInt(roomStats.rows[0].total_rooms, 10),
        public: parseInt(roomStats.rows[0].public_rooms, 10),
        private: parseInt(roomStats.rows[0].private_rooms, 10),
        active7d: parseInt(roomStats.rows[0].active_rooms_7d, 10)
      },
      strokes: {
        total: parseInt(strokeStats.rows[0].total_strokes, 10)
      },
      recentRegistrations: recentUsers.rows.map(u => ({
        ...u,
        created_at: toEpochMs(u.created_at)
      }))
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'created_at', sortOrder = 'DESC', role, isActive } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const users = await User.getAll({
      limit: parseInt(limit, 10),
      offset,
      search,
      sortBy,
      sortOrder,
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined
    });

    const total = await User.count(search, { role, isActive: isActive !== undefined ? isActive === 'true' : undefined });

    res.json({
      users,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdFull(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, isActive } = req.body;

    const existingUser = await User.findByIdFull(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (id === req.user.userId && existingUser.role === 'superadmin' && role !== 'superadmin') {
      return res.status(400).json({ error: 'Cannot change your own superadmin role' });
    }

    const updates = {};

    if (username !== undefined) {
      const validation = validateUsername(username);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      const duplicate = await User.findByUsername(validation.username);
      if (duplicate && duplicate.id !== id) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updates.username = validation.username;
    }

    if (email !== undefined) {
      const validation = validateEmail(email);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      const duplicate = await User.findByEmail(validation.email);
      if (duplicate && duplicate.id !== id) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      updates.email = validation.email;
    }

    if (role !== undefined) {
      if (!['user', 'premium', 'admin', 'superadmin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      updates.role = role;
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedUser = await User.update(id, updates);
    res.json({ user: updatedUser });
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const deleted = await User.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }

    const user = await User.findByIdFull(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await User.setActive(id, !user.is_active);
    res.json({ user: updated, message: updated.is_active ? 'User activated' : 'User deactivated' });
  } catch (error) {
    console.error('Admin toggle user active error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/users/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password required' });
    }

    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const passwordHash = await hashPassword(newPassword);
    await User.changePassword(id, passwordHash);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Admin change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rooms', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sortBy = 'last_activity', sortOrder = 'DESC', isPublic, hasPassword } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT
        r.id, r.name, r.is_public, r.has_password, r.created_at, r.last_activity, r.weight,
        (SELECT COUNT(*) FROM strokes WHERE room_id = r.id) as stroke_count,
        (SELECT COUNT(DISTINCT username) FROM strokes WHERE room_id = r.id) as unique_users
      FROM rooms r
    `;

    let countSubquery = '';
    if (sortBy === 'stroke_count' || sortBy === 'unique_users') {
      query = `
        SELECT
          r.id, r.name, r.is_public, r.has_password, r.created_at, r.last_activity, r.weight,
          COALESCE(s.stroke_count, 0) as stroke_count,
          COALESCE(s.unique_users, 0) as unique_users
        FROM rooms r
        LEFT JOIN (
          SELECT
            room_id,
            COUNT(*) as stroke_count,
            COUNT(DISTINCT username) as unique_users
          FROM strokes
          GROUP BY room_id
        ) s ON r.id = s.room_id
      `;
    }

    const values = [];
    let paramIndex = 1;

    if (isPublic !== undefined) {
      query += (paramIndex === 1 ? ' WHERE' : ' AND') + ` r.is_public = $${paramIndex}`;
      values.push(isPublic === 'true');
      paramIndex++;
    }

    if (hasPassword !== undefined) {
      query += (paramIndex === 1 ? ' WHERE' : ' AND') + ` r.has_password = $${paramIndex}`;
      values.push(hasPassword === 'true');
      paramIndex++;
    }

    if (search) {
      query += (paramIndex === 1 ? ' WHERE' : ' AND') + ` r.name ILIKE $${paramIndex}`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    const sortColumnMap = {
      'created_at': 'r.created_at',
      'last_activity': 'r.last_activity',
      'name': 'r.name',
      'stroke_count': 'COALESCE(s.stroke_count, 0)::INTEGER',
      'unique_users': 'COALESCE(s.unique_users, 0)::INTEGER',
      'weight': 'COALESCE(r.weight, 0)',
      'is_public': 'r.is_public',
      'has_password': 'r.has_password'
    };
    
    const safeSortBy = sortColumnMap[sortBy] || 'r.last_activity';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    let orderByColumn = safeSortBy;

    let countQuery = 'SELECT COUNT(*) as total FROM rooms';
    const countValues = [];
    let countParamIndex = 1;

    if (isPublic !== undefined) {
      countQuery += (countParamIndex === 1 ? ' WHERE' : ' AND') + ` is_public = $${countParamIndex}`;
      countValues.push(isPublic === 'true');
      countParamIndex++;
    }
    if (hasPassword !== undefined) {
      countQuery += (countParamIndex === 1 ? ' WHERE' : ' AND') + ` has_password = $${countParamIndex}`;
      countValues.push(hasPassword === 'true');
      countParamIndex++;
    }
    if (search) {
      countQuery += (countParamIndex === 1 ? ' WHERE' : ' AND') + ` name ILIKE $${countParamIndex}`;
      countValues.push(`%${search}%`);
    }

    const countResult = await pgPool.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].total, 10);

    query += ` ORDER BY ${orderByColumn} ${safeSortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(parseInt(limit, 10), offset);

    const rooms = await pgPool.query(query, values);

    res.json({
      rooms: rooms.rows.map(r => ({
        id: r.id,
        name: r.name,
        isPublic: r.is_public,
        hasPassword: r.has_password,
        createdAt: toEpochMs(r.created_at),
        lastActivity: toEpochMs(r.last_activity),
        strokeCount: parseInt(r.stroke_count, 10),
        uniqueUsers: parseInt(r.unique_users, 10),
        weight: parseInt(r.weight || 0, 10)
      })),
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Admin get rooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/rooms/:id', async (req, res) => {
  try {
    const room = await DataStore.getRoomInfo(req.params.id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const strokeCount = await pgPool.query(
      'SELECT COUNT(*) as count FROM strokes WHERE room_id = $1',
      [req.params.id]
    );

    const uniqueUsers = await pgPool.query(
      'SELECT COUNT(DISTINCT username) as count FROM strokes WHERE room_id = $1',
      [req.params.id]
    );

    const strokesData = await pgPool.query(
      'SELECT stroke_data FROM strokes WHERE room_id = $1 LIMIT 100',
      [req.params.id]
    );

    let maxX = 0, maxY = 0;
    for (const row of strokesData.rows) {
      try {
        const data = typeof row.stroke_data === 'string' ? JSON.parse(row.stroke_data) : row.stroke_data;
        if (data && data.points) {
          for (const p of data.points) {
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
          }
        }
      } catch (e) {}
    }

    let weight = room.weight || 0;
    if (!weight) {
      weight = await DataStore.calculateRoomWeight(req.params.id);
    }

    res.json({
      room: {
        ...room,
        createdAt: toEpochMs(room.createdAt),
        lastActivity: toEpochMs(room.lastActivity),
        strokeCount: parseInt(strokeCount.rows[0].count, 10),
        uniqueUsers: parseInt(uniqueUsers.rows[0].count, 10),
        canvasWidth: Math.ceil(maxX + 50),
        canvasHeight: Math.ceil(maxY + 50),
        weight
      }
    });
  } catch (error) {
    console.error('Admin get room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const room = await DataStore.getRoomInfo(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const sanitizedName = name.trim().substring(0, 100);

    await pgPool.query(
      'UPDATE rooms SET name = $1 WHERE id = $2',
      [sanitizedName, id]
    );

    res.json({ message: 'Room updated successfully', room: { ...room, name: sanitizedName } });
  } catch (error) {
    console.error('Admin update room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const room = await DataStore.getRoomInfo(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    await DataStore.deleteRoom(id);

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Admin delete room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/rooms/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { username = 'Admin' } = req.body;

    const room = await DataStore.getRoomInfo(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const token = generateToken(id, username, false);

    res.json({
      token,
      roomId: id,
      roomName: room.name,
      isPrivate: !room.isPublic,
      hasPassword: room.hasPassword
    });
  } catch (error) {
    console.error('Admin join room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/users', async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const users = await User.getAll({ limit: 10000, offset: 0 });

    if (format === 'csv') {
      const headers = 'ID,Username,Email,Role,Active,Created At,Last Login';
      const rows = users.map(u =>
        `${u.id},"${u.username}","${u.email}",${u.role},${u.is_active},${new Date(u.created_at).toISOString()},${u.last_login ? new Date(u.last_login).toISOString() : ''}`
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
      res.send([headers, ...rows].join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=users.json');
      res.json(users);
    }
  } catch (error) {
    console.error('Admin export users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export/rooms', async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const rooms = await pgPool.query(`
      SELECT
        r.id, r.name, r.is_public, r.has_password, r.created_at, r.last_activity,
        (SELECT COUNT(*) FROM strokes WHERE room_id = r.id) as stroke_count,
        (SELECT COUNT(DISTINCT username) FROM strokes WHERE room_id = r.id) as unique_users
      FROM rooms r
      ORDER BY r.last_activity DESC
      LIMIT 1000
    `);

    const roomsData = rooms.rows.map(r => ({
      id: r.id,
      name: r.name,
      isPublic: r.is_public,
      hasPassword: r.has_password,
      createdAt: r.created_at ? new Date(r.created_at).getTime() : null,
      lastActivity: r.last_activity ? new Date(r.last_activity).getTime() : null,
      strokeCount: parseInt(r.stroke_count, 10),
      uniqueUsers: parseInt(r.unique_users, 10)
    }));

    if (format === 'csv') {
      const headers = 'ID,Name,Public,Has Password,Created At,Last Activity,Stroke Count,Unique Users';
      const rows = roomsData.map(r =>
        `${r.id},"${r.name}",${r.isPublic},${r.hasPassword},${new Date(r.createdAt).toISOString()},${new Date(r.lastActivity).toISOString()},${r.strokeCount},${r.uniqueUsers}`
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=rooms.csv');
      res.send([headers, ...rows].join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=rooms.json');
      res.json(roomsData);
    }
  } catch (error) {
    console.error('Admin export rooms error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});



router.get('/game-modes/coloring', async (req, res) => {
  try {
    const result = await pgPool.query(
      'SELECT * FROM coloring_pages ORDER BY created_at DESC'
    );
    res.json({ pages: result.rows });
  } catch (error) {
    console.error('Get coloring pages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/game-modes/coloring', coloringUpload.single('image'), async (req, res) => {
  try {
    const { title, alt } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Название обязательно' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Изображение обязательно' });
    }

    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Изображение слишком большое (макс 10MB)' });
    }

    if (!validateImageFile(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ error: 'Неверный формат изображения' });
    }

    const imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;


    const finalAlt = (alt && typeof alt === 'string' ? alt.trim() : '').substring(0, 200);
    const insertResult = await pgPool.query(
      `INSERT INTO coloring_pages (title, alt, image_url, thumbnail_url, image_data, created_at, is_active)
       VALUES ($1, $2, '', '', $3, $4, true) RETURNING id`,
      [title.trim().substring(0, 100), finalAlt || null, imageData, Date.now()]
    );

    const id = insertResult.rows[0].id;
    const imageUrl = `/coloring-pages/image/${id}`;

    const finalResult = await pgPool.query(
      `UPDATE coloring_pages SET image_url = $1, thumbnail_url = $2 WHERE id = $3 RETURNING *`,
      [imageUrl, imageUrl, id]
    );

    res.json({ page: finalResult.rows[0] });
  } catch (error) {
    console.error('Upload coloring page error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/game-modes/coloring/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { title, isActive, alt } = req.body;

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
      setClauses.push(`title = $${idx++}`);
      values.push(title.trim().substring(0, 100));
    }
    if (isActive !== undefined) {
      setClauses.push(`is_active = $${idx++}`);
      values.push(Boolean(isActive));
    }
    if (alt !== undefined) {
      const finalAlt = (alt && typeof alt === 'string' ? alt.trim() : '').substring(0, 200);
      setClauses.push(`alt = $${idx++}`);
      values.push(finalAlt || null);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'Нет полей для обновления' });
    }

    values.push(id);
    const result = await pgPool.query(
      `UPDATE coloring_pages SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Раскраска не найдена' });
    }

    res.json({ page: result.rows[0] });
  } catch (error) {
    console.error('Update coloring page error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/game-modes/coloring/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const existing = await pgPool.query(
      'SELECT * FROM coloring_pages WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Раскраска не найдена' });
    }

    const page = existing.rows[0];


    if (page.image_url && page.image_url.startsWith('/files/')) {
      const filename = path.basename(page.image_url);
      const filepath = path.join(__dirname, '../files', filename);
      if (fs.existsSync(filepath)) {
        try { fs.unlinkSync(filepath); } catch (_) {}
      }
    }

    await pgPool.query('DELETE FROM coloring_pages WHERE id = $1', [id]);

    res.json({ message: 'Раскраска удалена' });
  } catch (error) {
    console.error('Delete coloring page error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/gallery/pending', async (req, res) => {
  try {
    const result = await pgPool.query(
      `SELECT
         gd.id,
         gd.title,
         gd.status,
         gd.likes_count,
         gd.created_at,
         gd.alt,
         COALESCE(gd.author_name, u.username) AS author_name,
         u.id AS author_id
       FROM gallery_drawings gd
       JOIN users u ON u.id = gd.user_id
       WHERE gd.status = 'pending'
       ORDER BY gd.created_at ASC`
    );
    res.json({ drawings: result.rows });
  } catch (error) {
    console.error('Admin get pending gallery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/gallery/approved', async (req, res) => {
  try {
    const result = await pgPool.query(
      `SELECT
         gd.id,
         gd.title,
         gd.status,
         gd.likes_count,
         gd.created_at,
         gd.approved_at,
         gd.alt,
         COALESCE(gd.author_name, u.username) AS author_name,
         u.id AS author_id
       FROM gallery_drawings gd
       JOIN users u ON u.id = gd.user_id
       WHERE gd.status = 'approved'
       ORDER BY gd.approved_at DESC NULLS LAST, gd.created_at DESC`
    );
    res.json({ drawings: result.rows });
  } catch (error) {
    console.error('Admin get approved gallery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/gallery/image/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const result = await pgPool.query(
      `SELECT image_data FROM gallery_drawings WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageData = result.rows[0].image_data;
    const match = imageData.match(/^data:image\/(jpeg|png|gif|webp);base64,(.+)$/s);
    if (!match) {
      return res.status(500).json({ error: 'Invalid image data' });
    }

    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'no-cache');
    
    const origin = req.headers.origin;
    const allowedOrigins = ['https://risovanie.online', 'http://localhost:3000', 'https://paint-online-back.onrender.com'];
    if (!origin || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
    }
    
    res.send(buffer);
  } catch (error) {
    console.error('Admin get gallery image error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/gallery/:id/approve', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const drawing = await pgPool.query(
      `SELECT gd.id, gd.title, gd.user_id, gd.status FROM gallery_drawings gd WHERE gd.id = $1`,
      [id]
    );

    if (drawing.rows.length === 0) {
      return res.status(404).json({ error: 'Рисунок не найден' });
    }

    if (drawing.rows[0].status === 'approved') {
      return res.status(400).json({ error: 'Рисунок уже одобрен' });
    }

    await pgPool.query(
      `UPDATE gallery_drawings SET status = 'approved', approved_at = $1 WHERE id = $2`,
      [Date.now(), id]
    );

    const adminId = req.user.userId;
    const userId = drawing.rows[0].user_id;
    const title = drawing.rows[0].title;

    try {
      await PersonalMessageStore.saveMessage(
        adminId,
        userId,
        `✅ Ваш рисунок «${title}» одобрен и опубликован в галерее! Посмотреть его можно на странице Галерея работ.`,
        Date.now()
      );
    } catch (msgErr) {
      console.error('Failed to send approval message:', msgErr);
    }

    res.json({ message: 'Рисунок одобрен и опубликован в галерее' });
  } catch (error) {
    console.error('Admin approve gallery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/gallery/:id/reject', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const { reason } = req.body;

    const drawing = await pgPool.query(
      `SELECT gd.id, gd.title, gd.user_id, gd.status FROM gallery_drawings gd WHERE gd.id = $1`,
      [id]
    );

    if (drawing.rows.length === 0) {
      return res.status(404).json({ error: 'Рисунок не найден' });
    }

    await pgPool.query(
      `UPDATE gallery_drawings SET status = 'rejected' WHERE id = $1`,
      [id]
    );

    const adminId = req.user.userId;
    const userId = drawing.rows[0].user_id;
    const title = drawing.rows[0].title;
    const reasonText = reason && reason.trim() ? ` Причина: ${reason.trim()}` : '';

    try {
      await PersonalMessageStore.saveMessage(
        adminId,
        userId,
        `❌ Ваш рисунок «${title}» не был допущен к публикации в галерее.${reasonText}`,
        Date.now()
      );
    } catch (msgErr) {
      console.error('Failed to send rejection message:', msgErr);
    }

    res.json({ message: 'Рисунок отклонён' });
  } catch (error) {
    console.error('Admin reject gallery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/gallery/:id/rename', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const { title } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Введите название' });
    }

    const trimmedTitle = title.trim().substring(0, 20);

    const result = await pgPool.query(
      `UPDATE gallery_drawings SET title = $1 WHERE id = $2 RETURNING id, title`,
      [trimmedTitle, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Рисунок не найден' });
    }

    res.json({ message: 'Название обновлено', drawing: result.rows[0] });
  } catch (error) {
    console.error('Admin rename gallery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/gallery/:id/alt', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const { alt } = req.body;
    const finalAlt = (alt && typeof alt === 'string' ? alt.trim() : '').substring(0, 200);

    const result = await pgPool.query(
      `UPDATE gallery_drawings SET alt = $1 WHERE id = $2 RETURNING id, alt`,
      [finalAlt || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Рисунок не найден' });
    }

    res.json({ message: 'Alt обновлён', drawing: result.rows[0] });
  } catch (error) {
    console.error('Admin update gallery alt error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/gallery/:id/author-name', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const { authorName } = req.body;
    if (authorName !== undefined && (typeof authorName !== 'string' || authorName.trim().length === 0)) {
      return res.status(400).json({ error: 'Введите имя автора' });
    }

    const finalAuthorName = (authorName && typeof authorName === 'string' ? authorName.trim() : '').substring(0, 50);

    const result = await pgPool.query(
      `UPDATE gallery_drawings SET author_name = $1 WHERE id = $2 RETURNING id, author_name`,
      [finalAuthorName || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Рисунок не найден' });
    }

    res.json({ message: 'Имя автора обновлено', drawing: result.rows[0] });
  } catch (error) {
    console.error('Admin update gallery author-name error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/gallery/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const result = await pgPool.query(
      `DELETE FROM gallery_drawings WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Рисунок не найден' });
    }

    res.json({ message: 'Рисунок удалён' });
  } catch (error) {
    console.error('Admin delete gallery error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/broadcast/mail-status', async (req, res) => {
  try {
    res.json({ configured: MailService.isConfigured() });
  } catch (error) {
    console.error('Admin mail status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/broadcast', async (req, res) => {
  try {
    const { channels = {}, scope, userIds, filters = {}, subject, body } = req.body;
    const sendEmail = !!channels.email;
    const sendDm = !!channels.dm;

    if (!sendEmail && !sendDm) {
      return res.status(400).json({ error: 'Выберите хотя бы один канал: email или личные сообщения' });
    }

    const dmText = sanitizeBroadcastBody(typeof body === 'string' ? body : '', 15000);
    if (!dmText) {
      return res.status(400).json({ error: 'Введите текст сообщения' });
    }

    let emailSubject = '';
    if (sendEmail) {
      emailSubject = sanitizeBroadcastSubject(typeof subject === 'string' ? subject : '');
      if (!emailSubject) {
        return res.status(400).json({ error: 'Укажите тему письма для рассылки по email' });
      }
      if (!MailService.isConfigured()) {
        return res.status(503).json({
          error: 'Почта не настроена на сервере: нужны SMTP_HOST и адрес отправителя (MAIL_FROM / EMAIL_FROM или SMTP_USER), при необходимости SMTP_PASS.'
        });
      }
    }

    const onlyActive = filters.onlyActive !== false;

    let recipients = [];
    if (scope === 'selected') {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: 'Укажите список получателей (userIds)' });
      }
      if (userIds.length > MAX_BROADCAST_SELECTED) {
        return res.status(400).json({ error: `Не более ${MAX_BROADCAST_SELECTED} получателей за один раз` });
      }
      const uniq = [...new Set(userIds.map((id) => String(id).trim()).filter(Boolean))];
      const uuidList = uniq.filter((id) => UUID_RE.test(id));
      if (uuidList.length === 0) {
        return res.status(400).json({ error: 'Некорректные идентификаторы пользователей' });
      }
      const result = await pgPool.query(
        `SELECT id, email, username FROM users
         WHERE id = ANY($1::uuid[]) AND (is_deleted IS NOT TRUE OR is_deleted IS NULL)`,
        [uuidList]
      );
      recipients = result.rows;
    } else if (scope === 'all') {
      let q = `SELECT id, email, username FROM users WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)`;
      const vals = [];
      if (onlyActive) {
        q += ` AND is_active IS NOT FALSE`;
      }
      const result = await pgPool.query(q, vals);
      recipients = result.rows;
      if (recipients.length > MAX_BROADCAST_RECIPIENTS) {
        return res.status(400).json({
          error: `Слишком много получателей (${recipients.length}). Максимум ${MAX_BROADCAST_RECIPIENTS} за запрос. Включите фильтр «только активные» или выберите пользователей вручную.`
        });
      }
    } else {
      return res.status(400).json({ error: 'Укажите scope: all или selected' });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'Нет подходящих получателей' });
    }

    const adminId = req.user.userId;
    const adminRow = await pgPool.query('SELECT username FROM users WHERE id = $1', [adminId]);
    const adminUsername = adminRow.rows[0]?.username || 'Администратор';

    const stats = {
      recipientCount: recipients.length,
      dmSaved: 0,
      dmDeliveredLive: 0,
      dmFailed: 0,
      emailSent: 0,
      emailFailed: 0,
      emailSkippedNoAddress: 0
    };

    for (const row of recipients) {
      if (sendDm) {
        try {
          const ts = Date.now();
          const msgId = await PersonalMessageStore.saveMessage(adminId, row.id, dmText, ts);
          if (msgId) {
            stats.dmSaved++;
            const delivered = await WebSocketHandler.deliverPersonalMessageToUser(
              row.id,
              adminId,
              adminUsername,
              dmText,
              ts,
              msgId
            );
            if (delivered) stats.dmDeliveredLive++;
          } else {
            stats.dmFailed++;
          }
        } catch (e) {
          console.error('Broadcast DM error:', e);
          stats.dmFailed++;
        }
      }

      if (sendEmail) {
        if (!row.email || !validator.isEmail(row.email)) {
          stats.emailSkippedNoAddress++;
        } else {
          try {
            await MailService.sendTextEmail({
              to: row.email,
              subject: emailSubject,
              text: dmText
            });
            stats.emailSent++;
          } catch (e) {
            console.error('Broadcast email error:', e);
            stats.emailFailed++;
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      }
    }

    res.json({ ok: true, ...stats });
  } catch (error) {
    console.error('Admin broadcast error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/capabilities', async (req, res) => {
  try {
    const config = await RoleCapabilitiesService.getConfig();
    res.json(RoleCapabilitiesService.getAdminPayload(config));
  } catch (error) {
    console.error('Admin capabilities get error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/capabilities', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const incoming = body.config && typeof body.config === 'object' ? body.config : body;
    const saved = await RoleCapabilitiesService.saveConfig(incoming);
    res.json(RoleCapabilitiesService.getAdminPayload(saved));
  } catch (error) {
    console.error('Admin capabilities put error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
