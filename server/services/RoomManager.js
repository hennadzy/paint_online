const DataStore = require('./DataStore');

const MAX_USERS_PER_ROOM = 10;
const INACTIVE_USER_TIMEOUT = 10 * 60 * 1000;

/**
 * RoomManager - manages active rooms and users
 * Responsibilities: room lifecycle, user management, activity tracking
 */
class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.wsToUserInfo = new Map();
    this.startCleanupTimer();
  }

  /**
   * Create or get room
   */
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

  /**
   * Get room
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Check if room exists
   */
  hasRoom(roomId) {
    return this.rooms.has(roomId);
  }

  /**
   * Add user to room
   */
  addUser(roomId, username, ws) {
    const room = this.getOrCreateRoom(roomId);
    
    // Check room capacity
    if (room.users.size >= MAX_USERS_PER_ROOM) {
      throw new Error('Room is full');
    }
    
    // Check if username is taken
    if (room.users.has(username)) {
      throw new Error('Username taken');
    }
    
    // Add user
    room.users.set(username, {
      ws,
      lastActivity: Date.now()
    });
    
    this.wsToUserInfo.set(ws, { roomId, username });
    DataStore.updateRoomActivity(roomId);
    
    return room;
  }

  /**
   * Remove user from room
   */
  removeUser(ws) {
    const userInfo = this.wsToUserInfo.get(ws);
    if (!userInfo) return null;
    
    const { roomId, username } = userInfo;
    const room = this.rooms.get(roomId);
    
    if (room && room.users.has(username)) {
      room.users.delete(username);
      this.wsToUserInfo.delete(ws);
      
      // Clean up empty room
      if (room.users.size === 0) {
        DataStore.saveRoomStrokes(roomId, room.strokes);
        this.rooms.delete(roomId);
      }
      
      return { roomId, username };
    }
    
    return null;
  }

  /**
   * Get user info by WebSocket
   */
  getUserInfo(ws) {
    return this.wsToUserInfo.get(ws);
  }

  /**
   * Update user activity
   */
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

  /**
   * Get users in room
   */
  getRoomUsers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.keys()) : [];
  }

  /**
   * Get room strokes
   */
  getRoomStrokes(roomId) {
    const room = this.rooms.get(roomId);
    return room ? room.strokes : [];
  }

  /**
   * Add stroke to room
   */
  addStroke(roomId, stroke) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.strokes.push(stroke);
      DataStore.saveRoomStrokes(roomId, room.strokes);
      return true;
    }
    return false;
  }

  /**
   * Remove stroke from room
   */
  removeStroke(roomId, strokeId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.strokes = room.strokes.filter(s => s.id !== strokeId);
      DataStore.saveRoomStrokes(roomId, room.strokes);
      return true;
    }
    return false;
  }

  /**
   * Clear room strokes
   */
  clearStrokes(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.strokes = [];
      DataStore.saveRoomStrokes(roomId, room.strokes);
      return true;
    }
    return false;
  }

  /**
   * Cleanup inactive users
   */
  cleanupInactiveUsers() {
    const now = Date.now();
    let cleanedCount = 0;
    
    this.rooms.forEach((room, roomId) => {
      room.users.forEach(({ ws, lastActivity }, username) => {
        if (now - lastActivity > INACTIVE_USER_TIMEOUT) {
          try {
            ws.close(1000, 'Inactive');
            cleanedCount++;
          } catch (error) {
            console.error('Error closing inactive connection:', error);
          }
        }
      });
    });
    
    return cleanedCount;
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 60000); // Every minute
  }

  /**
   * Get statistics
   */
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
