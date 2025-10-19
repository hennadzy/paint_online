import { makeAutoObservable, observable } from "mobx";

class CanvasState {
  canvas = null;
  socket = null;
  sessionid = null;
  username = "";
  undoList = []; // [{ type: "draw", figure: {...} }]
  redoList = [];

  constructor() {
    makeAutoObservable(this, {
      canvas: observable,
    });
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

  setCanvas(canvas) {
    this.canvas = canvas;
  }

  pushToUndo(action) {
    if (action?.type === "draw" && action.figure?.username === this.username) {
      this.undoList.push(action);
    }
  }

  pushToRedo(action) {
    if (action?.type === "draw" && action.figure?.username === this.username) {
      this.redoList.push(action);
    }
  }

  applyFigure(figure) {
    const ctx = this.canvas.getContext("2d");
    ctx.save();

    switch (figure.type) {
      case "brush":
        ctx.strokeStyle = figure.strokeStyle || "#000000";
        ctx.lineWidth = figure.lineWidth || 1;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        if (figure.isStart) {
          ctx.moveTo(figure.x, figure.y);
          ctx.lineTo(figure.x + 0.01, figure.y + 0.01); // минимальный штрих
        } else {
          ctx.moveTo(figure.lastX ?? figure.x, figure.lastY ?? figure.y);
          ctx.lineTo(figure.x, figure.y);
        }
        ctx.stroke();
        break;

      case "eraser":
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = figure.lineWidth || 10;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        if (figure.isStart) {
          ctx.moveTo(figure.x, figure.y);
          ctx.lineTo(figure.x + 0.01, figure.y + 0.01);
        } else {
          ctx.moveTo(figure.lastX ?? figure.x, figure.lastY ?? figure.y);
          ctx.lineTo(figure.x, figure.y);
        }
        ctx.stroke();
        break;

      case "rect":
        ctx.strokeStyle = figure.strokeStyle || "#000000";
        ctx.lineWidth = figure.lineWidth || 1;
        ctx.beginPath();
        ctx.strokeRect(figure.x, figure.y, figure.width, figure.height);
        break;

      case "circle":
        ctx.strokeStyle = figure.strokeStyle || "#000000";
        ctx.lineWidth = figure.lineWidth || 1;
        ctx.beginPath();
        ctx.arc(figure.x, figure.y, figure.radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case "line":
        ctx.strokeStyle = figure.strokeStyle || "#000000";
        ctx.lineWidth = figure.lineWidth || 1;
        ctx.beginPath();
        ctx.moveTo(figure.x1, figure.y1);
        ctx.lineTo(figure.x2, figure.y2);
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  redrawFromUndo() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const action of this.undoList) {
      if (action.type === "draw" && action.figure?.username === this.username) {
        this.applyFigure(action.figure);
      }
    }
  }

  undo() {
    if (this.undoList.length === 0) return;

    const last = this.undoList.pop();
    this.pushToRedo(last);

    this.redrawFromUndo();
    this.syncCanvas();
  }

  redo() {
    if (this.redoList.length === 0) return;

    const action = this.redoList.pop();
    this.pushToUndo(action);

    this.redrawFromUndo();
    this.syncCanvas();
  }

  syncCanvas() {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "sync",
        id: this.sessionid,
        img: this.canvas.toDataURL()
      }));
    }
  }
}

export default new CanvasState();
