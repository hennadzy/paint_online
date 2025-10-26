import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Circle extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.startX = 0;
    this.startY = 0;
    this.radius = 0;
    this.strokeStyle = "#000000";
    this.lineWidth = 1;

    this.mouseDownHandlerBound = this.mouseDownHandler.bind(this);
    this.mouseMoveHandlerBound = this.mouseMoveHandler.bind(this);
    this.mouseUpHandlerBound = this.mouseUpHandler.bind(this);
    this.touchStartHandlerBound = this.touchStartHandler.bind(this);
    this.touchMoveHandlerBound = this.touchMoveHandler.bind(this);
    this.touchEndHandlerBound = this.touchEndHandler.bind(this);
  }

  setStrokeColor(color) {
    this.strokeStyle = color;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  listen() {
    this.canvas.addEventListener("mousedown", this.mouseDownHandlerBound);
    this.canvas.addEventListener("touchstart", this.touchStartHandlerBound, { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandlerBound, { passive: false });

    document.addEventListener("mousemove", this.mouseMoveHandlerBound);
    document.addEventListener("mouseup", this.mouseUpHandlerBound);
    document.addEventListener("touchend", this.touchEndHandlerBound);

    this.listenGlobalEndEvents();
  }

  destroyEvents() {
    this.canvas.removeEventListener("mousedown", this.mouseDownHandlerBound);
    this.canvas.removeEventListener("touchstart", this.touchStartHandlerBound);
    this.canvas.removeEventListener("touchmove", this.touchMoveHandlerBound);

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
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.startX = Math.round((e.pageX - rect.left) * scaleX);
    this.startY = Math.round((e.pageY - rect.top) * scaleY);
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = Math.round((e.pageX - rect.left) * scaleX);
    const y = Math.round((e.pageY - rect.top) * scaleY);
    this.radius = Math.sqrt((x - this.startX) ** 2 + (y - this.startY) ** 2);

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    Circle.staticDraw(ctx, this.startX, this.startY, this.radius, this.strokeStyle, this.lineWidth);
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
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const touch = e.touches[0];
    this.startX = Math.round((touch.pageX - rect.left) * scaleX);
    this.startY = Math.round((touch.pageY - rect.top) * scaleY);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const touch = e.touches[0];
    const x = Math.round((touch.pageX - rect.left) * scaleX);
    const y = Math.round((touch.pageY - rect.top) * scaleY);
    this.radius = Math.sqrt((x - this.startX) ** 2 + (y - this.startY) ** 2);

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    Circle.staticDraw(ctx, this.startX, this.startY, this.radius, this.strokeStyle, this.lineWidth);
  }

  touchEndHandler(e) {
    if (this.mouseDown) {
      this.commitStroke();
      this.mouseDown = false;
    }
  }

  commitStroke() {
    const stroke = {
      type: "circle",
      x: this.startX,
      y: this.startY,
      radius: this.radius,
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

  static staticDraw(ctx, x, y, radius, strokeStyle, lineWidth) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.arc(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(radius), 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }
}
