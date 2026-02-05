class AutoSaveService {
  constructor() {
    this.version = "1.0";
    this.autosaveInterval = null;
    this.hasChanges = false;
    this.lastSaveTime = 0;
    this.saveDelay = 5000;
    this.maxBackups = 3;
    this.maxAge = 24 * 60 * 60 * 1000;
  }

  getStorageKey(roomId = null) {
    return roomId ? `paint_autosave_room_${roomId}` : 'paint_autosave_local';
  }

  getBackupKey(roomId = null, index) {
    return `${this.getStorageKey(roomId)}_backup_${index}`;
  }

  save(data, roomId = null) {
    const saveData = {
      strokes: data.strokes || [],
      canvasState: {
        zoom: data.zoom || 1,
        showGrid: data.showGrid || false
      },
      toolState: {
        toolName: data.toolName || 'brush',
        strokeColor: data.strokeColor || '#000000',
        fillColor: data.fillColor || '#000000',
        lineWidth: data.lineWidth || 1,
        strokeOpacity: data.strokeOpacity || 1
      },
      timestamp: Date.now(),
      sessionId: data.sessionId || this.generateSessionId(),
      version: this.version
    };

    try {
      const key = this.getStorageKey(roomId);
      
      const existing = localStorage.getItem(key);
      if (existing) {
        this.rotateBackups(roomId);
      }

      localStorage.setItem(key, JSON.stringify(saveData));
      this.hasChanges = false;
      this.lastSaveTime = Date.now();
      
      return true;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        this.cleanupOldBackups(roomId);
        try {
          const key = this.getStorageKey(roomId);
          localStorage.setItem(key, JSON.stringify(saveData));
          return true;
        } catch (retryError) {
          return false;
        }
      }
      return false;
    }
  }

  restore(roomId = null) {
    try {
      const key = this.getStorageKey(roomId);
      const data = localStorage.getItem(key);
      
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      
      if (!parsed.version || parsed.version !== this.version) {
        return null;
      }
      
      const age = Date.now() - parsed.timestamp;
      if (age > this.maxAge) {
        this.clear(roomId);
        return null;
      }
      
      return parsed;
    } catch (error) {
      return null;
    }
  }

  clear(roomId = null) {
    try {
      const key = this.getStorageKey(roomId);
      localStorage.removeItem(key);
      
      for (let i = 0; i < this.maxBackups; i++) {
        localStorage.removeItem(this.getBackupKey(roomId, i));
      }
      
      this.hasChanges = false;
    } catch (error) {}
  }

  rotateBackups(roomId = null) {
    try {
      for (let i = this.maxBackups - 1; i > 0; i--) {
        const currentKey = this.getBackupKey(roomId, i - 1);
        const nextKey = this.getBackupKey(roomId, i);
        const data = localStorage.getItem(currentKey);
        
        if (data) {
          localStorage.setItem(nextKey, data);
        }
      }
      
      const mainKey = this.getStorageKey(roomId);
      const mainData = localStorage.getItem(mainKey);
      
      if (mainData) {
        localStorage.setItem(this.getBackupKey(roomId, 0), mainData);
      }
    } catch (error) {}
  }

  restoreFromBackup(roomId = null, backupIndex = 0) {
    try {
      const backupKey = this.getBackupKey(roomId, backupIndex);
      const data = localStorage.getItem(backupKey);
      
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  cleanupOldBackups(roomId = null) {
    try {
      for (let i = 0; i < this.maxBackups; i++) {
        const backupKey = this.getBackupKey(roomId, i);
        const data = localStorage.getItem(backupKey);
        
        if (data) {
          const parsed = JSON.parse(data);
          const age = Date.now() - parsed.timestamp;
          
          if (age > this.maxAge) {
            localStorage.removeItem(backupKey);
          }
        }
      }
    } catch (error) {}
  }

  cleanupAllOldSaves() {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();
      
      keys.forEach(key => {
        if (key.startsWith('paint_autosave_')) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              const age = now - parsed.timestamp;
              
              if (age > this.maxAge) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {}
        }
      });
    } catch (error) {}
  }

  markChanged() {
    this.hasChanges = true;
  }

  shouldSave() {
    if (!this.hasChanges) return false;
    
    const timeSinceLastSave = Date.now() - this.lastSaveTime;
    return timeSinceLastSave >= this.saveDelay;
  }

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    const timeStr = date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    if (isToday) {
      return `сегодня в ${timeStr}`;
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    if (isYesterday) {
      return `вчера в ${timeStr}`;
    }
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStorageSize() {
    let total = 0;
    try {
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key) && key.startsWith('paint_autosave_')) {
          total += localStorage[key].length + key.length;
        }
      }
    } catch (error) {}
    return total;
  }
}

export default new AutoSaveService();
