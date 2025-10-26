import { makeAutoObservable } from "mobx";
import Rect from "../tools/Rect";
import Circle from "../tools/Circle";
import Line from "../tools/Line";

class CanvasState {
  canvas = null;
  socket = null;
  sessionid = null;
  username = "";
  strokeList = [];
  redoStacks = new Map(); // username → [stroke]
  isDrawing = false;

  constructor() {
    makeAutoObservable(this);
  }

  setCanvas(canvas) {
    this.canvas = canvas;
  }

  setSocket(socket) {
    this.socket = socket;
  }

  setSessionId(id) {
    this.sessionid = id;
  }

  setUsername(username) {
    this.username = username;
  }

  pushStroke(stroke) {
    if (!stroke.username || stroke.username === "local") {
      stroke.username = this.username || "local";
    }

    const isDuplicate = this.strokeList.some(s =>
      s.type === stroke.type &&
      s.username === stroke.username &&
      JSON.stringify(s) === JSON.stringify(stroke)
    );
    if (isDuplicate) return;

    this.strokeList.push(stroke);
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
      this.redrawCanvas();
      this.sendUndoRedo("undo");
    }
  }

  redo() {
    const user = this.username || "local";
    const stack = this.redoStacks.get(user);
    if (stack && stack.length > 0) {
      const restored = stack.pop();
      this.strokeList.push(restored);
      this.redrawCanvas();

      if (this.socket) {
        this.socket.send(JSON.stringify({
          method: "draw",
          id: this.sessionid,
          username: this.username,
          figure: restored
        }));
      }
    }
  }

  undoRemote(username) {
    const index = [...this.strokeList].reverse().findIndex(s => s.username === username);
    if (index !== -1) {
      const actualIndex = this.strokeList.length - 1 - index;
      const removed = this.strokeList.splice(actualIndex, 1)[0];
      if (!this.redoStacks.has(username)) this.redoStacks.set(username, []);
      this.redoStacks.get(username).push(removed);
      this.redrawCanvas();
    }
  }

  redoRemote(username) {
    const stack = this.redoStacks.get(username);
    if (stack && stack.length > 0) {
      const restored = stack.pop();
      this.strokeList.push(restored);
      this.redrawCanvas();
    }
  }

  redrawCanvas() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    requestAnimationFrame(() => {
      this.strokeList.forEach((stroke) => {
        ctx.save();
        ctx.lineWidth = stroke.lineWidth || 1;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        switch (stroke.type) {
          case "brush":
          case "eraser":
            const points = stroke.points;
            if (!points || points.length === 0) break;
            ctx.strokeStyle = stroke.type === "eraser" ? "rgba(0,0,0,1)" : stroke.strokeStyle || "#000000";
            ctx.globalCompositeOperation = stroke.type === "eraser" ? "destination-out" : "source-over";
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
            break;
          case "rect":
            ctx.globalCompositeOperation = "source-over";
            Rect.staticDraw(ctx, stroke.x, stroke.y, stroke.width, stroke.height, stroke.strokeStyle, stroke.lineWidth);
            break;
          case "circle":
            ctx.globalCompositeOperation = "source-over";
            Circle.staticDraw(ctx, stroke.x, stroke.y, stroke.radius, stroke.strokeStyle, stroke.lineWidth);
            break;
          case "line":
            ctx.globalCompositeOperation = "source-over";
            Line.staticDraw(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.strokeStyle, stroke.lineWidth);
            break;
          default:
            console.warn("Неизвестный тип фигуры:", stroke.type);
        }
        ctx.restore();
      });
    });
  }

  sendUndoRedo(type) {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.sessionid,
        username: this.username,
        figure: {
          type,
          username: this.username
        }
      }));
    }
  }
}

const canvasState = new CanvasState();
export default canvasState;
