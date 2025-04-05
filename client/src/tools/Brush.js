import Tool from "./Tool";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;
    this.destroyEvents();
    this.listen();
  }

  listen() {
    // Обработчики событий мыши
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);

    // Обработчики сенсорных устройств
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchend", this.touchEndHandler.bind(this), { passive: false });
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);

    // Локальная отрисовка
    Brush.staticDraw(this.ctx, e.clientX - rect.left, e.clientY - rect.top, this.ctx.lineWidth, this.ctx.strokeStyle, true);

    // Отправка данных другим пользователям
    this.sendDrawData(e.clientX - rect.left, e.clientY - rect.top, true);
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Локальная отрисовка
      Brush.staticDraw(this.ctx, x, y, this.ctx.lineWidth, this.ctx.strokeStyle);

      // Передача данных другим пользователям
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
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);

    // Локальная отрисовка
    Brush.staticDraw(this.ctx, e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, this.ctx.lineWidth, this.ctx.strokeStyle, true);

    // Отправка данных другим пользователям
    this.sendDrawData(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();

    // Локальная отрисовка
    Brush.staticDraw(this.ctx, e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, this.ctx.lineWidth, this.ctx.strokeStyle, false);

    // Отправка данных другим пользователям
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

  sendDrawData(x, y, isStart = false) {
    const { lineWidth, strokeStyle } = this.ctx;

    // Локальная отрисовка для рисующего
    Brush.staticDraw(this.ctx, x, y, lineWidth, strokeStyle, isStart);

    // Передача данных через WebSocket другим пользователям
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          figure: {
            type: "brush",
            x,
            y,
            lineWidth,
            strokeStyle,
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
}
