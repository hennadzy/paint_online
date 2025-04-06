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

    const { x, y } = this.getCoordinates(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.sendDrawData(x, y, true);
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const { x, y } = this.getCoordinates(e);
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

    const { x, y } = this.getTouchCoordinates(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.sendDrawData(x, y, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const { x, y } = this.getTouchCoordinates(e);
    this.sendDrawData(x, y, false);
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
    const { lineWidth, strokeStyle } = this.ctx;

    if (isLocal) {
      // Локальная отрисовка с текущим цветом
      Brush.staticDraw(this.ctx, x, y, lineWidth, strokeStyle, isStart);
    }

    if (this.socket) {
      // Отправка через WebSocket
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
            strokeStyle, // Передаётся текущий цвет рисующего
            isStart,
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

  // Получение координат мыши с учётом масштабирования
  getCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (e.clientX - rect.left) * ratio,
      y: (e.clientY - rect.top) * ratio,
    };
  }

  // Получение координат для сенсорных событий с учётом масштабирования
  getTouchCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (e.touches[0].clientX - rect.left) * ratio,
      y: (e.touches[0].clientY - rect.top) * ratio,
    };
  }
}
