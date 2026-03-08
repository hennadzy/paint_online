import { makeAutoObservable } from "mobx";
import CanvasService from "../services/CanvasService";
import WebSocketService from "../services/WebSocketService";
import HistoryService from "../services/HistoryService";
import AutoSaveService from "../services/AutoSaveService";

export const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://paint-online-back.onrender.com';
export const WS_URL = window.location.hostname === 'localhost'
  ? 'ws://localhost:5000'
  : 'wss://paint-online-back.onrender.com';

class CanvasState {
  currentRoomId = null;
  username = "";
  usernameReady = false;
  isConnected = false;
  isDrawing = false;
  users = [];
  chatMessages = [];
  modalOpen = false;
  showRoomInterface = false;
  showAboutModal = false;
  showGamesModal = false;
  roomModalOpen = false;
  roomMode = 'create';
  showRoomsList = false;
  publicRooms = [];
  createdRoomId = null;
  createdRoomLink = '';
  showRestoreDialog = false;
  restoreTimestamp = null;
  returningFromRoom = false;
  cancelledStrokeIds = [];
  pageVisible = true;
  lastNotificationTime = 0;
  notificationThrottle = 5000;
  titleInterval = null;
  roomError = null;

  constructor() {
    makeAutoObservable(this);
    this.setupServiceListeners();
    this.setupAutoSave();
    this.showRestoreDialog = false;
    this.restoreTimestamp = null;
  }

