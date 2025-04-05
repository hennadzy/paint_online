import Tool from "./Tool";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;
    this.destroyEvents();
    this.listen();
  }

  listen() {
    // Навешиваем обработчики для мыши
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
    // Навешиваем сенсорные обработчики
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchend", this.touchEndHandler.bind(this), { passive: false });
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    this.sendDrawData(e.clientX - rect.left, e.clientY - rect.top, true, true);
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
     const rect = this.canvas.getBoundingClientRect();
     this.draw(e.clientX - rect.left, e.clientY - rect.top, false, true);
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
    this.sendDrawData(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, true, true);
}

touchMoveHandler(e) {
  e.preventDefault();
  if (!this.mouseDown) return;
  const rect = this.canvas.getBoundingClientRect();
  this.draw(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, false, true);
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

draw(x, y) {
  this.sendDrawData(x, y, false);
  
}
sendDrawData(x, y, isStart = false, isLocal = true) { // добавление isLocal аргумента
  const { lineWidth, strokeStyle } = this.ctx;
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
          username: this.username,
        },
      })
    );
  }

  if (isLocal) {
    Brush.staticDraw(this.ctx, x, y, lineWidth, strokeStyle, isStart);
  }
}

static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart = false) {
 
 
  if (isStart) {
    ctx.beginPath();
    ctx.moveTo(x, y);
  }
  ctx.lineTo(x, y);

  ctx.stroke();
}
}