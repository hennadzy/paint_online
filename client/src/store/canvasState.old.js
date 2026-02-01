import { makeAutoObservable } from "mobx";
import axios from "axios";
import Rect from "../tools/Rect";
import Circle from "../tools/Circle";
import Line from "../tools/Line";
import Text from "../tools/Text";
import Fill from "../tools/Fill";
import Polygon from "../tools/Polygon";
import Arrow from "../tools/Arrow";

export const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://paint-online-back.onrender.com';
export const WS_URL = window.location.hostname === 'localhost' ? 'ws://localhost:5000' : 'wss://paint-online-back.onrender.com';

class CanvasState {
  canvas = null;
  ctx = null;
  bufferCanvas = null;
  bufferCtx = null;
  socket = null;
  sessionid = null;
  currentRoomId = null;
  username = "";
  usernameReady = false;
  strokeList = [];
  redoStacks = new Map();
  isDrawing = false;
  isConnected = false;
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
  showGrid = false;
  zoom = 1;

  constructor() {
    makeAutoObservable(this);
  }

  setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    
    this.bufferCanvas = document.createElement('canvas');
    this.bufferCanvas.width = canvas.width;
    this.bufferCanvas.height = canvas.height;
    this.bufferCtx = this.bufferCanvas.getContext('2d', { willReadFrequently: true });
    this.bufferCtx.fillStyle = "white";
    this.bufferCtx.fillRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
  }

  setSocket(socket) {
    this.socket = socket;
  }

  setSessionId(id) {
    this.sessionid = id;
  }

  setUsername(username) {
    this.username = username;
    this.usernameReady = username && username !== 'local';
  }


  drawSingleStroke(ctx, stroke) {
      if (!stroke) return;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.lineWidth = stroke.lineWidth || 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      switch (stroke.type) {
        case "brush":
        case "eraser":
          this.renderBrushStroke(ctx, stroke, stroke.type === "eraser");
          break;
        case "rect":
          Rect.staticDraw(ctx, stroke.x, stroke.y, stroke.width, stroke.height, stroke.strokeStyle, stroke.lineWidth);
          break;
        case "circle":
          Circle.staticDraw(ctx, stroke.x, stroke.y, stroke.radius, stroke.strokeStyle, stroke.lineWidth);
          break;
        case "line":
          Line.staticDraw(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.strokeStyle, stroke.lineWidth);
          break;
        case "arrow":
          Arrow.staticDraw(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.strokeStyle, stroke.lineWidth, stroke.opacity);
          break;
        case "polygon":
          Polygon.staticDraw(ctx, stroke.points, stroke.strokeStyle, stroke.lineWidth, stroke.opacity);
          break;
        case "text":
          Text.staticDraw(ctx, stroke.x, stroke.y, stroke.text, stroke.fontSize, stroke.fontFamily, stroke.strokeStyle, stroke.width || 200, stroke.opacity ?? 1);
          break;
        case "fill":
          Fill.staticDraw(ctx, stroke.x, stroke.y, stroke.fillColor);
          break;
        case "fill_image":
          ctx.putImageData(stroke.imageData, 0, 0);
          break;
        default:
          break;
      }
      ctx.restore();
  }

  rebuildBuffer() {
    if (!this.bufferCtx) return;
    this.bufferCtx.clearRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    this.bufferCtx.fillStyle = "white";
    this.bufferCtx.fillRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    this.bufferCtx.globalCompositeOperation = "source-over";
    this.strokeList.forEach(stroke => this.drawSingleStroke(this.bufferCtx, stroke));
  }

  pushStroke(stroke) {
    if (stroke.id && this.strokeList.some(s => s.id === stroke.id)) return;
    if (!stroke.username || stroke.username === "local") {
      stroke.username = this.username || "local";
    }
    this.strokeList.push(stroke);
    this.drawSingleStroke(this.bufferCtx, stroke);
    const user = stroke.username;
    this.redoStacks.set(user, []);
  }

  undo() {
    const user = this.username || "local";
    const index = [...this.strokeList].reverse().findIndex(s => s.username === user);
    if (index !== -1) {
      const actualIndex = this.strokeList.length - 1 - index;
      const removed = this.strokeList.splice(actualIndex, 1)[0];
      if (!this.redoStacks.has(user)) this.redoStacks.set(user, []);
      this.redoStacks.get(user).push(removed);
      
      this.rebuildBuffer();
      this.redrawCanvas();

      if (this.socket) {
        this.socket.send(JSON.stringify({
          method: "draw",
          id: this.sessionid,
          username: this.username,
          figure: { type: "undo", strokeId: removed.id }
        }));
      }
    }
  }

  redo() {
    const user = this.username || "local";
    const stack = this.redoStacks.get(user);
    if (stack && stack.length > 0) {
      const restored = stack.pop();
      this.strokeList.push(restored);
      this.drawSingleStroke(this.bufferCtx, restored);
      this.redrawCanvas();

      if (this.socket) {
        this.socket.send(JSON.stringify({
          method: "draw",
          id: this.sessionid,
          username: this.username,
          figure: { type: "redo", stroke: restored }
        }));
      }
    }
  }

  undoRemote(strokeId) {
    const idx = this.strokeList.findIndex(s => s.id === strokeId);
    if (idx !== -1) {
      const removed = this.strokeList.splice(idx, 1)[0];
      const stack = this.redoStacks.get(removed.username) || [];
      stack.push(removed);
      this.redoStacks.set(removed.username, stack);
      this.rebuildBuffer();
      this.redrawCanvas();
    }
  }

  redoRemote(stroke) {
    this.pushStroke(stroke);
    this.redrawCanvas();
  }

  redrawCanvas() {
    if (!this.ctx || !this.bufferCanvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.drawImage(this.bufferCanvas, 0, 0);
    
    if (this.showGrid) {
      this.drawGrid();
    }
  }

  drawGrid() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const gridSize = 20;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  setIsConnected(val) {
    this.isConnected = val;
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

  setCurrentRoomId(id) {
    this.currentRoomId = id;
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.redrawCanvas();
  }

  setZoom(zoom) {
    this.zoom = Math.max(0.5, Math.min(3, zoom));
    if (this.canvas) {
      // Always maintain 720x480 aspect ratio (3:2)
      const aspectRatio = 720 / 480;
      let baseWidth, baseHeight;
      
      if (window.innerWidth < 768) {
        // Mobile: fit to screen width
        baseWidth = window.innerWidth;
        baseHeight = baseWidth / aspectRatio;
      } else {
        // Desktop: use fixed size
        baseWidth = 720;
        baseHeight = 480;
      }
      
      const newWidth = baseWidth * this.zoom;
      const newHeight = baseHeight * this.zoom;
      
      this.canvas.style.width = `${newWidth}px`;
      this.canvas.style.height = `${newHeight}px`;
      
      // Update cursor overlay to match canvas size
      const cursorOverlay = document.querySelector('.cursor-overlay');
      if (cursorOverlay) {
        cursorOverlay.style.width = `${newWidth}px`;
        cursorOverlay.style.height = `${newHeight}px`;
      }
    }
  }

  zoomIn() {
    this.setZoom(this.zoom + 0.1);
  }

  zoomOut() {
    this.setZoom(this.zoom - 0.1);
  }

  clearCanvas() {
    if (!window.confirm('Очистить весь холст? Это действие нельзя отменить.')) {
      return;
    }
    this.strokeList = [];
    this.redoStacks.clear();
    this.rebuildBuffer();
    this.redrawCanvas();
    
    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "clear",
        id: this.sessionid,
        username: this.username
      }));
    }
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

  disconnect() {
    if (this.socket) {
        this.socket.close();
    }
    this.isConnected = false;
    this.username = "local";
    this.strokeList = [];
    this.redoStacks.clear();
    this.users = [];
    this.chatMessages = [];
    this.setModalOpen(false);
    this.rebuildBuffer();
    this.redrawCanvas();
  }

  renderBrushStroke(ctx, stroke, isEraser = false) {
    const { points, lineWidth = 1, strokeStyle = '#000000', strokeOpacity = 1 } = stroke;
    if (!points || points.length === 0) return;
    
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (!isEraser && strokeStyle) {
        const r = parseInt(strokeStyle.slice(1, 3), 16);
        const g = parseInt(strokeStyle.slice(3, 5), 16);
        const b = parseInt(strokeStyle.slice(5, 7), 16);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${strokeOpacity})`;
    } else {
        ctx.strokeStyle = strokeStyle;
    }

    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.beginPath();
    
    if (points.length === 1) {
      ctx.arc(points[0].x, points[0].y, lineWidth / 2, 0, 2 * Math.PI);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  handleMessage(msg) {
    if (msg.method === "connection") {
      this.addUser(msg.username);
      this.addChatMessage({ type: "system", username: msg.username, message: `вошел в комнату` });
      this.setIsConnected(true);
    } else if (msg.method === "disconnection") {
      this.removeUser(msg.username);
      this.addChatMessage({ type: "system", username: msg.username, message: `покинул комнату` });
    } else if (msg.method === "chat") {
      if (msg.username !== this.username) {
        this.addChatMessage({ type: "chat", username: msg.username, message: msg.message });
      }
    } else if (msg.method === "users") {
      this.users = msg.users;
    } else if (msg.method === "draws") {
      this.strokeList = msg.strokes;
      this.rebuildBuffer();
      this.redrawCanvas();
    } else if (msg.method === "clear") {
      if (msg.username !== this.username) {
        this.strokeList = [];
        this.redoStacks.clear();
        this.rebuildBuffer();
        this.redrawCanvas();
        this.addChatMessage({ type: "system", username: msg.username, message: `очистил холст` });
      }
    } else if (msg.method === "draw") {
      if (!msg.username || msg.username === this.username) return;
      const figure = msg.figure;
      switch (figure.type) {
        case "undo":
          this.undoRemote(figure.strokeId);
          break;
        case "redo":
          this.redoRemote(figure.stroke);
          break;
        default:
          this.pushStroke(figure);
          this.redrawCanvas();
          break;
      }
    }
  }
}

const canvasState = new CanvasState();
export default canvasState;
