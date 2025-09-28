import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Rect extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.destroyEvents(); // очищаем старые события (например, от кисти)
    this.listen();
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.ontouchstart = this.touchStartHandler.bind(this);
    this.canvas.ontouchmove = this.touchMoveHandler.bind(this);
    this.canvas.ontouchend = this.touchEndHandler.bind(this);
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
    this.saved = this.canvas.toDataURL();
  }

  mouseUpHandler(e) {
    this.mouseDown = false;
    const rect = this.canvas.getBoundingClientRect();
    const width = e.clientX - rect.left - this.startX;
    const height = e.clientY - rect.top - this.startY;

    canvasState.pushToUndo(this.canvas.toDataURL());

    this.socket.send(
      JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: {
          type: "rect",
          x: this.startX,
          y: this.startY,
          width,
          height,
          strokeStyle: this.strokeColor,
          lineWidth: this.lineWidth,
          username: this.username,
        },
      })
    );
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const width = currentX - this.startX;
    const height = currentY - this.startY;

    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
      Rect.staticDraw(
        this.ctx,
        this.startX,
        this.startY,
        width,
        height,
        this.strokeColor,
        this.lineWidth
      );
    };
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.touches[0].clientX - rect.left;
    this.startY = e.touches[0].clientY - rect.top;
    this.saved = this.canvas.toDataURL();
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    const rect = this.canvas.getBoundingClientRect();
    const width = e.changedTouches[0].clientX - rect.left - this.startX;
    const height = e.changedTouches[0].clientY - rect.top - this.startY;

    canvasState.pushToUndo(this.canvas.toDataURL());

    this.socket.send(
      JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: {
          type: "rect",
          x: this.startX,
          y: this.startY,
          width,
          height,
          strokeStyle: this.strokeColor,
          lineWidth: this.lineWidth,
          username: this.username,
        },
      })
    );
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    const currentX = e.touches[0].clientX - rect.left;
    const currentY = e.touches[0].clientY - rect.top;
    const width = currentX - this.startX;
    const height = currentY - this.startY;

    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
      Rect.staticDraw(
        this.ctx,
        this.startX,
        this.startY,
        width,
        height,
        this.strokeColor,
        this.lineWidth
      );
    };
  }

  static staticDraw(ctx, x, y, width, height, strokeStyle, lineWidth) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.stroke();
  }
}