  setupServiceListeners() {
    WebSocketService.on('connected', () => {
      this.isConnected = true;
    });
    WebSocketService.on('disconnected', () => {
      this.isConnected = false;
    });
    WebSocketService.on('roomError', ({ message }) => {
      this.roomError = message;
      this.isConnected = false;
    });
    WebSocketService.on('userConnected', ({ username }) => {
      this.addUser(username);
      this.addChatMessage({ type: "system", username, message: `вошел в комнату` });
    });
    WebSocketService.on('userDisconnected', ({ username }) => {
      this.removeUser(username);
      this.addChatMessage({ type: "system", username, message: `покинул комнату` });
    });
    WebSocketService.on('usersList', ({ users }) => {
      this.users = users;
    });
    WebSocketService.on('drawsReceived', ({ strokes, cancelledStrokeIds }) => {
      console.log('Received draws:', strokes.length, 'cancelled:', cancelledStrokeIds);
      
      if (cancelledStrokeIds && Array.isArray(cancelledStrokeIds)) {
        this.cancelledStrokeIds = cancelledStrokeIds;
      }
      
      const filteredStrokes = strokes.filter(s => !this.cancelledStrokeIds.includes(s.id));
      
      HistoryService.setStrokes(filteredStrokes);
      CanvasService.rebuildBuffer(filteredStrokes, () => {
        canvasState.setZoom(1);
        setTimeout(() => this.saveThumbnail(), 500);
      });
    });
    
    WebSocketService.on('syncCancelled', ({ cancelledStrokeIds }) => {
      if (cancelledStrokeIds && Array.isArray(cancelledStrokeIds)) {
        this.cancelledStrokeIds = cancelledStrokeIds;
        
        const currentStrokes = HistoryService.getStrokes();
        const filteredStrokes = currentStrokes.filter(s => !this.cancelledStrokeIds.includes(s.id));
        
        HistoryService.setStrokes(filteredStrokes);
        CanvasService.rebuildBuffer(filteredStrokes);
        CanvasService.redraw();
      }
    });
    
    WebSocketService.on('drawReceived', ({ username, figure }) => {
      if (username === this.username) return;
      if (!figure) return;
      switch (figure.type) {
        case "undo":
          if (figure.strokeId) {
            if (!this.cancelledStrokeIds.includes(figure.strokeId)) {
              this.cancelledStrokeIds.push(figure.strokeId);
            }
            
            HistoryService.undoById(figure.strokeId, username);
            CanvasService.rebuildBuffer(HistoryService.getStrokes());
            CanvasService.redraw();
            
            if (!this.pageVisible) {
              this.notifyUser('Действие отменено', `${username} отменил(а) действие`);
            }
          }
          break;
        case "redo":
          if (figure.stroke && figure.stroke.id) {
            this.cancelledStrokeIds = this.cancelledStrokeIds.filter(id => id !== figure.stroke.id);
            
            const currentStrokes = HistoryService.getStrokes();
            if (!currentStrokes.some(s => s.id === figure.stroke.id)) {
              HistoryService.redoStroke(figure.stroke);
              CanvasService.rebuildBuffer(HistoryService.getStrokes());
              CanvasService.redraw();
            }
            
            if (!this.pageVisible) {
              this.notifyUser('Действие возвращено', `${username} вернул(а) действие`);
            }
          }
          break;
        default:
          if (figure.id && this.cancelledStrokeIds.includes(figure.id)) {
            return;
          }
          this.pushStroke(figure);
          break;
      }
      
      if (!this.pageVisible && figure.type !== 'undo' && figure.type !== 'redo') {
        this.notifyUser('Новый рисунок', `${username} нарисовал(а)`);
      }
    });
    WebSocketService.on('clearReceived', ({ username }) => {
      if (username !== this.username) {
        HistoryService.clearStrokes();
        CanvasService.rebuildBuffer([]);
        CanvasService.redraw();
        this.addChatMessage({ type: "system", username, message: `очистил холст` });
        this.scheduleThumbnailSave();
        
        if (!this.pageVisible) {
          this.notifyUser('Холст очищен', `${username} очистил(а) холст`);
        }
      }
    });
WebSocketService.on('chatReceived', ({ username, message, isVerified }) => {
      if (username !== this.username) {
        this.addChatMessage({ type: "chat", username, message, isVerified });
        if (!this.pageVisible) {
          this.notifyUser(`Сообщение от ${username}`, message);
        }
      }
    });
    HistoryService.on('strokeAdded', () => {
      CanvasService.redraw();
    });
    HistoryService.on('strokeUndone', () => {
      CanvasService.rebuildBuffer(HistoryService.getStrokes());
      CanvasService.redraw();
      this.scheduleThumbnailSave();
    });
    HistoryService.on('strokeRedone', async ({ stroke }) => {
      await CanvasService.drawStroke(CanvasService.bufferCtx, stroke);
      CanvasService.redraw();
      this.scheduleThumbnailSave();
    });
    HistoryService.on('strokesCleared', () => {
      CanvasService.rebuildBuffer([]);
      CanvasService.redraw();
      this.scheduleThumbnailSave();
    });
  }

  get canvas() {
    return CanvasService.canvas;
  }
  get ctx() {
    return CanvasService.ctx;
  }
  get bufferCanvas() {
    return CanvasService.bufferCanvas;
  }
  get bufferCtx() {
    return CanvasService.bufferCtx;
  }
  get showGrid() {
    return CanvasService.showGrid;
  }
  get zoom() {
    return CanvasService.zoom;
  }

  setCanvas(canvas) {
    CanvasService.initialize(canvas);
  }
  toggleGrid() {
    CanvasService.toggleGrid();
  }
  setZoom(zoom) {
    CanvasService.setZoom(zoom);
  }
  zoomIn() {
    CanvasService.setZoom(CanvasService.zoom + 0.1);
  }
  zoomOut() {
    CanvasService.setZoom(CanvasService.zoom - 0.1);
  }
  redrawCanvas() {
    CanvasService.redraw();
  }
  rebuildBuffer() {
    CanvasService.rebuildBuffer(HistoryService.getStrokes());
  }

  get socket() {
    return WebSocketService.socket;
  }
  get sessionId() {
    return WebSocketService.sessionId;
  }

  get strokeList() {
    return HistoryService.getStrokes();
  }
  set strokeList(strokes) {
    HistoryService.setStrokes(strokes);
  }
  get redoStacks() {
    return HistoryService.redoStacks;
  }

