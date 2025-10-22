import { makeAutoObservable, observable } from "mobx";

class CanvasState {
  canvas = null;
  socket = null;
  sessionid = null;
  username = "";

  undoList = [];
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

  pushToUndo(data) {
    this.undoList.push(data);
    this.redoList = []; // сбрасываем redo после нового действия
  }

  pushToRedo(data) {
    this.redoList.push(data);
  }

  undo() {
    const ctx = this.canvas.getContext("2d");
    if (this.undoList.length > 0) {
      const dataUrl = this.undoList.pop();
      this.pushToRedo(this.canvas.toDataURL());

      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      };

      // 🔁 Отправляем событие undo другим пользователям
      if (this.socket && this.sessionid && this.username) {
        this.socket.send(JSON.stringify({
          method: "undo",
          id: this.sessionid,
          username: this.username
        }));
      }
    }
  }

  redo() {
    const ctx = this.canvas.getContext("2d");
    if (this.redoList.length > 0) {
      const dataUrl = this.redoList.pop();
      this.pushToUndo(this.canvas.toDataURL());

      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      };
    }
  }
}

export default new CanvasState();
