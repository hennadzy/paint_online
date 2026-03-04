// server/models/User.js
const { pgPool } = require('../config/db');

class User {
  /**
   * Создать нового пользователя
   */
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
      if (error.code === '23505') { // unique violation
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

  /**
   * Найти пользователя по email
   */
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pgPool.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Найти пользователя по username
   */
  static async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await pgPool.query(query, [username]);
    return result.rows[0] || null;
  }

  /**
   * Найти пользователя по ID
   */
  static async findById(id) {
    const query = `
      SELECT id, username, email, role, created_at, last_login, avatar_url, settings, is_active
      FROM users WHERE id = $1
    `;
    const result = await pgPool.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Обновить время последнего входа
   */
  static async updateLastLogin(id) {
    const query = 'UPDATE users SET last_login = $1 WHERE id = $2';
    await pgPool.query(query, [Date.now(), id]);
  }

  /**
   * Обновить настройки пользователя
   */
  static async updateSettings(id, settings) {
    const query = 'UPDATE users SET settings = $1 WHERE id = $2 RETURNING settings';
    const result = await pgPool.query(query, [JSON.stringify(settings), id]);
    return result.rows[0]?.settings;
  }

  /**
   * Изменить пароль
   */
  static async changePassword(id, newPasswordHash) {
    const query = 'UPDATE users SET password_hash = $1 WHERE id = $2';
    await pgPool.query(query, [newPasswordHash, id]);
  }

  /**
   * Обновить данные пользователя
   * @param {string} id
   * @param {Object} fields - поля для обновления (username, email, avatar_url, settings и т.д.)
   * @returns {Promise<Object>} обновлённый пользователь (без пароля)
   */
  static async update(id, fields) {
    const setClause = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(fields)) {
      // Преобразуем имена полей из camelCase в snake_case для БД
      const dbKey = key === 'username' ? 'username' :
                    key === 'email' ? 'email' :
                    key === 'avatarUrl' ? 'avatar_url' :
                    key === 'settings' ? 'settings' : null;
      if (dbKey) {
        setClause.push(`${dbKey} = ${index}`);
        values.push(value);
        index++;
      }
    }

    if (setClause.length === 0) return null;

    values.push(id);
    const query = `
      UPDATE users
      SET ${setClause.join(', ')}
      WHERE id = ${index}
      RETURNING id, username, email, role, created_at, last_login, avatar_url, settings, is_active
    `;

    const result = await pgPool.query(query, values);
    return result.rows[0] || null;
  }
}

module.exports = User;
