import { makeAutoObservable, observable } from "mobx";

class CanvasState {
  canvas = null;
  socket = null;
  sessionid = null;
  username = "";
  userActions = []; // все действия всех пользователей

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

  addUserAction(action) {
    const id = action.id || `${Date.now()}-${Math.random()}`;
    this.userActions.push({
      ...action,
      id,
      timestamp: Date.now(),
      author: action.author || this.username,
    });
    this.redrawCanvas();
  }

  undo() {
    const last = [...this.userActions].reverse().find(
      (a) => a.author === this.username && !a.undone
    );
    if (!last) return;
    last.undone = true;
    last.undoneAt = Date.now();
    this.redrawCanvas();
    this.socket?.send(
      JSON.stringify({
        method: "undo",
        id: this.sessionid,
        username: this.username,
        actionId: last.id,
      })
    );
  }

  redo() {
    const last = [...this.userActions].reverse().find(
      (a) => a.author === this.username && a.undone
    );
    if (!last) return;
    delete last.undone;
    delete last.undoneAt;
    this.redrawCanvas();
    this.socket?.send(
      JSON.stringify({
        method: "redo",
        id: this.sessionid,
        username: this.username,
        actionId: last.id,
      })
    );
  }

  handleRemoteUndo(actionId, fromUsername) {
    const action = this.userActions.find(
      (a) => a.id === actionId && a.author === fromUsername
    );
    if (action) {
      action.undone = true;
      action.undoneAt = Date.now();
      this.redrawCanvas();
    }
  }

  handleRemoteRedo(actionId, fromUsername) {
    const action = this.userActions.find(
      (a) => a.id === actionId && a.author === fromUsername
    );
    if (action && action.undone) {
      delete action.undone;
      delete action.undoneAt;
      this.redrawCanvas();
    }
  }

  redrawCanvas() {
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const sorted = [...this.userActions].sort((a, b) => a.timestamp - b.timestamp);
    for (const action of sorted) {
      if (action.undone) continue;
      this.drawAction(ctx, action);
    }
  }

  drawAction(ctx, action) {
    ctx.save();
    switch (action.type) {
      case "brush":
        ctx.strokeStyle = action.strokeStyle;
        ctx.lineWidth = action.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const pts = action.points;
        if (pts.length === 1) {
          ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.stroke();
        }
        break;

      case "eraser":
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = action.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const ep = action.points;
        ctx.moveTo(ep[0].x, ep[0].y);
        for (let i = 1; i < ep.length; i++) {
          ctx.lineTo(ep[i].x, ep[i].y);
        }
        ctx.stroke();
        break;

      case "rect":
        ctx.strokeStyle = action.strokeStyle;
        ctx.lineWidth = action.lineWidth;
        ctx.strokeRect(action.x, action.y, action.width, action.height);
        break;

      case "circle":
        ctx.strokeStyle = action.strokeStyle;
        ctx.lineWidth = action.lineWidth;
        ctx.beginPath();
        ctx.arc(action.x, action.y, action.radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case "line":
        ctx.strokeStyle = action.strokeStyle;
        ctx.lineWidth = action.lineWidth;
        ctx.beginPath();
        ctx.moveTo(action.x1, action.y1);
        ctx.lineTo(action.x2, action.y2);
        ctx.stroke();
        break;
    }
    ctx.restore();
  }
}

export default new CanvasState();
