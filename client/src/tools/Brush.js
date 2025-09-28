import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this._touchStartHandler = this.touchStartHandler.bind(this);
    this._touchMoveHandler = this.touchMoveHandler.bind(this);
    this._touchEndHandler = this.touchEndHandler.bind(this);
    this.mouseDown = false;
    this.destroyEvents();
    this.listen();
  }

  listen() {
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
    this.canvas.addEventListener("touchstart", this._touchStartHandler, { passive: false });
    this.canvas.addEventListener("touchmove", this._touchMoveHandler, { passive: false });
    this.canvas.addEventListener("touchend", this._touchEndHandler, { passive: false });
}


mouseDownHandler(e) {
  this.mouseDown = true;

  // Сохраняем текущее состояние в undoList перед изменениями
  canvasState.pushToUndo(this.canvas.toDataURL());

  const rect = this.canvas.getBoundingClientRect();
  this.ctx.beginPath();
  this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  this.sendDrawData(e.clientX - rect.left, e.clientY - rect.top, true);
}


  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.sendDrawData(x, y, false);
    }
  }

  mouseUpHandler() {
    this.mouseDown = false;
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          figure: { type: "finish" },
        })
      );
    }
  }

  touchStartHandler(e) {
    e.preventDefault();
      canvasState.pushToUndo(this.canvas.toDataURL());
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    this.sendDrawData(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    this.sendDrawData(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, false);
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          figure: { type: "finish" },
        })
      );
    }
  }

sendDrawData(x, y, isStart = false, isLocal = true) {
  const strokeStyle = this.ctx.strokeStyle;
  const lineWidth = this.lineWidth;

  if (isLocal) {
    Brush.staticDraw(this.ctx, x, y, lineWidth, strokeStyle, isStart); // ✅ локальная отрисовка
  }

  if (this.socket) {
    this.socket.send(
      JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: {
          type: "brush",
          x,
          y,
          lineWidth,
          strokeStyle,
          isStart,
          username: this.username,
        },
      })
    );
  }
}



  static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart = false) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
}





 