  async pushStroke(stroke) {
    const added = HistoryService.addStroke(stroke, this.username);
    if (added) {
      await CanvasService.drawStroke(CanvasService.bufferCtx, stroke);
      CanvasService.redraw();
      AutoSaveService.markChanged();
      this.scheduleThumbnailSave();

      if (WebSocketService.isConnected) {
        WebSocketService.sendDraw(stroke);
      }
    }
  }

  undo() {
    const removed = HistoryService.undo(this.username);
    if (removed) {
      if (!this.cancelledStrokeIds.includes(removed.id)) {
        this.cancelledStrokeIds.push(removed.id);
      }
      
      if (WebSocketService.isConnected) {
        WebSocketService.sendDraw({ type: "undo", strokeId: removed.id });
      }
      
      AutoSaveService.markChanged();
      this.scheduleThumbnailSave();
    }
  }

  async redo() {
    const restored = HistoryService.redo(this.username);
    if (restored) {
      this.cancelledStrokeIds = this.cancelledStrokeIds.filter(id => id !== restored.id);
      
      if (WebSocketService.isConnected) {
        WebSocketService.sendDraw({ type: "redo", stroke: restored });
      } else {
        await CanvasService.drawStroke(CanvasService.bufferCtx, restored);
        CanvasService.redraw();
      }
      
      AutoSaveService.markChanged();
      this.scheduleThumbnailSave();
    }
  }

  undoRemote(strokeId, fromUsername) {
    if (strokeId) {
      if (!this.cancelledStrokeIds.includes(strokeId)) {
        this.cancelledStrokeIds.push(strokeId);
      }
      
      HistoryService.undoById(strokeId, fromUsername);
      CanvasService.rebuildBuffer(HistoryService.getStrokes());
      CanvasService.redraw();
    }
    
    this.scheduleThumbnailSave();
  }

  redoRemote(stroke, fromUsername) {
    if (!stroke) return;
    if (fromUsername && stroke.username && String(stroke.username).trim() !== String(fromUsername).trim()) {
      return;
    }
    if (!stroke.username && fromUsername) {
      stroke.username = fromUsername;
    }
    
    if (stroke.id) {
      this.cancelledStrokeIds = this.cancelledStrokeIds.filter(id => id !== stroke.id);
    }
    
    const added = HistoryService.redoStroke(stroke);
    if (added) {
      CanvasService.rebuildBuffer(HistoryService.getStrokes());
      CanvasService.redraw();
      this.scheduleThumbnailSave();
    }
  }

  clearCanvas() {
    if (!window.confirm('Очистить весь холст? Это действие нельзя отменить.')) {
      return;
    }
    HistoryService.clearStrokes();
    CanvasService.rebuildBuffer([]);
    CanvasService.redraw();
    if (WebSocketService.isConnected) {
      WebSocketService.sendClear();
    }
    AutoSaveService.clear(this.currentRoomId);
    this.scheduleThumbnailSave();
  }

  setUsername(username) {
    this.username = username;
    this.usernameReady = username && username !== 'local';
  }
  setCurrentRoomId(id) {
    this.currentRoomId = id;
  }
  setIsConnected(val) {
    this.isConnected = val;
  }
  addUser(user) {
    if (!this.users.includes(user)) {
      this.users.push(user);
    }
  }
  removeUser(user) {
    this.users = this.users.filter(u => u !== user);
  }
  addChatMessage(msg) {
    this.chatMessages.push(msg);
  }
sendChatMessage(message) {
    if (WebSocketService.isConnected) {
      const userState = require('./userState').default;
      WebSocketService.sendChat(message);
      this.addChatMessage({ type: "chat", username: this.username, message, isVerified: userState.isAuthenticated });
    }
  }

