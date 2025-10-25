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

    // 🔒 Предотвращаем дубликаты
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
    const lastIndex = this.strokeList.map(s => s.username).lastIndexOf(user);
    if (lastIndex !== -1) {
      const removed = this.strokeList.splice(lastIndex, 1)[0];
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
      this.sendUndoRedo("redo");
    }
  }

  undoRemote(username) {
    const lastIndex = this.strokeList.map(s => s.username).lastIndexOf(username);
    if (lastIndex !== -1) {
      const removed = this.strokeList.splice(lastIndex, 1)[0];
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

    this.strokeList.forEach((stroke) => {
      ctx.save();
      ctx.strokeStyle = stroke.strokeStyle || "#000000";
      ctx.lineWidth = stroke.lineWidth || 1;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (stroke.type) {
        case "brush":
          const points = stroke.points;
          if (!points || points.length === 0) break;
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.stroke();
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

        case "eraser":
          ctx.globalCompositeOperation = "destination-out";
          ctx.beginPath();
          ctx.moveTo(stroke.x, stroke.y);
          ctx.lineTo(stroke.x + 0.1, stroke.y + 0.1);
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
          break;
      }

      ctx.restore();
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

export default new CanvasState();
 