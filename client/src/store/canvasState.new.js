import { makeAutoObservable } from "mobx";
import CanvasService from "../services/CanvasService";
import WebSocketService from "../services/WebSocketService";
import HistoryService from "../services/HistoryService";

export const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://paint-online-back.onrender.com';
export const WS_URL = window.location.hostname === 'localhost' 
  ? 'ws://localhost:5000' 
  : 'wss://paint-online-back.onrender.com';

/**
 * CanvasState - main coordinator for canvas application
 * Delegates to specialized services, maintains observable state
 */
class CanvasState {
  // Connection state
  currentRoomId = null;
  username = "";
  usernameReady = false;
  isConnected = false;
  isDrawing = false;

  // Users and chat
  users = [];
  chatMessages = [];

  constructor() {
    makeAutoObservable(this);
    this.setupServiceListeners();
  }

  /**
   * Setup listeners for service events
   */
  setupServiceListeners() {
    // WebSocket events
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

    // History events
    HistoryService.on('strokeAdded', () => {
      CanvasService.redraw();
    });

    HistoryService.on('strokeUndone', () => {
      CanvasService.rebuildBuffer(HistoryService.getStrokes());
      CanvasService.redraw();
    });

    HistoryService.on('strokeRedone', () => {
      CanvasService.redraw();
    });

    HistoryService.on('strokesCleared', () => {
      CanvasService.rebuildBuffer([]);
      CanvasService.redraw();
    });
  }

  // Canvas management
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

  // WebSocket management
  get socket() {
    return WebSocketService.socket;
  }

  get sessionid() {
    return WebSocketService.sessionId;
  }

  setSocket(socket) {
    // Legacy compatibility - not needed with new service
  }

  setSessionId(id) {
    // Legacy compatibility - not needed with new service
  }

  // History management
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
    }
  }

  undo() {
    const removed = HistoryService.undo(this.username);
    if (removed && WebSocketService.isConnected) {
      WebSocketService.sendDraw({ type: "undo", strokeId: removed.id });
    }
  }

  redo() {
    const restored = HistoryService.redo(this.username);
    if (restored && WebSocketService.isConnected) {
      WebSocketService.sendDraw({ type: "redo", stroke: restored });
    }
  }

  undoRemote(strokeId) {
    HistoryService.undoById(strokeId);
  }

  redoRemote(stroke) {
    HistoryService.redoStroke(stroke);
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
  }

  // User management
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

  // Chat management
  addChatMessage(msg) {
    this.chatMessages.push(msg);
  }

  sendChatMessage(message) {
    if (WebSocketService.isConnected) {
      WebSocketService.sendChat(message);
      this.addChatMessage({ type: "chat", username: this.username, message });
    }
  }

  // Connection management
  async connectToRoom(roomId, username) {
    try {
      await WebSocketService.connect(WS_URL, roomId, username);
      this.setCurrentRoomId(roomId);
      this.setUsername(username);
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  disconnect() {
    WebSocketService.disconnect();
    this.isConnected = false;
    this.username = "local";
    HistoryService.clearStrokes();
    this.users = [];
    this.chatMessages = [];
    CanvasService.rebuildBuffer([]);
    CanvasService.redraw();
  }

  // Legacy compatibility methods
  handleMessage(msg) {
    WebSocketService.handleMessage(msg);
  }

  drawSingleStroke(ctx, stroke) {
    CanvasService.drawStroke(ctx, stroke);
  }

  renderBrushStroke(ctx, stroke, isEraser) {
    CanvasService.renderBrushStroke(ctx, stroke, isEraser);
  }
}

const canvasState = new CanvasState();
export default canvasState;