  async connectToRoom(roomId, username, token) {
    await WebSocketService.connect(WS_URL, roomId, username, token);
    this.setCurrentRoomId(roomId);
    this.setUsername(username);
    this.setupThumbnailInterval();
    setTimeout(() => this.saveThumbnail(), 1500);
    
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  saveThumbnail() {
    if (!this.currentRoomId) return;
    const roomId = this.currentRoomId;
    const sourceCanvas = this.bufferCanvas || this.canvas;
    if (!sourceCanvas) return;
    try {
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = 240;
      thumbCanvas.height = 160;
      const thumbCtx = thumbCanvas.getContext('2d');
      thumbCtx.fillStyle = 'white';
      thumbCtx.fillRect(0, 0, 240, 160);
      thumbCtx.drawImage(sourceCanvas, 0, 0, sourceCanvas.width, sourceCanvas.height, 0, 0, 240, 160);
      const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);
      fetch(`${API_URL}/image?id=${roomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ img: dataUrl })
      }).catch(() => { });
    } catch (_) { }
  }

scheduleThumbnailSave() {
    if (this._thumbnailDebounceTimer) {
      clearTimeout(this._thumbnailDebounceTimer);
    }
    this._thumbnailDebounceTimer = setTimeout(() => {
      this._thumbnailDebounceTimer = null;
      if (this.isConnected) {
        this.saveThumbnail();
      }
    }, 15000); // Увеличил с 5 сек до 15 секунд
  }

setupThumbnailInterval() {
    if (this._thumbnailInterval) return;
    this._thumbnailInterval = setInterval(() => {
      if (this.isConnected && this.currentRoomId) {
        this.saveThumbnail();
      }
    }, 120000); // Увеличил с 30 сек до 2 минут
  }

  stopThumbnailInterval() {
    if (this._thumbnailInterval) {
      clearInterval(this._thumbnailInterval);
      this._thumbnailInterval = null;
    }
    if (this._thumbnailDebounceTimer) {
      clearTimeout(this._thumbnailDebounceTimer);
      this._thumbnailDebounceTimer = null;
    }
  }

  disconnect(keepLocalSave = false) {
    this.stopThumbnailInterval();
    
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
      document.title = 'Рисование онлайн';
      this.setFaviconBadge(false);
    }
    
    if (keepLocalSave && HistoryService.getStrokes().length > 0) {
      this.performAutoSave();
      this.returningFromRoom = true;
    }
    
    this.saveThumbnail();
    WebSocketService.disconnect();
    this.isConnected = false;
    const wasInRoom = this.currentRoomId !== null;
    this.currentRoomId = null;
    this.username = "local";
    this.usernameReady = false;
    HistoryService.clearStrokes();
    this.users = [];
    this.chatMessages = [];
    this.cancelledStrokeIds = [];
    this.setModalOpen(false);
    this.showRestoreDialog = false;
    this.restoreTimestamp = null;
    CanvasService.clearImageCache();
    CanvasService.rebuildBuffer([]);
    CanvasService.redraw();
    if (wasInRoom && !keepLocalSave) {
      AutoSaveService.clear(null);
    }
  }
  setModalOpen(val) {
    this.modalOpen = val;
  }
  setShowRoomInterface(val) {
    this.showRoomInterface = val;
  }
  setShowAboutModal(val) {
    this.showAboutModal = val;
  }
  setShowGamesModal(val) {
    this.showGamesModal = val;
  }
  setShowRoomsList(val) {
    this.showRoomsList = val;
  }
  
  setPageVisible(visible) {
    this.pageVisible = visible;
    if (visible) {
      if (this.titleInterval) {
        clearInterval(this.titleInterval);
        this.titleInterval = null;
        document.title = 'Рисование онлайн';
        this.setFaviconBadge(false); // убираем точку
      }
    }
  }

  shouldNotify() {
    const now = Date.now();
    if (now - this.lastNotificationTime > this.notificationThrottle) {
      this.lastNotificationTime = now;
      return true;
    }
    return false;
  }

  notifyUser(title, body) {
    if (!this.shouldNotify()) return;
    if (!this.currentRoomId || !this.isConnected) return;

    if (!("Notification" in window)) {
      this.flashTitle(title);
      return;
    }

    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.png', tag: 'paint-update' });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") {
          new Notification(title, { body, icon: '/favicon.png', tag: 'paint-update' });
        } else {
          this.flashTitle(title);
        }
      });
    } else {
      this.flashTitle(title);
    }
  }

  flashTitle(originalTitle) {
    if (this.titleInterval) clearInterval(this.titleInterval);
    const original = document.title;
    let flag = false;
    this.setFaviconBadge(true); // показываем точку
    this.titleInterval = setInterval(() => {
      document.title = flag ? `🔔 ${original}` : original;
      flag = !flag;
    }, 1000);
  }

  setFaviconBadge(show) {
    const links = document.querySelectorAll("link[rel*='icon']");
    links.forEach(link => link.remove());

    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';

    if (!show) {
      link.href = '/favicon.png';
      document.head.appendChild(link);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/favicon.png?' + Date.now();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 32, 32);
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(28, 4, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      link.href = canvas.toDataURL('image/png');
      document.head.appendChild(link);
    };
    img.onerror = () => {
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(28, 4, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      link.href = canvas.toDataURL('image/png');
      document.head.appendChild(link);
    };
  }
  handleMessage(msg) {
    WebSocketService.handleMessage(msg);
  }
  drawSingleStroke(ctx, stroke) {
    CanvasService.drawStroke(ctx, stroke);
  }
  renderBrushStroke(ctx, stroke, isEraser) {
    CanvasService.renderBrushStroke(ctx, stroke, isEraser);
  }

  setupAutoSave() {
    setInterval(() => {
      if (AutoSaveService.shouldSave() && !this.isConnected) {
        this.performAutoSave();
      }
    }, 1000);

    window.addEventListener('beforeunload', () => {
      if (!this.isConnected && AutoSaveService.hasChanges) {
        this.performAutoSave();
      }
    });

    AutoSaveService.cleanupAllOldSaves();
  }

  performAutoSave() {
    const data = {
      strokes: HistoryService.getStrokes(),
      zoom: CanvasService.zoom,
      showGrid: CanvasService.showGrid,
      toolName: this.canvas ? 'brush' : 'brush',
      strokeColor: '#000000',
      fillColor: '#000000',
      lineWidth: 1,
      strokeOpacity: 1,
      sessionId: WebSocketService.sessionId
    };

    AutoSaveService.save(data, this.currentRoomId);
  }

  checkForAutoSave() {
    try {
      const savedData = AutoSaveService.restore(this.currentRoomId);

      if (savedData && savedData.strokes && savedData.strokes.length > 0 && savedData.timestamp) {
        this.restoreTimestamp = savedData.timestamp;
        this.showRestoreDialog = true;
        return savedData;
      }

      this.showRestoreDialog = false;
      this.restoreTimestamp = null;
      return null;
    } catch (error) {
      this.showRestoreDialog = false;
      this.restoreTimestamp = null;
      AutoSaveService.clear(this.currentRoomId);
      return null;
    }
  }

  restoreAutoSave() {
    const savedData = AutoSaveService.restore(this.currentRoomId);

    if (savedData) {
      HistoryService.setStrokes(savedData.strokes);
      CanvasService.rebuildBuffer(savedData.strokes);
      CanvasService.redraw();

      if (savedData.canvasState) {
        if (savedData.canvasState.zoom) {
          CanvasService.setZoom(savedData.canvasState.zoom);
        }
        if (savedData.canvasState.showGrid) {
          CanvasService.toggleGrid();
        }
      }
    }

    this.showRestoreDialog = false;
    this.restoreTimestamp = null;
  }

  discardAutoSave() {
    AutoSaveService.clear(this.currentRoomId);
    this.showRestoreDialog = false;
    this.restoreTimestamp = null;
  }

  setShowRestoreDialog(val) {
    this.showRestoreDialog = val;
  }
  
  setRoomError(val) {
    this.roomError = val;
  }
  
  clearRoomError() {
    this.roomError = null;
  }
}

const canvasState = new CanvasState();
export default canvasState;
