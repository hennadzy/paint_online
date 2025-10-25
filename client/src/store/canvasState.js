import { makeAutoObservable } from "mobx";
import strokeManager from "./StrokeManager";

class CanvasState {
  layers = new Map(); // username → canvas
  currentLayer = null;
  canvasContainer = null;
  socket = null;
  sessionid = null;
  username = "";

  constructor() {
    makeAutoObservable(this);
  }

  setSessionId(id) {
    this.sessionid = id;
  }

  setSocket(socket) {
    this.socket = socket;
  }

  setUsername(username) {
    this.username = username;
  }

  setCanvasContainer(container) {
    this.canvasContainer = container;
  }

  createLayerForUser(username) {
    if (this.layers.has(username)) return;

    const canvas = document.createElement("canvas");
    canvas.width = this.canvasContainer.offsetWidth;
    canvas.height = this.canvasContainer.offsetHeight;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.zIndex = username === this.username ? "10" : "5";
    canvas.style.pointerEvents = username === this.username ? "auto" : "none";
    canvas.id = `layer-${username}`;

    this.canvasContainer.appendChild(canvas);
    this.layers.set(username, canvas);

    if (username === this.username) {
      this.currentLayer = canvas;
    }
  }

  getLayer(username) {
    return this.layers.get(username);
  }

  undo() {
    const removed = strokeManager.undo(this.username);
    this.redrawCurrentLayer();
    if (this.socket && removed) {
      this.socket.send(JSON.stringify({
        method: "undo",
        id: this.sessionid,
        username: this.username
      }));
    }
  }

  redo() {
    const restored = strokeManager.redo(this.username);
    this.redrawCurrentLayer();
    if (this.socket && restored) {
      this.socket.send(JSON.stringify({
        method: "redo",
        id: this.sessionid,
        username: this.username
      }));
    }
  }

  redrawCurrentLayer() {
    const canvas = this.currentLayer;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const strokes = strokeManager.getStrokes(this.username);
    strokes.forEach((stroke) => {
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const points = stroke.points;
      if (points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      }
      ctx.restore();
    });
  }
}

export default new CanvasState();
