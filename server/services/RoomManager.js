const { redis } = require('../config/db');
const DataStore = require('./DataStore');

class RoomManager {
  constructor() {
    this.roomSockets = new Map();
    this.startInactivityCheck();
  }

  startInactivityCheck() {
    setInterval(() => {
      this.checkInactiveUsers();
    }, 60000);
  }

  async checkInactiveUsers() {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
    const now = Date.now();
    
    const keys = await this.redis.keys('ws:*');
    
    for (const key of keys) {
      try {
        const data = await this.redis.hgetall(key);
        if (!data || !data.lastActivity) continue;
        
        const lastActivity = parseInt(data.lastActivity);
        const timeSinceLastActivity = now - lastActivity;
        
        if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
          const wsId = key.replace('ws:', '');
          const { roomId, username } = data;
          
          if (roomId && username) {
            await this.removeUserByInfo(roomId, username);
            console.log(`Removed inactive user: ${username} from room ${roomId}`);
          }
        }
      } catch (error) {
        console.error('Error checking inactive user:', error);
      }
    }
  }

  async removeUserByInfo(roomId, username) {
    await this.redis.srem(`room:${roomId}:users`, username);
    await this.redis.del(`ws:${roomId}_${username}`);
    await this.redis.del(`user:${username}:room`);
    
    const sockets = this.roomSockets.get(roomId);
    if (sockets) {
      const WebSocket = require('ws');
      const message = JSON.stringify({ method: 'disconnection', username });
      sockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
      
      const users = await this.getRoomUsers(roomId);
      const usersMessage = JSON.stringify({ method: 'users', users });
      sockets.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(usersMessage);
        }
      });
    }
  }

  get redis() {
    return require('../config/db').redis;
  }

