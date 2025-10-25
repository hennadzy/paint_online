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
  undoList = [];
  redoList = [];

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
    // ✅ Гарантируем, что username всегда установлен
    if (!stroke.username || stroke.username === "local") {
      stroke.username = this.username || "local";
    }
    this.strokeList.push(stroke);
    this.undoList.push([...this.strokeList]);
    this.redoList = [];
  }

  undo() {
    const lastIndex = this.strokeList.map(s => s.username).lastIndexOf(this.username || "local");
    if (lastIndex !== -1) {
      this.redoList.push([...this.strokeList]);
      this.strokeList.splice(lastIndex, 1);
      this.redrawCanvas();
      this.sendUndoRedo("undo");
    }
  }

  redo() {
    if (this.redoList.length > 0) {
      this.undoList.push([...this.strokeList]);
      this.strokeList = this.redoList.pop();
      this.redrawCanvas();
      this.sendUndoRedo("redo");
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
          dataURL: this.canvas.toDataURL()
        }
      }));
    }
  }
}

export default new CanvasState();
