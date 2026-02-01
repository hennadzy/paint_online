const fs = require('fs');
const path = require('path');

class DataStore {
  constructor() {
    this.roomInfoFile = path.join(__dirname, '../roomInfo.json');
    this.roomDataDir = path.join(__dirname, '../room_data');
    this.roomInfo = {};
    
    this.initialize();
  }

  initialize() {
    if (!fs.existsSync(this.roomDataDir)) {
      fs.mkdirSync(this.roomDataDir, { recursive: true });
    }

    if (fs.existsSync(this.roomInfoFile)) {
      try {
        this.roomInfo = JSON.parse(fs.readFileSync(this.roomInfoFile, 'utf8'));
      } catch (error) {
        this.roomInfo = {};
        this.saveRoomInfo();
      }
    } else {
      this.saveRoomInfo();
    }
  }

  saveRoomInfo() {
    try {
      fs.writeFileSync(this.roomInfoFile, JSON.stringify(this.roomInfo, null, 2));
      return true;
    } catch (error) {
      return false;
    }
  }

  getRoomInfo(roomId) {
    return this.roomInfo[roomId] || null;
  }

  getAllRoomInfo() {
    return { ...this.roomInfo };
  }

  createRoom(roomId, data) {
    this.roomInfo[roomId] = {
      ...data,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    this.saveRoomInfo();
    return this.roomInfo[roomId];
  }

  updateRoomActivity(roomId) {
    if (this.roomInfo[roomId]) {
      this.roomInfo[roomId].lastActivity = Date.now();
      this.saveRoomInfo();
      return true;
    }
    return false;
  }

  deleteRoom(roomId) {
    if (this.roomInfo[roomId]) {
      delete this.roomInfo[roomId];
      this.deleteRoomStrokes(roomId);
      this.saveRoomInfo();
      return true;
    }
    return false;
  }

  saveRoomStrokes(roomId, strokes) {
    const strokesFile = path.join(this.roomDataDir, `${roomId}.json`);
    try {
      fs.writeFileSync(strokesFile, JSON.stringify(strokes));
      return true;
    } catch (error) {
      return false;
    }
  }

  loadRoomStrokes(roomId) {
    const strokesFile = path.join(this.roomDataDir, `${roomId}.json`);
    try {
      if (fs.existsSync(strokesFile)) {
        return JSON.parse(fs.readFileSync(strokesFile, 'utf8'));
      }
    } catch (error) {}
    return [];
  }

  deleteRoomStrokes(roomId) {
    const strokesFile = path.join(this.roomDataDir, `${roomId}.json`);
    try {
      if (fs.existsSync(strokesFile)) {
        fs.unlinkSync(strokesFile);
        return true;
      }
    } catch (error) {}
    return false;
  }

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
