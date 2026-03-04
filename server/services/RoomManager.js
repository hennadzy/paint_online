const { redis } = require('../config/db');
const DataStore = require('./DataStore');

class RoomManager {
  constructor() {
    this.roomSockets = new Map();
  }

  async getAllRoomStrokes(roomId) {
    let strokes = await redis.lrange(`room:${roomId}:strokes`, 0, -1);
    if (strokes.length > 0) {
      return strokes.map(s => JSON.parse(s));
    }
    const dbStrokes = await DataStore.loadStrokes(roomId);
    return dbStrokes;
  }

  async getAllCancelledStrokes(roomId) {
    const users = await this.getRoomUsers(roomId);
    const allCancelled = {};
    
    for (const username of users) {
      const cancelled = await this.getCancelledStrokes(roomId, username);
      if (cancelled.length > 0) {
        allCancelled[username] = cancelled;
      }
    }
    
    return allCancelled;
  }

  async removeStrokeFromAllCancelled(roomId, strokeId) {
    const users = await this.getRoomUsers(roomId);
    
    for (const username of users) {
      await this.removeCancelledStroke(roomId, username, strokeId);
    }
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

    // Load user's cancelled strokes from DB to Redis
    await this.loadCancelledStrokesFromDb(roomId, username);
    
    // Get ALL strokes for the room
    const allStrokes = await this.getAllRoomStrokes(roomId);
    
    // Get ALL cancelled strokes for ALL users
    const allCancelledStrokes = await this.getAllCancelledStrokes(roomId);
    const allCancelledStrokeIds = new Set();
    
    // Collect IDs of all cancelled strokes from all users
    Object.values(allCancelledStrokes).forEach(cancelledArray => {
      cancelledArray.forEach(stroke => {
        allCancelledStrokeIds.add(stroke.id);
      });
    });
    
    // Filter strokes - remove those cancelled by ANY user
    const filteredStrokes = allStrokes.filter(s => !allCancelledStrokeIds.has(s.id));
    
    return { 
      strokes: filteredStrokes,
      cancelledStrokeIds: Array.from(allCancelledStrokeIds)
    };
  }

  async removeUser(ws) {
    const wsId = this._getWsId(ws);
    const userData = await redis.hgetall(`ws:${wsId}`);
    if (!userData.roomId) return null;

    const { roomId, username } = userData;

    // Save user's cancelled strokes to DB before removing
    await this.saveCancelledStrokesToDb(roomId, username);

    const multi = redis.multi();
    multi.srem(`room:${roomId}:users`, username);
    multi.del(`ws:${wsId}`);
    multi.del(`user:${username}:room`);
    multi.del(`room:${roomId}:cancelled:${username}`);
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

  async removeStrokeById(roomId, strokeId) {
    const strokes = await redis.lrange(`room:${roomId}:strokes`, 0, -1);
    const index = strokes.findIndex(s => {
      try {
        const parsed = JSON.parse(s);
        return parsed.id === strokeId;
      } catch {
        return false;
      }
    });
    if (index !== -1) {
      await redis.lrem(`room:${roomId}:strokes`, 1, strokes[index]);
      return true;
    }
    return false;
  }

  async addCancelledStroke(roomId, username, stroke) {
    await redis.rpush(`room:${roomId}:cancelled:${username}`, JSON.stringify(stroke));
  }

  async removeCancelledStroke(roomId, username, strokeId) {
    const cancelled = await redis.lrange(`room:${roomId}:cancelled:${username}`, 0, -1);
    const index = cancelled.findIndex(s => {
      try {
        const parsed = JSON.parse(s);
        return parsed.id === strokeId;
      } catch {
        return false;
      }
    });
    if (index !== -1) {
      await redis.lrem(`room:${roomId}:cancelled:${username}`, 1, cancelled[index]);
      return true;
    }
    return false;
  }

  async getCancelledStrokes(roomId, username) {
    const cancelled = await redis.lrange(`room:${roomId}:cancelled:${username}`, 0, -1);
    return cancelled.map(s => JSON.parse(s));
  }

  async getAllCancelledStrokes(roomId) {
    const users = await this.getRoomUsers(roomId);
    const allCancelled = {};
    for (const username of users) {
      const cancelled = await this.getCancelledStrokes(roomId, username);
      if (cancelled.length > 0) {
        allCancelled[username] = cancelled;
      }
    }
    return allCancelled;
  }

  async filterOutCancelledStrokes(roomId, strokes, username) {
    const cancelled = await this.getCancelledStrokes(roomId, username);
    const cancelledIds = new Set(cancelled.map(s => s.id));
    return strokes.filter(s => !cancelledIds.has(s.id));
  }

  async saveCancelledStrokesToDb(roomId, username) {
    const cancelled = await this.getCancelledStrokes(roomId, username);
    if (cancelled.length > 0) {
      await DataStore.saveCancelledStrokes(roomId, username, cancelled);
    }
  }

  async loadCancelledStrokesFromDb(roomId, username) {
    const cancelled = await DataStore.loadCancelledStrokes(roomId, username);
    if (cancelled.length > 0) {
      const multi = redis.multi();
      for (const stroke of cancelled) {
        multi.rpush(`room:${roomId}:cancelled:${username}`, JSON.stringify(stroke));
      }
      await multi.exec();
    }
    return cancelled;
  }

  async getRoomStrokes(roomId, username = null) {
    let strokes = await redis.lrange(`room:${roomId}:strokes`, 0, -1);
    if (strokes.length > 0) {
      strokes = strokes.map(s => JSON.parse(s));
    } else {
      const dbStrokes = await DataStore.loadStrokes(roomId);
      if (dbStrokes.length > 0) {
        const multi = redis.multi();
        for (const s of dbStrokes) {
          multi.rpush(`room:${roomId}:strokes`, JSON.stringify(s));
        }
        await multi.exec();
      }
      strokes = dbStrokes;
    }
    
    // If a specific username is provided, filter out their cancelled strokes
    if (username) {
      const userCancelled = await this.getCancelledStrokes(roomId, username);
      const userCancelledIds = new Set(userCancelled.map(s => s.id));
      strokes = strokes.filter(s => !userCancelledIds.has(s.id));
    }
    
    return strokes;
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
