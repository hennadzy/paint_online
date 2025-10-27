
import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.points = [];
    this.strokeStyle = "#000000";
    this.lineWidth = 1;
    this.lastX = null;
    this.lastY = null;

    this.mouseMoveHandlerBound = this.mouseMoveHandler.bind(this);
    this.mouseUpHandlerBound = this.mouseUpHandler.bind(this);
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
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });

    document.addEventListener("mousemove", this.mouseMoveHandlerBound);
    document.addEventListener("mouseup", this.mouseUpHandlerBound);
    document.addEventListener("touchmove", this.touchMoveHandlerBound, { passive: false });
    document.addEventListener("touchend", this.touchEndHandlerBound);

    this.listenGlobalEndEvents();
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.removeEventListener("touchstart", this.touchStartHandler);

    document.removeEventListener("mousemove", this.mouseMoveHandlerBound);
    document.removeEventListener("mouseup", this.mouseUpHandlerBound);
    document.removeEventListener("touchmove", this.touchMoveHandlerBound);
    document.removeEventListener("touchend", this.touchEndHandlerBound);

    this.removeGlobalEndEvents();
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = Math.round((e.pageX - rect.left) * scaleX);
    const y = Math.round((e.pageY - rect.top) * scaleY);
    this.lastX = x;
    this.lastY = y;
    this.points.push({ x, y });
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = Math.round((e.pageX - rect.left) * scaleX);
    const y = Math.round((e.pageY - rect.top) * scaleY);

    const smoothed = this.interpolate(this.lastX, this.lastY, x, y);
    this.points.push(smoothed);
    this.lastX = smoothed.x;
    this.lastY = smoothed.y;

    this.drawStroke();
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
    this.points = [];

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const touch = e.touches[0];
    const x = Math.round((touch.pageX - rect.left) * scaleX);
    const y = Math.round((touch.pageY - rect.top) * scaleY);
    this.lastX = x;
    this.lastY = y;
    this.points.push({ x, y });
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

    const smoothed = this.interpolate(this.lastX, this.lastY, x, y);
    this.points.push(smoothed);
    this.lastX = smoothed.x;
    this.lastY = smoothed.y;

    this.drawStroke();
  }

  touchEndHandler(e) {
    if (this.mouseDown) {
      this.commitStroke();
      this.mouseDown = false;
    }
  }

  interpolate(x1, y1, x2, y2, smoothing = 0.2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 2) {
      return { x: x2, y: y2 };
    }
    const factor = Math.min(smoothing, distance / 2);
    return {
      x: x1 + dx * factor,
      y: y1 + dy * factor
    };
  }

  drawStroke() {
    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();

    ctx.save();
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.strokeStyle;
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    const p = this.points;
    ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length; i++) {
      ctx.lineTo(p[i].x, p[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  commitStroke() {
    const stroke = {
      type: "brush",
      points: this.points,
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
}
