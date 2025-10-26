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

    this.mouseMoveHandlerBound = this.mouseMoveHandler.bind(this);
    this.mouseUpHandlerBound = this.mouseUpHandler.bind(this);
    this.touchEndHandlerBound = this.touchEndHandler.bind(this);
  }

  setStrokeColor(color) {
    this.strokeStyle = color;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });

    document.addEventListener("mousemove", this.mouseMoveHandlerBound);
    document.addEventListener("mouseup", this.mouseUpHandlerBound);
    document.addEventListener("touchend", this.touchEndHandlerBound);

    this.listenGlobalEndEvents();
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.removeEventListener("touchstart", this.touchStartHandler);
    this.canvas.removeEventListener("touchmove", this.touchMoveHandler);

    document.removeEventListener("mousemove", this.mouseMoveHandlerBound);
    document.removeEventListener("mouseup", this.mouseUpHandlerBound);
    document.removeEventListener("touchend", this.touchEndHandlerBound);

    this.removeGlobalEndEvents();
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;

    const rect = this.canvas.getBoundingClientRect();
    this.startX = Math.round(e.pageX - rect.left);
    this.startY = Math.round(e.pageY - rect.top);
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = Math.round(e.pageX - rect.left);
    const y = Math.round(e.pageY - rect.top);
    this.width = x - this.startX;
    this.height = y - this.startY;

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    Rect.staticDraw(ctx, this.startX, this.startY, this.width, this.height, this.strokeStyle, this.lineWidth);
  }

  mouseUpHandler(e) {
    if (this.mouseDown) {
      this.commitStroke();
      this.mouseDown = false;
    }
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;

    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    this.startX = Math.round(touch.pageX - rect.left);
    this.startY = Math.round(touch.pageY - rect.top);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.round(touch.pageX - rect.left);
    const y = Math.round(touch.pageY - rect.top);
    this.width = x - this.startX;
    this.height = y - this.startY;

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    Rect.staticDraw(ctx, this.startX, this.startY, this.width, this.height, this.strokeStyle, this.lineWidth);
  }

  touchEndHandler(e) {
    if (this.mouseDown) {
      this.commitStroke();
      this.mouseDown = false;
    }
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

  static staticDraw(ctx, x, y, width, height, strokeStyle, lineWidth) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.rect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(width), Math.round(height));
    ctx.stroke();
    ctx.restore();
  }
}
