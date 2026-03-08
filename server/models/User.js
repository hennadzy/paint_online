const { pgPool } = require('../config/db');

class User {
  static async create(userData) {
    const { username, email, passwordHash } = userData;
    const now = Date.now();
    
    const query = `
      INSERT INTO users (username, email, password_hash, created_at, last_login, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, email, role, created_at, avatar_url, settings
    `;
    
    const values = [username, email, passwordHash, now, now, JSON.stringify({})];
    
    try {
      const result = await pgPool.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        if (error.constraint === 'users_username_key') {
          throw new Error('Username already exists');
        }
        if (error.constraint === 'users_email_key') {
          throw new Error('Email already exists');
        }
      }
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pgPool.query(query, [email]);
    return result.rows[0] || null;
  }

  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pgPool.query(query, [username]);
    return result.rows[0] || null;
  }

  static async findById(id) {
    const query = `
      SELECT id, username, email, role, created_at, last_login, avatar_url, settings, is_active
      FROM users WHERE id = $1
    `;
    const result = await pgPool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async updateLastLogin(id) {
    const query = 'UPDATE users SET last_login = $1 WHERE id = $2';
    await pgPool.query(query, [Date.now(), id]);
  }

  static async updateSettings(id, settings) {
    const query = 'UPDATE users SET settings = $1 WHERE id = $2 RETURNING settings';
    const result = await pgPool.query(query, [JSON.stringify(settings), id]);
    return result.rows[0]?.settings;
  }

  static async changePassword(id, newPasswordHash) {
    const query = 'UPDATE users SET password_hash = $1 WHERE id = $2';
    await pgPool.query(query, [newPasswordHash, id]);
  }

  static async update(id, fields) {
    const setClause = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(fields)) {
      const dbKey = key === 'username' ? 'username' :
                    key === 'email' ? 'email' :
                    key === 'avatarUrl' ? 'avatar_url' :
                    key === 'settings' ? 'settings' :
                    key === 'role' ? 'role' :
                    key === 'isActive' ? 'is_active' : null;
      if (dbKey) {
        setClause.push(`${dbKey} = $${index}`);
        values.push(value);
        index++;
      }
    }

    if (setClause.length === 0) return null;

    values.push(id);
    const query = `
      UPDATE users
      SET ${setClause.join(', ')}
      WHERE id = $${index}
      RETURNING id, username, email, role, created_at, last_login, avatar_url, settings, is_active
    `;

    const result = await pgPool.query(query, values);
    return result.rows[0] || null;
  }

  // Admin methods
  static async getAll(options = {}) {
    const { limit = 20, offset = 0, search = '', sortBy = 'created_at', sortOrder = 'DESC' } = options;
    
    let query = `
      SELECT id, username, email, role, created_at, last_login, avatar_url, settings, is_active
      FROM users
    `;
    const values = [];
    let paramIndex = 1;

    if (search) {
      query += ` WHERE username ILIKE $${paramIndex} OR email ILIKE $${paramIndex}`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    const validSortColumns = ['created_at', 'last_login', 'username', 'email', 'role'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await pgPool.query(query, values);
    return result.rows;
  }

  static async count(search = '') {
    let query = 'SELECT COUNT(*) as total FROM users';
    const values = [];

    if (search) {
      query += ' WHERE username ILIKE $1 OR email ILIKE $1';
      values.push(`%${search}%`);
    }

    const result = await pgPool.query(query, values);
    return parseInt(result.rows[0].total, 10);
  }

  static async delete(id) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await pgPool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async setActive(id, isActive) {
    const query = 'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, username, email, role, is_active';
    const result = await pgPool.query(query, [isActive, id]);
    return result.rows[0] || null;
  }

  static async setRole(id, role) {
    const query = 'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role, is_active';
    const result = await pgPool.query(query, [role, id]);
    return result.rows[0] || null;
  }

  static async findByIdFull(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pgPool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = User;
