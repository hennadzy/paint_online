
class Brush {
  constructor(canvas, socket, sessionId) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.socket = socket;
    this.id = sessionId;
    this.mouseDown = false;

    this.isOnlineMode = Boolean(this.id);
    console.log (this.isOnlineMode);
    this.listen();
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);

    this.canvas.ontouchstart = this.touchStartHandler.bind(this);
    this.canvas.ontouchend = this.touchEndHandler.bind(this);
    this.canvas.ontouchmove = this.touchMoveHandler.bind(this);
  }

  mouseDownHandler(event) {
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.sendDrawData(event.clientX - rect.left, event.clientY - rect.top, true);
  }

  mouseUpHandler() {
    this.mouseDown = false;
  }

  mouseMoveHandler(event) {
    
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      this.sendDrawData(event.clientX - rect.left, event.clientY - rect.top, false);
    }
  }

  touchStartHandler(event) {
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.sendDrawData(event.touches[0].clientX - rect.left, event.touches[0].clientY - rect.top, true);
  }

  touchEndHandler() {
    this.mouseDown = false;
  }

  touchMoveHandler(event) {
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      this.sendDrawData(event.touches[0].clientX - rect.left, event.touches[0].clientY - rect.top, false);
    }
  }

  sendDrawData(x, y, isStart = false) {
    const { lineWidth, strokeStyle } = this.ctx;

    if (this.isOnlineMode && this.socket) {
      // Отправка на сервер только в online-режиме
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
            isStart
          },
        })
      );
    }

    // Локальная отрисовка - всегда выполняется
    Brush.staticDraw(this.ctx, x, y, lineWidth, strokeStyle, isStart);
  }

  static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart = false) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;

    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

export default Brush;
