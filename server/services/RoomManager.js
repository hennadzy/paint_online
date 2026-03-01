const DataStore = require('./DataStore');

const MAX_USERS_PER_ROOM = 10;
const INACTIVE_USER_TIMEOUT = 10 * 60 * 1000;

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.wsToUserInfo = new Map();
    this.startCleanupTimer();
  }

  getOrCreateRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      const savedStrokes = DataStore.loadRoomStrokes(roomId);
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

  addUser(roomId, username, ws) {
    const room = this.getOrCreateRoom(roomId);
    if (room.users.size >= MAX_USERS_PER_ROOM) {
      throw new Error('Room is full');
    }
    if (room.users.has(username)) {
      throw new Error('Username taken');
    }
    room.users.set(username, {
      ws,
      lastActivity: Date.now()
    });
    this.wsToUserInfo.set(ws, { roomId, username });
    DataStore.updateRoomActivity(roomId);
    return room;
  }

  removeUser(ws) {
    const userInfo = this.wsToUserInfo.get(ws);
    if (!userInfo) return null;
    const { roomId, username } = userInfo;
    const room = this.rooms.get(roomId);
    if (room && room.users.has(username)) {
      room.users.delete(username);
      this.wsToUserInfo.delete(ws);
      if (room.users.size === 0) {
        DataStore.saveRoomStrokes(roomId, room.strokes);
        this.rooms.delete(roomId);
      }
      return { roomId, username };
    }
    return null;
  }

  getUserInfo(ws) {
    return this.wsToUserInfo.get(ws);
  }

  updateUserActivity(ws) {
    const userInfo = this.wsToUserInfo.get(ws);
    if (!userInfo) return false;
    const { roomId, username } = userInfo;
    const room = this.rooms.get(roomId);
    if (room && room.users.has(username)) {
      room.users.get(username).lastActivity = Date.now();
      DataStore.updateRoomActivity(roomId);
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
      // Добавляем штрих в память
      room.strokes.push(stroke);
      
      // Сохраняем на диск
      try {
        DataStore.saveRoomStrokes(roomId, room.strokes);
      } catch (error) {
        console.error('Error saving strokes:', error);
      }
      
      return true;
    }
    return false;
  }

  removeStroke(roomId, strokeId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.strokes = room.strokes.filter(s => s.id !== strokeId);
      DataStore.saveRoomStrokes(roomId, room.strokes);
      return true;
    }
    return false;
  }

  removeStrokeIfOwned(roomId, strokeId, username) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    const stroke = room.strokes.find(s => s.id === strokeId);
    if (!stroke || (stroke.username && stroke.username !== username)) {
      return false;
    }
    room.strokes = room.strokes.filter(s => s.id !== strokeId);
    DataStore.saveRoomStrokes(roomId, room.strokes);
    return true;
  }

  removeLastStroke(roomId) {
    const room = this.rooms.get(roomId);
    if (room && room.strokes.length) {
      const stroke = room.strokes.pop();
      DataStore.saveRoomStrokes(roomId, room.strokes);
      return stroke;
    }
    return null;
  }

  clearStrokes(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.strokes = [];
      DataStore.saveRoomStrokes(roomId, room.strokes);
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
