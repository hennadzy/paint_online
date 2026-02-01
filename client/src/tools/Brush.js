import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.points = [];
    this.strokeStyle = "#000000";
    this.strokeOpacity = 1;
    this.lineWidth = 1;
    this.lastX = null;
    this.lastY = null;
  }

  setStrokeColor(color) {
    this.strokeStyle = color;
  }

  setStrokeOpacity(opacity) {
    this.strokeOpacity = opacity;
    this.strokeColor = this.hexToRgba(this.strokeStyle, opacity);
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  listen() {
    if (!this.pointerDownHandlerBound) {
      this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
      this.pointerMoveHandlerBound = this.pointerMoveHandler.bind(this);
      this.pointerUpHandlerBound = this.pointerUpHandler.bind(this);
    }

    const ctx = this.canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";

    this.canvas.addEventListener("pointerdown", this.pointerDownHandlerBound);
    document.addEventListener("pointermove", this.pointerMoveHandlerBound);
    document.addEventListener("pointerup", this.pointerUpHandlerBound);
    this.listenGlobalEndEvents();
  }

  destroyEvents() {
    this.canvas.removeEventListener("pointerdown", this.pointerDownHandlerBound);
    document.removeEventListener("pointermove", this.pointerMoveHandlerBound);
    document.removeEventListener("pointerup", this.pointerUpHandlerBound);
    this.removeGlobalEndEvents();
  }

  pointerDownHandler(e) {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];

    const { x, y } = this.getCanvasCoordinates(e);
    this.lastX = x;
    this.lastY = y;
    this.points.push({ x, y });
    this.drawDot();
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown) return;

    const { x, y } = this.getCanvasCoordinates(e);

    const smoothed = this.interpolate(this.lastX, this.lastY, x, y);
    this.points.push(smoothed);
    this.lastX = smoothed.x;
    this.lastY = smoothed.y;

    canvasState.redrawCanvas();
    this.drawStroke();
  }

  pointerUpHandler(e) {
    if (this.mouseDown) {
      this.commitStroke();
      this.mouseDown = false;
    }
  }

  interpolate(x1, y1, x2, y2, smoothing = 0.5) {
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

  drawDot() {
    const ctx = this.canvas.getContext("2d");
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.hexToRgba(this.strokeStyle, this.strokeOpacity);
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(this.points[0].x, this.points[0].y, this.lineWidth / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  drawSegment() {
    const ctx = this.canvas.getContext("2d");
    const len = this.points.length;
    if (len < 2) return;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.hexToRgba(this.strokeStyle, this.strokeOpacity);
    ctx.fillStyle = this.hexToRgba(this.strokeStyle, this.strokeOpacity);
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.moveTo(this.points[len - 2].x, this.points[len - 2].y);
    ctx.lineTo(this.points[len - 1].x, this.points[len - 1].y);
    ctx.stroke();
    ctx.restore();
  }

  drawStroke() {
    const ctx = this.canvas.getContext("2d");

    ctx.save();
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.hexToRgba(this.strokeStyle, this.strokeOpacity);
    ctx.fillStyle = this.hexToRgba(this.strokeStyle, this.strokeOpacity);
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    const p = this.points;
    if (p.length > 1) {
      ctx.moveTo(p[0].x, p[0].y);
      for (let i = 1; i < p.length; i++) {
        ctx.lineTo(p[i].x, p[i].y);
      }
      ctx.stroke();
    } else if (p.length === 1) {
      ctx.arc(p[0].x, p[0].y, this.lineWidth / 2, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }

  hexToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  commitStroke() {
    const stroke = {
      type: "brush",
      points: this.points,
      strokeStyle: this.strokeStyle,
      strokeOpacity: this.strokeOpacity,
      lineWidth: this.lineWidth,
      username: this.username
    };

    canvasState.pushStroke(stroke);
    this.saveImage();

    this.send(JSON.stringify({
      method: "draw",
      id: this.id,
      username: this.username,
      figure: stroke
    }));

    canvasState.redrawCanvas();
    canvasState.isDrawing = false;
  }
} 
