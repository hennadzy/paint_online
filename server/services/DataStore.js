const { pgPool } = require('../config/db');

class DataStore {
  async getRoomInfo(roomId) {
    try {
      const res = await pgPool.query(
        `SELECT 
          id, 
          name, 
          is_public AS "isPublic", 
          has_password AS "hasPassword", 
          password_hash AS "passwordHash", 
          created_at AS "createdAt", 
          last_activity AS "lastActivity",
          weight,
          owner_id AS "ownerId"
         FROM rooms 
         WHERE id = $1`,
        [roomId]
      );
      return res.rows[0] || null;
    } catch (error) {
      console.error('getRoomInfo error:', error);
      return null;
    }
  }

  async createRoom(roomId, data) {
    const { name, isPublic, hasPassword, passwordHash, ownerId } = data;
    const now = Date.now();
    try {
      await pgPool.query(
        `INSERT INTO rooms 
         (id, name, is_public, has_password, password_hash, created_at, last_activity, owner_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [roomId, name, isPublic, hasPassword, passwordHash, now, now, ownerId || null]
      );
      return true;
    } catch (error) {
      console.error('createRoom error:', error);
      return false;
    }
  }

  async updateRoomActivity(roomId) {
    try {
      await pgPool.query(
        'UPDATE rooms SET last_activity = $1 WHERE id = $2',
        [Date.now(), roomId]
      );
      return true;
    } catch (error) {
      console.error('updateRoomActivity error:', error);
      return false;
    }
  }

async deleteRoom(roomId) {
    try {
      await pgPool.query('DELETE FROM strokes WHERE room_id = $1', [roomId]);
      await pgPool.query('DELETE FROM cancelled_strokes WHERE room_id = $1', [roomId]);
      await pgPool.query('DELETE FROM favorite_rooms WHERE room_id = $1', [roomId]);
      await pgPool.query('DELETE FROM user_room_activity WHERE room_id = $1', [roomId]);
      await pgPool.query('DELETE FROM rooms WHERE id = $1', [roomId]);
      return true;
    } catch (error) {
      console.error('deleteRoom error:', error);
      return false;
    }
  }

  async updateRoomVisibility(roomId, { isPublic, hasPassword, passwordHash }) {
    try {
      const updates = [];
      const values = [roomId];
      let paramIndex = 2;
      if (isPublic !== undefined) {
        updates.push(`is_public = $${paramIndex++}`);
        values.push(isPublic);
      }
      if (hasPassword !== undefined) {
        updates.push(`has_password = $${paramIndex++}`);
        values.push(hasPassword);
      }
      if (passwordHash !== undefined) {
        updates.push(`password_hash = $${paramIndex++}`);
        values.push(passwordHash);
      }
      if (updates.length === 0) return true;
      await pgPool.query(
        `UPDATE rooms SET ${updates.join(', ')} WHERE id = $1`,
        values
      );
      return true;
    } catch (error) {
      console.error('updateRoomVisibility error:', error);
      return false;
    }
  }

  async recordUserRoomActivity(userId, roomId) {
    try {
      const now = Date.now();
      await pgPool.query(
        `INSERT INTO user_room_activity (user_id, room_id, last_activity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, room_id) DO UPDATE SET last_activity = $3`,
        [userId, roomId, now]
      );
      return true;
    } catch (error) {
      console.error('recordUserRoomActivity error:', error);
      return false;
    }
  }

  async getUserActivityRooms(userId) {
    try {
      const res = await pgPool.query(
        `SELECT r.id, r.name, r.is_public AS "isPublic", r.has_password AS "hasPassword",
                r.last_activity AS "lastActivity", r.owner_id AS "ownerId", a.last_activity AS "activityAt"
         FROM user_room_activity a
         JOIN rooms r ON r.id = a.room_id
         WHERE a.user_id = $1 AND (r.is_deleted IS NOT TRUE OR r.is_deleted IS NULL)
         ORDER BY a.last_activity DESC`,
        [userId]
      );
      return res.rows;
    } catch (error) {
      console.error('getUserActivityRooms error:', error);
      return [];
    }
  }

  async updateRoomWeight(roomId, weight) {
    try {
      await pgPool.query(
        'UPDATE rooms SET weight = $1 WHERE id = $2',
        [weight, roomId]
      );
      return true;
    } catch (error) {
      console.error('updateRoomWeight error:', error);
      return false;
    }
  }

  async calculateRoomWeight(roomId) {
    try {
      const result = await pgPool.query(
        `SELECT SUM(LENGTH(stroke_data::text)) as total_weight 
         FROM strokes 
         WHERE room_id = $1`,
        [roomId]
      );
      const weight = parseInt(result.rows[0]?.total_weight || 0, 10);
      await this.updateRoomWeight(roomId, weight);
      return weight;
    } catch (error) {
      console.error('calculateRoomWeight error:', error);
      return 0;
    }
  }

  async saveStroke(roomId, stroke) {
    try {
      await pgPool.query(
        'INSERT INTO strokes (room_id, stroke_data, username, created_at) VALUES ($1, $2, $3, $4)',
        [roomId, stroke, stroke.username || 'unknown', Date.now()]
      );
      return true;
    } catch (error) {
      console.error('saveStroke error:', error);
      return false;
    }
  }

 async saveStrokes(roomId, strokes) {
 if (!strokes.length) return true;
 try {
 // Фильтруем дубликаты по ID штриха
 const existingIds = new Set();
 const newStrokes = [];
      
 for (const s of strokes) {
 if (s.id && !existingIds.has(s.id)) {
 existingIds.add(s.id);
 newStrokes.push(s);
 }
 }
      
 if (newStrokes.length ===0) return true;
      
 const values = newStrokes.map(s => [
 roomId,
 s,
 s.username || 'unknown',
 Date.now()
 ]);
 const placeholders = values.map((_, i) => `($$i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`).join(',');
 const flatValues = values.flat();
 await pgPool.query(
 `INSERT INTO strokes (room_id, stroke_data, username, created_at) VALUES ${placeholders}`,
 flatValues
 );
 return true;
 } catch (error) {
 console.error('saveStrokes error:', error);
 return false;
 }
 }

async loadStrokes(roomId) {
    try {
      const res = await pgPool.query(
        'SELECT stroke_data FROM strokes WHERE room_id = $1 ORDER BY created_at',
        [roomId]
      );
      return res.rows.map(row => row.stroke_data);
    } catch (error) {
      console.error('loadStrokes error:', error);
      return [];
    }
  }

  async deleteStrokes(roomId) {
    try {
      await pgPool.query('DELETE FROM strokes WHERE room_id = $1', [roomId]);
      return true;
    } catch (error) {
      console.error('deleteStrokes error:', error);
      return false;
    }
  }

  async saveCancelledStrokes(roomId, username, strokes) {
    if (!strokes.length) return true;
    try {
      await pgPool.query(
        'DELETE FROM cancelled_strokes WHERE room_id = $1 AND username = $2',
        [roomId, username]
      );
      
      const values = strokes.map(s => [
        roomId,
        s,
        username,
        Date.now()
      ]);
      const placeholders = values.map((_, i) => `($1, $2, $3, $4)`).join(',');
      const flatValues = [];
      for (let i = 0; i < strokes.length; i++) {
        flatValues.push(roomId, strokes[i], username, Date.now());
      }
      await pgPool.query(
        `INSERT INTO cancelled_strokes (room_id, stroke_data, username, created_at) VALUES ${placeholders}`,
        flatValues
      );
      return true;
    } catch (error) {
      console.error('saveCancelledStrokes error:', error);
      return false;
    }
  }

async loadCancelledStrokes(roomId, username) {
    try {
      const res = await pgPool.query(
        'SELECT stroke_data FROM cancelled_strokes WHERE room_id = $1 AND username = $2 ORDER BY created_at',
        [roomId, username]
      );
      return res.rows.map(row => row.stroke_data);
    } catch (error) {
      console.error('loadCancelledStrokes error:', error);
      return [];
    }
  }

  async loadAllCancelledStrokes(roomId) {
    try {
      const res = await pgPool.query(
        'SELECT username, stroke_data FROM cancelled_strokes WHERE room_id = $1 ORDER BY created_at',
        [roomId]
      );
      const grouped = {};
      for (const row of res.rows) {
        if (!grouped[row.username]) grouped[row.username] = [];
        grouped[row.username].push(row.stroke_data);
      }
      return grouped;
    } catch (error) {
      console.error('loadAllCancelledStrokes error:', error);
      return {};
    }
  }

  async getAllRooms() {
    try {
      const res = await pgPool.query(
        `SELECT 
          id, 
          name, 
          is_public AS "isPublic", 
          has_password AS "hasPassword", 
          last_activity AS "lastActivity",
          owner_id AS "ownerId"
         FROM rooms 
         WHERE (is_deleted IS NOT TRUE OR is_deleted IS NULL)
         ORDER BY last_activity DESC`
      );
      return res.rows;
    } catch (error) {
      console.error('getAllRooms error:', error);
      return [];
    }
  }

  async cleanupExpiredRooms(expirationTime) {
    try {
      const cutoff = Date.now() - expirationTime;
      await pgPool.query('DELETE FROM rooms WHERE last_activity < $1', [cutoff]);
      return true;
    } catch (error) {
      console.error('cleanupExpiredRooms error:', error);
      return false;
    }
  }
}

module.exports = new DataStore();
