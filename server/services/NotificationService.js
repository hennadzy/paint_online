const { pgPool } = require('../config/db');
const WebSocketHandler = require('./WebSocketHandler');

class NotificationService {
  static formatRow(row) {
    return {
      id: row.id,
      type: row.type,
      actorId: row.actor_id,
      actorUsername: row.actor_username,
      actorAvatarUrl: row.actor_avatar_url,
      entityId: row.entity_id,
      entityTitle: row.entity_title,
      isRead: row.is_read,
      createdAt: typeof row.created_at === 'number'
        ? row.created_at
        : Number(row.created_at)
    };
  }

  static async createAndPush({ userId, type, actorId, entityId = null, entityTitle = null }) {
    if (userId === actorId) return null;

    const now = Date.now();
    const result = await pgPool.query(
      `INSERT INTO notifications (user_id, type, actor_id, entity_id, entity_title, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, false, $6)
       RETURNING id, user_id, type, actor_id, entity_id, entity_title, is_read, created_at`,
      [userId, type, actorId, entityId, entityTitle, now]
    );

    const actorRow = await pgPool.query(
      `SELECT username, avatar_url FROM users WHERE id = $1`,
      [actorId]
    );
    const actor = actorRow.rows[0] || {};

    const notification = this.formatRow({
      ...result.rows[0],
      actor_username: actor.username,
      actor_avatar_url: actor.avatar_url
    });

    WebSocketHandler.deliverNotificationToUser(userId, notification);
    return notification;
  }

  static async getNotifications(userId, limit = 20) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);
    const result = await pgPool.query(
      `SELECT n.id, n.type, n.actor_id, n.entity_id, n.entity_title, n.is_read, n.created_at,
              u.username AS actor_username, u.avatar_url AS actor_avatar_url
       FROM notifications n
       JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2`,
      [userId, safeLimit]
    );
    return result.rows.map(row => this.formatRow(row));
  }

  static async getUnreadCount(userId) {
    const result = await pgPool.query(
      `SELECT COUNT(*)::int AS count FROM notifications
       WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return result.rows[0]?.count || 0;
  }

  static async markRead(notificationId, userId) {
    const result = await pgPool.query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, userId]
    );
    return result.rows.length > 0;
  }

  static async markAllRead(userId) {
    await pgPool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  }
}

module.exports = NotificationService;
