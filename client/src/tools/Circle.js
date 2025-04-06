import Tool from "./Tool";
import toolState from "../store/toolState";
import canvasState from "../store/canvasState";

export default class Circle extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.fillColor = toolState.fillColor || this.ctx.strokeStyle;
    this.mouseDown = false;
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
      canvasState.pushToUndo(this.canvas.toDataURL());
    const rectArea = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rectArea.left;
    this.startY = e.clientY - rectArea.top;
    this.saved = this.canvas.toDataURL();
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rectArea = this.canvas.getBoundingClientRect();
      const currentX = e.clientX - rectArea.left;
      const currentY = e.clientY - rectArea.top;
      this.radius = this.calculateRadius(this.startX, this.startY, currentX, currentY);
      this.previewCircle(this.startX, this.startY, this.radius);
    }
  }

  mouseUpHandler() {
    this.mouseDown = false;
    this.sendCircle();
  }

  touchStartHandler(e) {
    e.preventDefault();
      canvasState.pushToUndo(this.canvas.toDataURL());
    this.mouseDown = true;
    const rectArea = this.canvas.getBoundingClientRect();
    this.startX = e.touches[0].clientX - rectArea.left;
    this.startY = e.touches[0].clientY - rectArea.top;
    this.saved = this.canvas.toDataURL();
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (this.mouseDown) {
      const rectArea = this.canvas.getBoundingClientRect();
      const currentX = e.touches[0].clientX - rectArea.left;
      const currentY = e.touches[0].clientY - rectArea.top;
      this.radius = this.calculateRadius(this.startX, this.startY, currentX, currentY);
      this.previewCircle(this.startX, this.startY, this.radius);
    }
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    this.sendCircle();
  }

  calculateRadius(startX, startY, currentX, currentY) {
    const dx = currentX - startX;
    const dy = currentY - startY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  previewCircle(x, y, r) {
    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, 2 * Math.PI);
      const fillColor = this.fillColor || this.ctx.strokeStyle;
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
      this.ctx.stroke();
    };
  }

  sendCircle() {
    Circle.staticDraw(
      this.ctx,
      this.startX,
      this.startY,
      this.radius,
    //   this.fillColor,
      this.ctx.lineWidth,
      this.ctx.strokeStyle
    );

    this.ctx.beginPath();

    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          username: this.username,
          figure: {
            type: "circle",
            x: this.startX,
            y: this.startY,
            r: this.radius,
            // fillStyle: this.fillColor,
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

  static staticDraw(ctx, x, y, r, fillStyle, lineWidth, strokeStyle) {
    ctx.fillStyle = fillStyle || strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
}