async getAllRoomStrokes(roomId) {
    let strokes = await redis.lrange(`room:${roomId}:strokes`, 0, -1);
    if (strokes.length > 0) {
      return strokes.map(s => {
        try {
          return JSON.parse(s);
        } catch (e) {
          return null;
        }
      }).filter(s => s !== null);
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
      throw new Error('Достигнуто максимальное количество пользователей в комнате');
    }

    const onlineUsers = await this.getRoomUsers(roomId);

    // Optimized: load cancelled strokes only for current user
    await this.loadCancelledStrokesFromDb(roomId, username);
    
    const wsId = this._getWsId(ws);

    // Optimized: combine all Redis operations in one pipeline
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
    
    let strokes = await redis.lrange(`room:${roomId}:strokes`, 0, -1);
    if (strokes.length === 0) {
      strokes = await DataStore.loadStrokes(roomId);
      if (strokes.length > 0) {
        // Fixed: ensure all strokes have proper lineWidth before caching
        const normalizedStrokes = strokes.map(s => {
          if (s.lineWidth === undefined || s.lineWidth === null) {
            if (s.type === 'eraser') {
              return { ...s, lineWidth: 10 };
            } else if (s.type === 'text') {
              return { ...s, lineWidth: 16 };
            } else {
              return { ...s, lineWidth: 1 };
            }
          }
          return s;
        });
        
        const multi = redis.multi();
        for (const s of normalizedStrokes) {
          multi.rpush(`room:${roomId}:strokes`, JSON.stringify(s));
        }
        await multi.exec();
        strokes = normalizedStrokes;
      }
    } else {
      strokes = strokes.map(s => {
        const parsed = JSON.parse(s);
        // Fixed: normalize lineWidth for all stroke types
        if (parsed.lineWidth === undefined || parsed.lineWidth === null) {
          if (parsed.type === 'eraser') {
            parsed.lineWidth = 10;
          } else if (parsed.type === 'text') {
            parsed.lineWidth = 16;
          } else {
            parsed.lineWidth = 1;
          }
        }
        return parsed;
      });
    }
    
    const allCancelledStrokes = await this.getAllCancelledStrokes(roomId);
    const allCancelledStrokeIds = new Set();
    
    Object.values(allCancelledStrokes).forEach(cancelledArray => {
      cancelledArray.forEach(stroke => {
        allCancelledStrokeIds.add(stroke.id);
      });
    });
    
    const filteredStrokes = strokes.filter(s => !allCancelledStrokeIds.has(s.id));
    
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

    // Fixed: save cancelled strokes for current user
    await this.saveCancelledStrokesToDb(roomId, username);

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
      // Get all strokes and filter out cancelled ones before saving
      let strokes = await redis.lrange(`room:${roomId}:strokes`, 0, -1);
      const allCancelled = await this.getAllCancelledStrokes(roomId);
      const allCancelledIds = new Set();
      
      Object.values(allCancelled).forEach(cancelledArray => {
        cancelledArray.forEach(stroke => {
          allCancelledIds.add(stroke.id);
        });
      });
      
      if (strokes.length > 0) {
        const strokesObjects = strokes.map(s => JSON.parse(s));
        // Filter out cancelled strokes before saving to DB
        const activeStrokes = strokesObjects.filter(s => !allCancelledIds.has(s.id));
        
        if (activeStrokes.length > 0) {
          await DataStore.saveStrokes(roomId, activeStrokes);
        } else {
          await DataStore.deleteStrokes(roomId);
        }
      }
      await redis.del(`room:${roomId}:strokes`);

      // Save all cancelled strokes to DB
      for (const [cancelledUsername, cancelledStrokes] of Object.entries(allCancelled)) {
        if (cancelledStrokes.length > 0) {
          await DataStore.saveCancelledStrokes(roomId, cancelledUsername, cancelledStrokes);
        }
        await redis.del(`room:${roomId}:cancelled:${cancelledUsername}`);
      }
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
    const pattern = `room:${roomId}:cancelled:*`;
    let cursor = '0';
    const keys = [];
    do {
      const [nextCursor, scanKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...scanKeys);
    } while (cursor !== '0');

    const allCancelled = {};
    for (const key of keys) {
      const username = key.split(':').pop();
      const cancelled = await redis.lrange(key, 0, -1);
      if (cancelled.length > 0) {
        allCancelled[username] = cancelled.map(s => JSON.parse(s));
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

  async checkInactiveUsers() {
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
    const now = Date.now();
    try {
      const pattern = 'ws:ws_*';
      let cursor = '0';
      const inactiveUsers = [];
      do {
        const [nextCursor, scanKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        for (const key of scanKeys) {
          const userData = await redis.hgetall(key);
          if (userData && userData.lastActivity) {
            const lastActivity = parseInt(userData.lastActivity);
            if (now - lastActivity > INACTIVITY_TIMEOUT) {
              inactiveUsers.push({
                wsId: key.replace('ws:', ''),
                roomId: userData.roomId,
                username: userData.username
              });
            }
          }
        }
      } while (cursor !== '0');
      for (const user of inactiveUsers) {
        await redis.srem(`room:${user.roomId}:users`, user.username);
        await redis.del(`ws:${user.wsId}`);
        await redis.del(`user:${user.username}:room`);
        const roomSockets = this.roomSockets.get(user.roomId);
        if (roomSockets) {
          const message = JSON.stringify({ method: 'disconnection', username: user.username });
          roomSockets.forEach(ws => { if (ws.readyState === 1) { try { ws.send(message); } catch (e) {} } });
          const remainingUsers = await this.getRoomUsers(user.roomId);
          const usersMessage = JSON.stringify({ method: 'users', users: remainingUsers });
          roomSockets.forEach(ws => { if (ws.readyState === 1) { try { ws.send(usersMessage); } catch (e) {} } });
          if (remainingUsers.length === 0) {
            const strokes = await redis.lrange(`room:${user.roomId}:strokes`, 0, -1);
            if (strokes.length > 0) {
              const strokesObjects = strokes.map(s => JSON.parse(s));
              await DataStore.saveStrokes(user.roomId, strokesObjects);
            }
            await redis.del(`room:${user.roomId}:strokes`);
            const allCancelled = await this.getAllCancelledStrokes(user.roomId);
            for (const [cancelledUsername, cancelledStrokes] of Object.entries(allCancelled)) {
              if (cancelledStrokes.length > 0) {
                await DataStore.saveCancelledStrokes(user.roomId, cancelledUsername, cancelledStrokes);
              }
              await redis.del(`room:${user.roomId}:cancelled:${cancelledUsername}`);
            }
            this.roomSockets.delete(user.roomId);
          }
        }
      }
      return inactiveUsers.length;
    } catch (error) {
      console.error('Error checking inactive users:', error);
      return 0;
    }
  }

  _getWsId(ws) {
    if (!ws._id) {
      ws._id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return ws._id;
  }
}

module.exports = new RoomManager();
