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
  roomModalOpen = false;
  roomMode = 'create';
  publicRooms = [];
  createdRoomId = null;
  createdRoomLink = '';
  showRestoreDialog = false;
  restoreTimestamp = null;

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
    WebSocketService.on('drawsReceived', ({ strokes }) => {
      HistoryService.setStrokes(strokes);
      CanvasService.rebuildBuffer(strokes);
      CanvasService.redraw();
    });
    WebSocketService.on('drawReceived', ({ username, figure }) => {
      if (username === this.username) return;
      switch (figure.type) {
        case "undo":
          this.undoRemote(figure.strokeId);
          break;
        case "redo":
          this.redoRemote(figure.stroke);
          break;
        default:
          this.pushStroke(figure);
          break;
      }
    });
    WebSocketService.on('clearReceived', ({ username }) => {
      if (username !== this.username) {
        HistoryService.clearStrokes();
        CanvasService.rebuildBuffer([]);
        CanvasService.redraw();
        this.addChatMessage({ type: "system", username, message: `очистил холст` });
      }
    });
    WebSocketService.on('chatReceived', ({ username, message }) => {
      if (username !== this.username) {
        this.addChatMessage({ type: "chat", username, message });
      }
    });
    HistoryService.on('strokeAdded', () => {
      CanvasService.redraw();
    });
    HistoryService.on('strokeUndone', () => {
      CanvasService.rebuildBuffer(HistoryService.getStrokes());
      CanvasService.redraw();
    });
    HistoryService.on('strokeRedone', ({ stroke }) => {
      CanvasService.drawStroke(CanvasService.bufferCtx, stroke);
      CanvasService.redraw();
    });
    HistoryService.on('strokesCleared', () => {
      CanvasService.rebuildBuffer([]);
      CanvasService.redraw();
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
  get sessionid() {
    return WebSocketService.sessionId;
  }
  setSocket() {}
  setSessionId() {}

  get strokeList() {
    return HistoryService.getStrokes();
  }
  set strokeList(strokes) {
    HistoryService.setStrokes(strokes);
  }
  get redoStacks() {
    return HistoryService.redoStacks;
  }

  pushStroke(stroke) {
    const added = HistoryService.addStroke(stroke, this.username);
    if (added) {
      CanvasService.drawStroke(CanvasService.bufferCtx, stroke);
      CanvasService.redraw();
      AutoSaveService.markChanged();
    }
  }

  undo() {
    const removed = HistoryService.undo(this.username);
    if (removed && WebSocketService.isConnected) {
      WebSocketService.sendDraw({ type: "undo", strokeId: removed.id });
    }
    if (removed) {
      AutoSaveService.markChanged();
    }
  }

  redo() {
    const restored = HistoryService.redo(this.username);
    if (restored) {
      if (WebSocketService.isConnected) {
        WebSocketService.sendDraw({ type: "redo", stroke: restored });
      } else {
        CanvasService.drawStroke(CanvasService.bufferCtx, restored);
        CanvasService.redraw();
      }
      AutoSaveService.markChanged();
    }
  }

  undoRemote(strokeId) {
    HistoryService.undoById(strokeId);
  }

  redoRemote(stroke) {
    HistoryService.redoStroke(stroke);
    CanvasService.drawStroke(CanvasService.bufferCtx, stroke);
    CanvasService.redraw();
  }

  clearCanvas() {
    if (!window.confirm('Очистить весь холст? Это действие нельзя отменить.')) {
      return;
    }
    HistoryService.clearStrokes();
    if (WebSocketService.isConnected) {
      WebSocketService.sendClear();
    }
    AutoSaveService.clear(this.currentRoomId);
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
      WebSocketService.sendChat(message);
      this.addChatMessage({ type: "chat", username: this.username, message });
    }
  }

  async connectToRoom(roomId, username, token) {
    try {
      await WebSocketService.connect(WS_URL, roomId, username, token);
      this.setCurrentRoomId(roomId);
      this.setUsername(username);
    } catch (error) {
      throw error;
    }
  }

  disconnect() {
    WebSocketService.disconnect();
    this.isConnected = false;
    const wasInRoom = this.currentRoomId !== null;
    this.currentRoomId = null;
    this.username = "local";
    this.usernameReady = false;
    HistoryService.clearStrokes();
    this.users = [];
    this.chatMessages = [];
    this.setModalOpen(false);
    this.showRestoreDialog = false;
    this.restoreTimestamp = null;
    CanvasService.rebuildBuffer([]);
    CanvasService.redraw();
    if (wasInRoom) {
      AutoSaveService.clear(null);
    }
  }
  setModalOpen(val) {
    this.modalOpen = val;
  }
  setModal(val) {
    this.setModalOpen(val);
  }
  setShowRoomInterface(val) {
    this.showRoomInterface = val;
  }
  setShowAboutModal(val) {
    this.showAboutModal = val;
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
}

const canvasState = new CanvasState();
export default canvasState;
