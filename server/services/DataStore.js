const fs = require('fs');
const path = require('path');

/**
 * DataStore - manages persistent storage for rooms
 * Responsibilities: save/load room data, cleanup
 */
class DataStore {
  constructor() {
    this.roomInfoFile = path.join(__dirname, '../roomInfo.json');
    this.roomDataDir = path.join(__dirname, '../room_data');
    this.roomInfo = {};
    
    this.initialize();
  }

  /**
   * Initialize storage directories and load data
   */
  initialize() {
    // Create directories if they don't exist
    if (!fs.existsSync(this.roomDataDir)) {
      fs.mkdirSync(this.roomDataDir, { recursive: true });
    }

    // Load room info
    if (fs.existsSync(this.roomInfoFile)) {
      try {
        this.roomInfo = JSON.parse(fs.readFileSync(this.roomInfoFile, 'utf8'));
      } catch (error) {
        console.error('Failed to load room info:', error);
        this.roomInfo = {};
        this.saveRoomInfo();
      }
    } else {
      this.saveRoomInfo();
    }
  }

  /**
   * Save room info to disk
   */
  saveRoomInfo() {
    try {
      fs.writeFileSync(this.roomInfoFile, JSON.stringify(this.roomInfo, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save room info:', error);
      return false;
    }
  }

  /**
   * Get room info
   */
  getRoomInfo(roomId) {
    return this.roomInfo[roomId] || null;
  }

  /**
   * Get all room info
   */
  getAllRoomInfo() {
    return { ...this.roomInfo };
  }

  /**
   * Create room
   */
  createRoom(roomId, data) {
    this.roomInfo[roomId] = {
      ...data,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    this.saveRoomInfo();
    return this.roomInfo[roomId];
  }

  /**
   * Update room activity
   */
  updateRoomActivity(roomId) {
    if (this.roomInfo[roomId]) {
      this.roomInfo[roomId].lastActivity = Date.now();
      this.saveRoomInfo();
      return true;
    }
    return false;
  }

  /**
   * Delete room
   */
  deleteRoom(roomId) {
    if (this.roomInfo[roomId]) {
      delete this.roomInfo[roomId];
      this.deleteRoomStrokes(roomId);
      this.saveRoomInfo();
      return true;
    }
    return false;
  }

  /**
   * Save room strokes
   */
  saveRoomStrokes(roomId, strokes) {
    const strokesFile = path.join(this.roomDataDir, `${roomId}.json`);
    try {
      fs.writeFileSync(strokesFile, JSON.stringify(strokes));
      return true;
    } catch (error) {
      console.error(`Failed to save strokes for room ${roomId}:`, error);
      return false;
    }
  }

  /**
   * Load room strokes
   */
  loadRoomStrokes(roomId) {
    const strokesFile = path.join(this.roomDataDir, `${roomId}.json`);
    try {
      if (fs.existsSync(strokesFile)) {
        return JSON.parse(fs.readFileSync(strokesFile, 'utf8'));
      }
    } catch (error) {
      console.error(`Failed to load strokes for room ${roomId}:`, error);
    }
    return [];
  }

  /**
   * Delete room strokes
   */
  deleteRoomStrokes(roomId) {
    const strokesFile = path.join(this.roomDataDir, `${roomId}.json`);
    try {
      if (fs.existsSync(strokesFile)) {
        fs.unlinkSync(strokesFile);
        return true;
      }
    } catch (error) {
      console.error(`Failed to delete strokes for room ${roomId}:`, error);
    }
    return false;
  }

  /**
   * Get public rooms
   */
  getPublicRooms() {
    return Object.entries(this.roomInfo)
      .filter(([_, info]) => info.isPublic)
      .map(([id, info]) => ({
        id,
        name: info.name,
        isPublic: info.isPublic,
        hasPassword: info.hasPassword || false
      }));
  }

  /**
   * Cleanup expired rooms
   */
  cleanupExpiredRooms(expirationTime) {
    const now = Date.now();
    let changed = false;
    
    Object.entries(this.roomInfo).forEach(([roomId, info]) => {
      const lastActivity = info.lastActivity || info.createdAt;
      if (now - lastActivity > expirationTime) {
        this.deleteRoom(roomId);
        changed = true;
      }
    });
    
    return changed;
  }
}

module.exports = new DataStore();
