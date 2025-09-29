import Tool from "./Tool";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";

export default class Line extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.destroyEvents();
    this.listen();
      this.strokeColor = '#000000'; // при создании
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
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    canvasState.pushToUndo(this.canvas.toDataURL());

    this.socket.send(
      JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: {
          type: "line",
          x1: this.startX,
          y1: this.startY,
          x2: endX,
          y2: endY,
          strokeStyle: this.strokeColor || this.color || toolState.color,
          lineWidth: this.lineWidth,
          username: this.username,
        },
      })
    );
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
      Line.staticDraw(this.ctx, this.startX, this.startY, endX, endY, this.strokeColor, this.lineWidth);
    };
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.touches[0].clientX - rect.left;
    this.startY = e.touches[0].clientY - rect.top;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.saved = this.canvas.toDataURL();
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    this.currentX = e.touches[0].clientX - rect.left;
    this.currentY = e.touches[0].clientY - rect.top;

    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0);
      Line.staticDraw(this.ctx, this.startX, this.startY, this.currentX, this.currentY, this.strokeColor, this.lineWidth);
    };
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;

    canvasState.pushToUndo(this.canvas.toDataURL());

    this.socket.send(
      JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: {
          type: "line",
          x1: this.startX,
          y1: this.startY,
          x2: this.currentX,
          y2: this.currentY,
          strokeStyle: this.strokeColor || this.color || toolState.color,
          lineWidth: this.lineWidth,
          username: this.username,
        },
      })
    );
  }

  static staticDraw(ctx, x1, y1, x2, y2, strokeStyle, lineWidth) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
