import Tool from "./Tool";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;
    this.destroyEvents();
    this.listen();
  }

  listen() {
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);

    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchend", this.touchEndHandler.bind(this), { passive: false });
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Локальная отрисовка
    this.localDraw(x, y, true);

    // Отправка данных другим пользователям
    this.sendDrawData(x, y, true);
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Локальная отрисовка
      this.localDraw(x, y);

      // Отправка данных другим пользователям
      this.sendDrawData(x, y);
    }
  }

  mouseUpHandler() {
    this.mouseDown = false;
    this.sendFinish();
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    // Локальная отрисовка
    this.localDraw(x, y, true);

    // Отправка данных другим пользователям
    this.sendDrawData(x, y, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    // Локальная отрисовка
    this.localDraw(x, y);

    // Отправка данных другим пользователям
    this.sendDrawData(x, y);
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    this.sendFinish();
  }

  sendDrawData(x, y, isStart = false) {
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          figure: {
            type: "brush",
            x,
            y,
            lineWidth: this.ctx.lineWidth,
            strokeStyle: this.ctx.strokeStyle,
            isStart,
          },
        })
      );
    }
  }

  sendFinish() {
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

  localDraw(x, y, isStart = false) {
    Brush.staticDraw(this.ctx, x, y, this.ctx.lineWidth, this.ctx.strokeStyle, isStart);
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
