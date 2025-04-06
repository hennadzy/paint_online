import Tool from "./Tool";
import toolState from "../store/toolState";

export default class Eraser extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.previousFillColor = null; // Предыдущий цвет заливки
    this.previousStrokeColor = null; // Предыдущий цвет обводки
    this.mouseDown = false;
    this._touchStartHandler = this.touchStartHandler.bind(this);
    this._touchMoveHandler = this.touchMoveHandler.bind(this);
    this._touchEndHandler = this.touchEndHandler.bind(this);
    this.savePreviousColors(); // Сохраняем цвета при создании ластика
    this.destroyEvents();
    this.listen();
  }

  // Сохраняем предыдущие цвета (обводки и заливки)
  savePreviousColors() {
    this.previousFillColor = this.ctx.fillStyle;
    this.previousStrokeColor = this.ctx.strokeStyle;
    // Устанавливаем цвет ластика (белый)
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.strokeStyle = "#FFFFFF";
  }

  // Восстанавливаем предыдущие цвета после переключения инструмента
  restorePreviousColors() {
    if (this.previousFillColor) {
      this.ctx.fillStyle = this.previousFillColor;
    }
    if (this.previousStrokeColor) {
      this.ctx.strokeStyle = this.previousStrokeColor;
    }
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.onmouseup = null;
    this.canvas.removeEventListener("touchstart", this._touchStartHandler);
    this.canvas.removeEventListener("touchmove", this._touchMoveHandler);
    this.canvas.removeEventListener("touchend", this._touchEndHandler);
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
    this.canvas.addEventListener("touchstart", this._touchStartHandler, { passive: false });
    this.canvas.addEventListener("touchmove", this._touchMoveHandler, { passive: false });
    this.canvas.addEventListener("touchend", this._touchEndHandler, { passive: false });
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    this.sendEraseData(e.clientX - rect.left, e.clientY - rect.top, true);
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      this.sendEraseData(e.clientX - rect.left, e.clientY - rect.top);
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
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    this.sendEraseData(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      this.sendEraseData(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    }
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

  sendEraseData(x, y, isStart = false) {
    const lineWidth = this.ctx.lineWidth;
    const strokeStyle = "#FFFFFF"; // Цвет ластика (белый)

    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          username: this.username,
          figure: {
            type: "eraser",
            x,
            y,
            isStart,
            lineWidth,
            strokeStyle,
          },
        })
      );
    }

    Eraser.staticDraw(this.ctx, x, y, lineWidth, strokeStyle, isStart);
  }

  static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";

    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
}
