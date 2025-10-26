import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Rect extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.startX = 0;
    this.startY = 0;
    this.width = 0;
    this.height = 0;
    this.strokeStyle = "#000000";
    this.lineWidth = 1;
  }

  setStrokeColor(color) {
    this.strokeStyle = color;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });

    this.listenGlobalEndEvents();
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.removeEventListener("touchstart", this.touchStartHandler);
    this.canvas.removeEventListener("touchmove", this.touchMoveHandler);

    this.removeGlobalEndEvents();
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;

    this.startX = Math.round(e.pageX - this.canvas.offsetLeft);
    this.startY = Math.round(e.pageY - this.canvas.offsetTop);
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    const x = Math.round(e.pageX - this.canvas.offsetLeft);
    const y = Math.round(e.pageY - this.canvas.offsetTop);
    this.width = x - this.startX;
    this.height = y - this.startY;

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    Rect.staticDraw(ctx, this.startX, this.startY, this.width, this.height, this.strokeStyle, this.lineWidth);
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;

    const touch = e.touches[0];
    this.startX = Math.round(touch.pageX - this.canvas.offsetLeft);
    this.startY = Math.round(touch.pageY - this.canvas.offsetTop);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const touch = e.touches[0];
    const x = Math.round(touch.pageX - this.canvas.offsetLeft);
    const y = Math.round(touch.pageY - this.canvas.offsetTop);
    this.width = x - this.startX;
    this.height = y - this.startY;

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    Rect.staticDraw(ctx, this.startX, this.startY, this.width, this.height, this.strokeStyle, this.lineWidth);
  }

  commitStroke() {
    const stroke = {
      type: "rect",
      x: this.startX,
      y: this.startY,
      width: this.width,
      height: this.height,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      username: this.username
    };

    canvasState.pushStroke(stroke);

    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: stroke
      }));
    }

    canvasState.isDrawing = false;
  }

  staticDraw(ctx, x, y, width, height, strokeStyle, lineWidth) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";
    ctx.globalCompositeOperation = "source-over";

    // Округление координат для предотвращения размытия
    const px = Math.round(x) + 0.5;
    const py = Math.round(y) + 0.5;
    const w = Math.round(width);
    const h = Math.round(height);

    ctx.beginPath();
    ctx.rect(px, py, w, h);
    ctx.stroke();
    ctx.restore();
  }
}
