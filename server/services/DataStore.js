// server/services/DataStore.js
const { pgPool } = require('../config/db');

class DataStore {
  /**
   * Получить информацию о комнате по ID
   * @param {string} roomId
   * @returns {Promise<Object|null>}
   */
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
          last_activity AS "lastActivity" 
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

  /**
   * Создать новую комнату
   * @param {string} roomId
   * @param {Object} data - { name, isPublic, hasPassword, passwordHash }
   */
  async createRoom(roomId, data) {
    const { name, isPublic, hasPassword, passwordHash } = data;
    const now = Date.now();
    try {
      await pgPool.query(
        `INSERT INTO rooms 
         (id, name, is_public, has_password, password_hash, created_at, last_activity)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [roomId, name, isPublic, hasPassword, passwordHash, now, now]
      );
      return true;
    } catch (error) {
      console.error('createRoom error:', error);
      return false;
    }
  }

  /**
   * Обновить время последней активности комнаты
   * @param {string} roomId
   */
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

  /**
   * Удалить комнату и все её штрихи (каскадно)
   * @param {string} roomId
   */
  async deleteRoom(roomId) {
    try {
      await pgPool.query('DELETE FROM rooms WHERE id = $1', [roomId]);
      return true;
    } catch (error) {
      console.error('deleteRoom error:', error);
      return false;
    }
  }

  /**
   * Сохранить один штрих в БД
   * @param {string} roomId
   * @param {Object} stroke
   */
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

  /**
   * Сохранить несколько штрихов (для пакетной вставки)
   * @param {string} roomId
   * @param {Array} strokes
   */
  async saveStrokes(roomId, strokes) {
    if (!strokes.length) return true;
    try {
      const values = strokes.map(s => [
        roomId,
        s,
        s.username || 'unknown',
        Date.now()
      ]);
      // Используем параметризованный запрос для нескольких строк
      const placeholders = values.map((_, i) => `($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`).join(',');
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

  /**
   * Загрузить все штрихи комнаты (упорядоченные по времени создания)
   * @param {string} roomId
   * @returns {Promise<Array>}
   */
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

  /**
   * Удалить все штрихи комнаты
   * @param {string} roomId
   */
  async deleteStrokes(roomId) {
    try {
      await pgPool.query('DELETE FROM strokes WHERE room_id = $1', [roomId]);
      return true;
    } catch (error) {
      console.error('deleteStrokes error:', error);
      return false;
    }
  }

  /**
   * Получить список всех комнат (для списка публичных комнат)
   * @returns {Promise<Array>}
   */
  async getAllRooms() {
    try {
      const res = await pgPool.query(
        `SELECT 
          id, 
          name, 
          is_public AS "isPublic", 
          has_password AS "hasPassword", 
          last_activity AS "lastActivity" 
         FROM rooms 
         ORDER BY last_activity DESC`
      );
      return res.rows;
    } catch (error) {
      console.error('getAllRooms error:', error);
      return [];
    }
  }

  /**
   * Очистить старые неактивные комнаты
   * @param {number} expirationTime - время в мс, после которого комната удаляется
   */
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
