const { pgPool } = require('../config/db');
const NotificationService = require('./NotificationService');

const PUBLIC_USER_FIELDS = `u.id, u.username, u.avatar_url, u.created_at, u.bio`;

class FriendService {
  static async getPublicUser(userId) {
    const result = await pgPool.query(
      `SELECT ${PUBLIC_USER_FIELDS}
       FROM users u
       WHERE u.id = $1 AND (u.is_deleted IS NOT TRUE OR u.is_deleted IS NULL)`,
      [userId]
    );
    return result.rows[0] || null;
  }

  static async getFriendshipStatus(viewerId, targetUserId) {
    if (!viewerId || viewerId === targetUserId) {
      return { status: 'self' };
    }

    const friends = await pgPool.query(
      `SELECT 1 FROM user_friends WHERE user_id = $1 AND friend_id = $2`,
      [viewerId, targetUserId]
    );
    if (friends.rows.length > 0) {
      return { status: 'friends' };
    }

    const outgoing = await pgPool.query(
      `SELECT id FROM friend_requests
       WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [viewerId, targetUserId]
    );
    if (outgoing.rows.length > 0) {
      return { status: 'pending_outgoing', requestId: outgoing.rows[0].id };
    }

    const incoming = await pgPool.query(
      `SELECT id FROM friend_requests
       WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [targetUserId, viewerId]
    );
    if (incoming.rows.length > 0) {
      return { status: 'pending_incoming', requestId: incoming.rows[0].id };
    }

    return { status: 'none' };
  }

  static async sendFriendRequest(fromUserId, toUserId) {
    if (fromUserId === toUserId) {
      throw new Error('Нельзя добавить себя в друзья');
    }

    const target = await this.getPublicUser(toUserId);
    if (!target) {
      throw new Error('Пользователь не найден');
    }

    const existingFriends = await pgPool.query(
      `SELECT 1 FROM user_friends WHERE user_id = $1 AND friend_id = $2`,
      [fromUserId, toUserId]
    );
    if (existingFriends.rows.length > 0) {
      throw new Error('Вы уже друзья');
    }

    const reversePending = await pgPool.query(
      `SELECT id FROM friend_requests
       WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [toUserId, fromUserId]
    );
    if (reversePending.rows.length > 0) {
      await this.acceptFriendRequest(fromUserId, toUserId);
      return { status: 'accepted', autoAccepted: true };
    }

    const existingOutgoing = await pgPool.query(
      `SELECT id FROM friend_requests
       WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [fromUserId, toUserId]
    );
    if (existingOutgoing.rows.length > 0) {
      throw new Error('Заявка уже отправлена');
    }

    await pgPool.query(
      `DELETE FROM friend_requests
       WHERE from_user_id = $1 AND to_user_id = $2 AND status IN ('declined', 'cancelled')`,
      [fromUserId, toUserId]
    );

    const now = Date.now();
    await pgPool.query(
      `INSERT INTO friend_requests (from_user_id, to_user_id, status, created_at, updated_at)
       VALUES ($1, $2, 'pending', $3, $3)
       ON CONFLICT (from_user_id, to_user_id)
       DO UPDATE SET status = 'pending', updated_at = $3`,
      [fromUserId, toUserId, now]
    );

    await NotificationService.createAndPush({
      userId: toUserId,
      type: 'friend_request',
      actorId: fromUserId
    });

    return { status: 'pending_outgoing' };
  }

  static async cancelFriendRequest(fromUserId, toUserId) {
    const result = await pgPool.query(
      `UPDATE friend_requests
       SET status = 'cancelled', updated_at = $3
       WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'
       RETURNING id`,
      [fromUserId, toUserId, Date.now()]
    );
    if (result.rows.length === 0) {
      throw new Error('Заявка не найдена');
    }
    return { cancelled: true };
  }

  static async acceptFriendRequest(userId, fromUserId) {
    const request = await pgPool.query(
      `SELECT id FROM friend_requests
       WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'`,
      [fromUserId, userId]
    );
    if (request.rows.length === 0) {
      throw new Error('Заявка не найдена');
    }

    const now = Date.now();
    await pgPool.query(
      `UPDATE friend_requests SET status = 'accepted', updated_at = $3
       WHERE from_user_id = $1 AND to_user_id = $2`,
      [fromUserId, userId, now]
    );

    await pgPool.query(
      `INSERT INTO user_friends (user_id, friend_id, created_at)
       VALUES ($1, $2, $3), ($2, $1, $3)
       ON CONFLICT DO NOTHING`,
      [userId, fromUserId, now]
    );

    await NotificationService.createAndPush({
      userId: fromUserId,
      type: 'friend_accepted',
      actorId: userId
    });

    return { status: 'friends' };
  }

  static async declineFriendRequest(userId, fromUserId) {
    const result = await pgPool.query(
      `UPDATE friend_requests
       SET status = 'declined', updated_at = $3
       WHERE from_user_id = $1 AND to_user_id = $2 AND status = 'pending'
       RETURNING id`,
      [fromUserId, userId, Date.now()]
    );
    if (result.rows.length === 0) {
      throw new Error('Заявка не найдена');
    }
    return { declined: true };
  }

  static async removeFriend(userId, friendId) {
    const result = await pgPool.query(
      `DELETE FROM user_friends
       WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
       RETURNING user_id`,
      [userId, friendId]
    );
    if (result.rows.length === 0) {
      throw new Error('Пользователь не в списке друзей');
    }
    return { removed: true };
  }

  static async getFriends(userId, searchQuery) {
    let query = `
      SELECT ${PUBLIC_USER_FIELDS}
      FROM user_friends uf
      JOIN users u ON u.id = uf.friend_id
      WHERE uf.user_id = $1
        AND (u.is_deleted IS NOT TRUE OR u.is_deleted IS NULL)
    `;
    const params = [userId];

    if (searchQuery && searchQuery.trim()) {
      params.push(`%${searchQuery.trim()}%`);
      query += ` AND u.username ILIKE $${params.length}`;
    }

    query += ' ORDER BY u.username ASC';
    const result = await pgPool.query(query, params);
    return result.rows;
  }

  static async getIncomingRequests(userId) {
    const result = await pgPool.query(
      `SELECT fr.id, fr.created_at,
              ${PUBLIC_USER_FIELDS.replace(/u\./g, 'u.')}
       FROM friend_requests fr
       JOIN users u ON u.id = fr.from_user_id
       WHERE fr.to_user_id = $1 AND fr.status = 'pending'
         AND (u.is_deleted IS NOT TRUE OR u.is_deleted IS NULL)
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async getOutgoingRequests(userId) {
    const result = await pgPool.query(
      `SELECT fr.id, fr.created_at,
              ${PUBLIC_USER_FIELDS.replace(/u\./g, 'u.')}
       FROM friend_requests fr
       JOIN users u ON u.id = fr.to_user_id
       WHERE fr.from_user_id = $1 AND fr.status = 'pending'
         AND (u.is_deleted IS NOT TRUE OR u.is_deleted IS NULL)
       ORDER BY fr.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  static async getIncomingCount(userId) {
    const result = await pgPool.query(
      `SELECT COUNT(*)::int AS count FROM friend_requests
       WHERE to_user_id = $1 AND status = 'pending'`,
      [userId]
    );
    return result.rows[0]?.count || 0;
  }

  static async getFriendIds(userId) {
    const result = await pgPool.query(
      `SELECT friend_id FROM user_friends WHERE user_id = $1`,
      [userId]
    );
    return result.rows.map(r => r.friend_id);
  }
}

module.exports = FriendService;
