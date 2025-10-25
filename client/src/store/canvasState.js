import { makeAutoObservable } from "mobx";

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
    this.strokeList.push(stroke);
    this.undoList.push([...this.strokeList]);
    this.redoList = [];
  }

  undo() {
    if (this.undoList.length > 0) {
      this.redoList.push([...this.strokeList]);
      this.strokeList = this.undoList.pop();
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
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.strokeList.forEach((stroke) => {
      if (stroke.type === "brush") {
        const points = stroke.points;
        if (!points || points.length === 0) return;
        ctx.save();
        ctx.strokeStyle = stroke.strokeStyle || "#000000";
        ctx.lineWidth = stroke.lineWidth || 1;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }
      // TODO: поддержка других типов stroke (rect, circle и т.д.)
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
