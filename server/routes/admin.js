const express = require('express');
const User = require('../models/User');
const DataStore = require('../services/DataStore');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');
const { validateUsername, validateEmail, validatePassword, hashPassword } = require('../utils/auth');
const { pgPool } = require('../config/db');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(authenticate);
router.use(requireSuperAdmin);

// ==================== STATS ====================
router.get('/stats', async (req, res) => {
  try {
    // User stats
    const userStats = await pgPool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active THEN 1 END) as active_users,
        COUNT(CASE WHEN created_at > $1 THEN 1 END) as new_users_7d
      FROM users
    `, [Date.now() - 7 * 24 * 60 * 60 * 1000]);

    // Room stats
    const roomStats = await pgPool.query(`
      SELECT 
        COUNT(*) as total_rooms,
        COUNT(CASE WHEN is_public THEN 1 END) as public_rooms,
        COUNT(CASE WHEN has_password THEN 1 END) as private_rooms,
        COUNT(CASE WHEN last_activity > $1 THEN 1 END) as active_rooms_7d
      FROM rooms
    `, [Date.now() - 7 * 24 * 60 * 60 * 1000]);

    // Stroke stats
    const strokeStats = await pgPool.query(`
      SELECT COUNT(*) as total_strokes FROM strokes
    `);

    // Recent registrations
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
      recentRegistrations: recentUsers.rows
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== USERS ====================
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

    // Check if user exists
    const existingUser = await User.findByIdFull(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent changing own admin role
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
      if (!['user', 'admin', 'superadmin'].includes(role)) {
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

    // Prevent deleting yourself
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

    // Prevent deactivating yourself
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

// ==================== ROOMS ====================
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
    
    // For stroke_count and unique_users sorting, we need a subquery
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

    // Filter by is_public
    if (isPublic !== undefined) {
      query += (paramIndex === 1 ? ' WHERE' : ' AND') + ` r.is_public = $${paramIndex}`;
      values.push(isPublic === 'true');
      paramIndex++;
    }

    // Filter by has_password
    if (hasPassword !== undefined) {
      query += (paramIndex === 1 ? ' WHERE' : ' AND') + ` r.has_password = $${paramIndex}`;
      values.push(hasPassword === 'true');
      paramIndex++;
    }

    // Search by name
    if (search) {
      query += (paramIndex === 1 ? ' WHERE' : ' AND') + ` r.name ILIKE $${paramIndex}`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    const validSortColumns = ['created_at', 'last_activity', 'name', 'stroke_count', 'unique_users', 'weight'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'last_activity';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Handle weight sorting - use COALESCE to handle NULL values
    let orderByColumn = `r.${safeSortBy}`;
    if (safeSortBy === 'weight') {
      orderByColumn = 'COALESCE(r.weight, 0)';
    }

    // Get total count
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
        createdAt: r.created_at,
        lastActivity: r.last_activity,
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

    // Get additional stats
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

    // Calculate canvas size from strokes
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

    // Get or calculate weight
    let weight = room.weight || 0;
    if (!weight) {
      weight = await DataStore.calculateRoomWeight(req.params.id);
    }

    res.json({
      room: {
        ...room,
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

    // Delete all strokes first
    await pgPool.query('DELETE FROM strokes WHERE room_id = $1', [id]);
    await pgPool.query('DELETE FROM cancelled_strokes WHERE room_id = $1', [id]);
    await pgPool.query('DELETE FROM favorite_rooms WHERE room_id = $1', [id]);
    
    // Delete room
    await DataStore.deleteRoom(id);

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Admin delete room error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== JOIN ROOM (for admin) ====================
router.post('/rooms/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { username = 'Admin' } = req.body;

    const room = await DataStore.getRoomInfo(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Generate token for the admin to join
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

// ==================== EXPORT ====================
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
      createdAt: r.created_at,
      lastActivity: r.last_activity,
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

module.exports = router;
