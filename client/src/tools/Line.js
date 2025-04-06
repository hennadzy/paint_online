import Tool from "./Tool";

export default class Line extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.saved = "";
    this._touchStartHandler = this.touchStartHandler.bind(this);
    this._touchMoveHandler = this.touchMoveHandler.bind(this);
    this._touchEndHandler = this.touchEndHandler.bind(this);
    this.destroyEvents();
    this.listen();
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
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
    this.saved = this.canvas.toDataURL();
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      this.currentX = e.clientX - rect.left;
      this.currentY = e.clientY - rect.top;
      this.previewLine(this.startX, this.startY, this.currentX, this.currentY);
    }
  }

  mouseUpHandler() {
    this.mouseDown = false;
    this.sendLine();
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.touches[0].clientX - rect.left;
    this.startY = e.touches[0].clientY - rect.top;
    this.saved = this.canvas.toDataURL();
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      this.currentX = e.touches[0].clientX - rect.left;
      this.currentY = e.touches[0].clientY - rect.top;
      this.previewLine(this.startX, this.startY, this.currentX, this.currentY);
    }
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    this.sendLine();
  }

  previewLine(x, y, x2, y2) {
    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    };
  }

  sendLine() {
    Line.staticDraw(
      this.ctx,
      this.startX,
      this.startY,
      this.currentX,
      this.currentY,
      this.ctx.lineWidth,
      this.ctx.strokeStyle
    );

    this.ctx.beginPath(); // Сбрасываем путь после завершения линии

    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          figure: {
            type: "line",
            x: this.startX,
            y: this.startY,
            x2: this.currentX,
            y2: this.currentY,
            lineWidth: this.ctx.lineWidth,
            strokeStyle: this.ctx.strokeStyle,
          },
        })
      );

      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          figure: { type: "finish" },
        })
      );
    }
  }

  static staticDraw(ctx, x, y, x2, y2, lineWidth, strokeStyle) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
