const { pgPool } = require('../config/db');
const crypto = require('crypto');

class Session {
  static async create(userId, token, ipAddress, userAgent) {
    const id = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + (7 * 24 * 60 * 60 * 1000);
    
    const query = `
      INSERT INTO sessions (id, user_id, token, expires_at, created_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const result = await pgPool.query(query, [id, userId, token, expiresAt, now, ipAddress, userAgent]);
    return result.rows[0].id;
  }

  static async findByToken(token) {
    const query = `
      SELECT s.*, u.id as user_id, u.username, u.role, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = $1 AND s.expires_at > $2
    `;
    const result = await pgPool.query(query, [token, Date.now()]);
    return result.rows[0] || null;
  }

  static async delete(token) {
    const query = 'DELETE FROM sessions WHERE token = $1';
    await pgPool.query(query, [token]);
  }

  static async deleteAllForUser(userId) {
    const query = 'DELETE FROM sessions WHERE user_id = $1';
    await pgPool.query(query, [userId]);
  }

  static async cleanExpired() {
    const query = 'DELETE FROM sessions WHERE expires_at < $1';
    await pgPool.query(query, [Date.now()]);
  }
}

module.exports = Session;
