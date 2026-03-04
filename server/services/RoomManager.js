const { redis } = require('../config/db');
const DataStore = require('./DataStore');

class RoomManager {
  constructor() {
    this.roomSockets = new Map();
  }

  async addUser(roomId, username, ws) {
    const userCount = await redis.scard(`room:${roomId}:users`);
    if (userCount >= 10) {
      throw new Error('Room is full');
    }

    const wsId = this._getWsId(ws);

    const multi = redis.multi();
    multi.sadd(`room:${roomId}:users`, username);
    multi.hset(`ws:${wsId}`, 'roomId', roomId, 'username', username, 'lastActivity', Date.now());
    multi.set(`user:${username}:room`, roomId);
    await multi.exec();

    await DataStore.updateRoomActivity(roomId);

    if (!this.roomSockets.has(roomId)) {
      this.roomSockets.set(roomId, new Set());
    }
    this.roomSockets.get(roomId).add(ws);

    const strokes = await this.getRoomStrokes(roomId);
    return { strokes };
  }

  async removeUser(ws) {
    const wsId = this._getWsId(ws);
    const userData = await redis.hgetall(`ws:${wsId}`);
    if (!userData.roomId) return null;

    const { roomId, username } = userData;

    const multi = redis.multi();
    multi.srem(`room:${roomId}:users`, username);
    multi.del(`ws:${wsId}`);
    multi.del(`user:${username}:room`);
    await multi.exec();

    const roomSockets = this.roomSockets.get(roomId);
    if (roomSockets) {
      roomSockets.delete(ws);
      if (roomSockets.size === 0) {
        this.roomSockets.delete(roomId);
      }
    }

    const remaining = await redis.scard(`room:${roomId}:users`);
    if (remaining === 0) {
      const strokes = await redis.lrange(`room:${roomId}:strokes`, 0, -1);
      if (strokes.length > 0) {
        const strokesObjects = strokes.map(s => JSON.parse(s));
        await DataStore.saveStrokes(roomId, strokesObjects);
      }
      await redis.del(`room:${roomId}:strokes`);
    }

    return { roomId, username };
  }

  async addStroke(roomId, stroke) {
    await redis.rpush(`room:${roomId}:strokes`, JSON.stringify(stroke));
  }

  async getRoomStrokes(roomId) {
    let strokes = await redis.lrange(`room:${roomId}:strokes`, 0, -1);
    if (strokes.length > 0) {
      return strokes.map(s => JSON.parse(s));
    }

    const dbStrokes = await DataStore.loadStrokes(roomId);
    if (dbStrokes.length > 0) {
      const multi = redis.multi();
      for (const s of dbStrokes) {
        multi.rpush(`room:${roomId}:strokes`, JSON.stringify(s));
      }
      await multi.exec();
    }
    return dbStrokes;
  }

  async clearStrokes(roomId) {
    await redis.del(`room:${roomId}:strokes`);
    await DataStore.deleteStrokes(roomId);
  }

  async getRoomUsers(roomId) {
    return redis.smembers(`room:${roomId}:users`);
  }

  async updateUserActivity(ws) {
    const wsId = this._getWsId(ws);
    await redis.hset(`ws:${wsId}`, 'lastActivity', Date.now());
  }

  async getUserInfo(ws) {
    const wsId = this._getWsId(ws);
    const data = await redis.hgetall(`ws:${wsId}`);
    if (!data.roomId) return null;
    return { roomId: data.roomId, username: data.username };
  }

  getRoomSockets(roomId) {
    return this.roomSockets.get(roomId);
  }

  _getWsId(ws) {
    if (!ws._id) {
      ws._id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return ws._id;
  }
}

module.exports = new RoomManager();
