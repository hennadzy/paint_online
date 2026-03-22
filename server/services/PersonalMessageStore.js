const { pgPool } = require('../config/db');

class PersonalMessageStore {
  async saveMessage(fromUserId, toUserId, message, timestamp) {
    try {
      const result = await pgPool.query(
        `INSERT INTO personal_messages (from_user_id, to_user_id, message, timestamp, delivered, created_at)
         VALUES ($1, $2, $3, $4, false, $5) RETURNING id`,
        [fromUserId, toUserId, message, timestamp || Date.now(), Date.now()]
      );
      return result.rows[0]?.id;
    } catch (error) {
      console.error('Error saving personal message:', error);
      return null;
    }
  }

  async getPendingMessages(userId) {
    try {
      const result = await pgPool.query(
        `SELECT pm.id, pm.from_user_id, pm.message, pm.timestamp,
                u.username AS from_username, u.avatar_url AS from_avatar
         FROM personal_messages pm
         JOIN users u ON u.id = pm.from_user_id
         WHERE pm.to_user_id = $1 AND pm.delivered = false
         ORDER BY pm.timestamp ASC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting pending messages:', error);
      return [];
    }
  }

  async markDelivered(messageIds) {
    if (!messageIds || messageIds.length === 0) return;
    try {
      await pgPool.query(
        `UPDATE personal_messages SET delivered = true WHERE id = ANY($1)`,
        [messageIds]
      );
    } catch (error) {
      console.error('Error marking messages as delivered:', error);
    }
  }

  async getHistory(userId1, userId2, limit = 100) {
    try {
      const result = await pgPool.query(
        `SELECT id, from_user_id, to_user_id, message, timestamp
         FROM personal_messages
         WHERE (from_user_id = $1 AND to_user_id = $2)
            OR (from_user_id = $2 AND to_user_id = $1)
         ORDER BY timestamp DESC
         LIMIT $3`,
        [userId1, userId2, limit]
      );
      return result.rows.reverse();
    } catch (error) {
      console.error('Error getting message history:', error);
      return [];
    }
  }
}

module.exports = new PersonalMessageStore();
