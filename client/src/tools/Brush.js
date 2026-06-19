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
      this.lostPointerCaptureHandlerBound = this.lostPointerCaptureHandler.bind(this);
    }

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    ctx.globalCompositeOperation = "source-over";

    this.canvas.addEventListener("pointerdown", this.pointerDownHandlerBound);
    this.canvas.addEventListener("pointermove", this.pointerMoveHandlerBound);
    this.canvas.addEventListener("pointerup", this.pointerUpHandlerBound);
    this.canvas.addEventListener("pointercancel", this.pointerUpHandlerBound);
    this.canvas.addEventListener("lostpointercapture", this.lostPointerCaptureHandlerBound);
  }

  destroyEvents() {
    this.canvas.removeEventListener("pointerdown", this.pointerDownHandlerBound);
    this.canvas.removeEventListener("pointermove", this.pointerMoveHandlerBound);
    this.canvas.removeEventListener("pointerup", this.pointerUpHandlerBound);
    this.canvas.removeEventListener("pointercancel", this.pointerUpHandlerBound);
    this.canvas.removeEventListener("lostpointercapture", this.lostPointerCaptureHandlerBound);
  }

  lostPointerCaptureHandler(e) {
    if (!this.mouseDown || this._hasCommitted) return;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  pointerDownHandler(e) {
    if (this.isPinchingActive()) return;

    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];
    this.resetPenPressureState();

    const { x, y } = this.getCanvasCoordinates(e);
    this.lastX = x;
    this.lastY = y;
    const pt = { x, y };
    if (e.pointerType === "pen") {
      pt.w = this.getPressureAdjustedLineWidth(e);
    }
    this.points.push(pt);
    canvasState.redrawCanvas();
    this.drawDot();
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown) return;

    if (this.isPinchingActive()) {
      this.mouseDown = false;
      canvasState.isDrawing = false;
      if (this.points.length > 0) {
        this.commitStroke();
      }
      return;
    }

    const { x, y } = this.getCanvasCoordinates(e);

    const dx = x - this.lastX;
    const dy = y - this.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const spacing = Math.max(1, this.lineWidth * 0.35);

    if (dist < 0.5) return;

    const steps = Math.max(1, Math.ceil(dist / spacing));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const px = this.lastX + dx * t;
      const py = this.lastY + dy * t;
      const pt = { x: px, y: py };
      if (e.pointerType === 'pen') {
        pt.w = this.getPressureAdjustedLineWidth(e);
      }
      this.points.push(pt);
      this.drawSegment();
    }

    this.lastX = x;
    this.lastY = y;
  }

  pointerUpHandler(e) {
    if (!this.mouseDown) {
      if (this._hasCommitted) {
        canvasState.isDrawing = false;
      }
      return;
    }

    if (this._hasCommitted) return;

    if (this.canvas.hasPointerCapture?.(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }

    this._hasCommitted = true;
    this.mouseDown = false;
    this.commitStroke();
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
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    const r = (this.points[0].w ?? this.lineWidth) / 2;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.hexToRgba(this.strokeStyle, this.strokeOpacity);
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.arc(this.points[0].x, this.points[0].y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  drawSegment() {
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    const len = this.points.length;
    if (len < 2) return;

    const p0 = this.points[len - 2];
    const p1 = this.points[len - 1];
    const w0 = p0.w ?? this.lineWidth;
    const w1 = p1.w ?? this.lineWidth;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.lineWidth = (w0 + w1) / 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.hexToRgba(this.strokeStyle, this.strokeOpacity);
    ctx.fillStyle = this.hexToRgba(this.strokeStyle, this.strokeOpacity);
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
  }

  drawStroke() {
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    const p = this.points;
    const variableW = p.some((pt) => typeof pt.w === "number");

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.hexToRgba(this.strokeStyle, this.strokeOpacity);
    ctx.fillStyle = this.hexToRgba(this.strokeStyle, this.strokeOpacity);
    ctx.globalCompositeOperation = "source-over";

    if (p.length > 1 && variableW) {
      for (let i = 1; i < p.length; i++) {
        const w0 = p[i - 1].w ?? this.lineWidth;
        const w1 = p[i].w ?? this.lineWidth;
        ctx.lineWidth = (w0 + w1) / 2;
        ctx.beginPath();
        ctx.moveTo(p[i - 1].x, p[i - 1].y);
        ctx.lineTo(p[i].x, p[i].y);
        ctx.stroke();
      }
    } else if (p.length > 1) {
      ctx.lineWidth = this.lineWidth;
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      for (let i = 1; i < p.length; i++) {
        ctx.lineTo(p[i].x, p[i].y);
      }
      ctx.stroke();
    } else if (p.length === 1) {
      const r = (p[0].w ?? this.lineWidth) / 2;
      ctx.beginPath();
      ctx.arc(p[0].x, p[0].y, r, 0, 2 * Math.PI);
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
    if (this.points.length === 0) {
      canvasState.isDrawing = false;
      return;
    }

    const stroke = {
      type: "brush",
      points: [...this.points],
      strokeStyle: this.strokeStyle,
      strokeOpacity: this.strokeOpacity,
      lineWidth: this.lineWidth,
      username: this.username
    };

    this.points = [];
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
