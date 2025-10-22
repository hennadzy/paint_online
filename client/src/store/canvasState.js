import { makeAutoObservable, observable } from "mobx";

class CanvasState {
  canvas = null;
  socket = null;
  sessionid = null;
  username = "";

  actions = [];        // История действий текущего пользователя
  undoneActions = [];  // Отменённые действия (для redo)

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

  addAction(action) {
    this.actions.push(action);
    this.undoneActions = []; // Очистить redo после нового действия
  }

  undo() {
    if (this.actions.length === 0) return;
    const last = this.actions.pop();
    this.undoneActions.push(last);
    this.redrawCanvas();
  }

  redo() {
    if (this.undoneActions.length === 0) return;
    const restored = this.undoneActions.pop();
    this.actions.push(restored);
    this.redrawCanvas();
  }

  redrawCanvas() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const action of this.actions) {
      switch (action.type) {
        case "brush":
          ctx.strokeStyle = action.color;
          ctx.lineWidth = action.lineWidth;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(action.x, action.y);
          ctx.lineTo(action.x, action.y); // можно улучшить, если хранить путь
          ctx.stroke();
          break;

        case "rect":
          ctx.strokeStyle = action.color;
          ctx.lineWidth = action.lineWidth;
          ctx.strokeRect(action.x, action.y, action.width, action.height);
          break;

        case "circle":
          ctx.strokeStyle = action.color;
          ctx.lineWidth = action.lineWidth;
          ctx.beginPath();
          ctx.arc(action.x, action.y, action.radius, 0, 2 * Math.PI);
          ctx.stroke();
          break;

        case "line":
          ctx.strokeStyle = action.color;
          ctx.lineWidth = action.lineWidth;
          ctx.beginPath();
          ctx.moveTo(action.x1, action.y1);
          ctx.lineTo(action.x2, action.y2);
          ctx.stroke();
          break;

        case "eraser":
          ctx.globalCompositeOperation = "destination-out";
          ctx.lineWidth = action.lineWidth;
          ctx.beginPath();
          ctx.moveTo(action.x, action.y);
          ctx.lineTo(action.x, action.y);
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
          break;

        default:
          console.warn("Неизвестный тип действия:", action.type);
      }
    }
  }
}

export default new CanvasState();
