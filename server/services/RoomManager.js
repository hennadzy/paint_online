const DataStore = require('./DataStore');

const MAX_USERS_PER_ROOM = 10;
const INACTIVE_USER_TIMEOUT = 10 * 60 * 1000;

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.wsToUserInfo = new Map();
    this.startCleanupTimer();
  }

  async getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const savedStrokes = await DataStore.loadRoomStrokes(roomId);
      this.rooms.set(roomId, {
        users: new Map(),
        strokes: savedStrokes
      });
    }
    return this.rooms.get(roomId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  hasRoom(roomId) {
    return this.rooms.has(roomId);
  }

  async addUser(roomId, username, ws) {
    const room = await this.getOrCreateRoom(roomId);
    if (room.users.size >= MAX_USERS_PER_ROOM) {
      throw new Error('Room is full');
    }

    if (room.users.has(username)) {
      const existing = room.users.get(username);
      if (existing.ws.readyState !== 1) { 
        room.users.delete(username);
        this.wsToUserInfo.delete(existing.ws);
        if (existing.ws.readyState === 0 || existing.ws.readyState === 1) {
          existing.ws.close();
        }
      } else {
        throw new Error('Username taken');
      }
    }

    room.users.set(username, {
      ws,
      lastActivity: Date.now()
    });
    this.wsToUserInfo.set(ws, { roomId, username });
    await DataStore.updateRoomActivity(roomId);
    return room;
  }

  async removeUser(ws) {
    const userInfo = this.wsToUserInfo.get(ws);
    if (!userInfo) return null;
    const { roomId, username } = userInfo;
    const room = this.rooms.get(roomId);
    if (room && room.users.has(username)) {
      room.users.delete(username);
      this.wsToUserInfo.delete(ws);
      if (room.users.size === 0) {
        await DataStore.saveRoomStrokes(roomId, room.strokes);
        this.rooms.delete(roomId);
      }
      return { roomId, username };
    }
    return null;
  }

  getUserInfo(ws) {
    return this.wsToUserInfo.get(ws);
  }

  async updateUserActivity(ws) {
    const userInfo = this.wsToUserInfo.get(ws);
    if (!userInfo) return false;
    const { roomId, username } = userInfo;
    const room = this.rooms.get(roomId);
    if (room && room.users.has(username)) {
      room.users.get(username).lastActivity = Date.now();
      await DataStore.updateRoomActivity(roomId);
      return true;
    }
    return false;
  }

  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.keys()) : [];
  }

  getRoomStrokes(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.strokes : [];
  }

  addStroke(roomId, stroke) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.strokes.push(stroke);
      
      DataStore.saveRoomStrokes(roomId, room.strokes).catch(err => console.error('Save error:', err));
      
      return true;
    }
    return false;
  }

  async removeStroke(roomId, strokeId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.strokes = room.strokes.filter(s => s.id !== strokeId);
      await DataStore.saveRoomStrokes(roomId, room.strokes);
      return true;
    }
    return false;
  }

  async removeStrokeIfOwned(roomId, strokeId, username) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const stroke = room.strokes.find(s => s.id === strokeId);
    if (!stroke || (stroke.username && stroke.username !== username)) {
      return false;
    }
    room.strokes = room.strokes.filter(s => s.id !== strokeId);
    await DataStore.saveRoomStrokes(roomId, room.strokes);
    return true;
  }

  async removeLastStroke(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.strokes.length) {
      const stroke = room.strokes.pop();
      await DataStore.saveRoomStrokes(roomId, room.strokes);
      return stroke;
    }
    return null;
  }

  async clearStrokes(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.strokes = [];
      await DataStore.saveRoomStrokes(roomId, room.strokes);
      return true;
    }
    return false;
  }

  cleanupInactiveUsers() {
    const now = Date.now();
    let cleanedCount = 0;

    this.rooms.forEach((room, roomId) => {
      room.users.forEach(({ ws, lastActivity }, username) => {
        if (now - lastActivity > INACTIVE_USER_TIMEOUT) {
          try {
            ws.close(1000, 'Inactive');
            cleanedCount++;
          } catch (error) {}
        }
      });
    });
    return cleanedCount;
  }

  startCleanupTimer() {
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 60000);
  }

  getStats() {
    return {
      activeRooms: this.rooms.size,
      totalUsers: this.wsToUserInfo.size,
      roomDetails: Array.from(this.rooms.entries()).map(([roomId, room]) => ({
        roomId,
        userCount: room.users.size,
        strokeCount: room.strokes.length
      }))
    };
  }
}

module.exports = new RoomManager();
