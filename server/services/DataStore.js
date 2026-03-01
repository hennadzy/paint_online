const fs = require('fs');
const fsPromises = require('fs').promises;
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

  async saveRoomInfo() {
    try {
      await fsPromises.writeFile(this.roomInfoFile, JSON.stringify(this.roomInfo, null, 2));
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

  async createRoom(roomId, data) {
    this.roomInfo[roomId] = {
      ...data,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };
    await this.saveRoomInfo();
    return this.roomInfo[roomId];
  }

  async updateRoomActivity(roomId) {
    if (this.roomInfo[roomId]) {
      this.roomInfo[roomId].lastActivity = Date.now();
      await this.saveRoomInfo();
      return true;
    }
    return false;
  }

  async deleteRoom(roomId) {
    if (this.roomInfo[roomId]) {
      delete this.roomInfo[roomId];
      await this.deleteRoomStrokes(roomId);
      await this.saveRoomInfo();
      return true;
    }
    return false;
  }

  async saveRoomStrokes(roomId, strokes) {
    const strokesFile = path.join(this.roomDataDir, `${roomId}.json`);
    try {
      await fsPromises.writeFile(strokesFile, JSON.stringify(strokes));
      return true;
    } catch (error) {
      return false;
    }
  }

  async loadRoomStrokes(roomId) {
    const strokesFile = path.join(this.roomDataDir, `${roomId}.json`);
    try {
      const exists = await fsPromises.access(strokesFile).then(() => true).catch(() => false);
      if (exists) {
        const data = await fsPromises.readFile(strokesFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {}
    return [];
  }

  async deleteRoomStrokes(roomId) {
    const strokesFile = path.join(this.roomDataDir, `${roomId}.json`);
    try {
      await fsPromises.unlink(strokesFile);
      return true;
    } catch (error) {
      return false;
    }
  }

  getPublicRooms() {
    return Object.entries(this.roomInfo)
      .filter(([, info]) => info.isPublic === true)
      .map(([id, info]) => ({
        id,
        name: info.name,
        isPublic: info.isPublic,
        hasPassword: info.hasPassword || false,
        lastActivity: info.lastActivity || info.createdAt || 0
      }))
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }

  getAllRooms() {
    return Object.entries(this.roomInfo)
      .map(([id, info]) => ({
        id,
        name: info.name,
        isPublic: info.isPublic,
        hasPassword: info.hasPassword || false,
        lastActivity: info.lastActivity || info.createdAt || 0
      }))
      .sort((a, b) => b.lastActivity - a.lastActivity);
  }

  async cleanupExpiredRooms(expirationTime) {
    const now = Date.now();
    let changed = false;
    
    const roomsToDelete = [];
    
    Object.entries(this.roomInfo).forEach(([roomId, info]) => {
      const lastActivity = info.lastActivity || info.createdAt;
      if (now - lastActivity > expirationTime) {
        roomsToDelete.push(roomId);
      }
    });
    
    for (const roomId of roomsToDelete) {
      await this.deleteRoom(roomId);
      changed = true;
    }
    
    return changed;
  }
}

module.exports = new DataStore();
