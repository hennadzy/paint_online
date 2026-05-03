import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Eraser extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.lineWidth = 10;
    this.points = [];
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  listen() {
    if (!this.pointerDownHandlerBound) {
      this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
      this.pointerMoveHandlerBound = this.pointerMoveHandler.bind(this);
      this.pointerLeaveHandlerBound = this.pointerLeaveHandler.bind(this);
      this.pointerEnterHandlerBound = this.pointerEnterHandler.bind(this);
    }

    this.canvas.addEventListener("pointerdown", this.pointerDownHandlerBound);
    this.canvas.addEventListener("pointermove", this.pointerMoveHandlerBound);
    this.canvas.addEventListener("pointerleave", this.pointerLeaveHandlerBound);
    this.canvas.addEventListener("pointerenter", this.pointerEnterHandlerBound);
    this.listenGlobalEndEvents();
  }

  destroyEvents() {
    this.canvas.removeEventListener("pointerdown", this.pointerDownHandlerBound);
    this.canvas.removeEventListener("pointermove", this.pointerMoveHandlerBound);
    this.canvas.removeEventListener("pointerleave", this.pointerLeaveHandlerBound);
    this.canvas.removeEventListener("pointerenter", this.pointerEnterHandlerBound);
    this.removeGlobalEndEvents();

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    ctx.globalCompositeOperation = "source-over";
  }

  getCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  }

  pointerDownHandler(e) {
    if (this.isPinchingActive()) return;

    e.target.setPointerCapture(e.pointerId);
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];
    this.resetPenPressureState();

    const { x, y } = this.getCoords(e);
    const pt = { x, y };
    if (e.pointerType === "pen") {
      pt.w = this.getPressureAdjustedLineWidth(e);
    }
    this.points.push(pt);
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

    const { x, y } = this.getCoords(e);
    const pt = { x, y };
    if (e.pointerType === "pen") {
      pt.w = this.getPressureAdjustedLineWidth(e);
    }
    this.points.push(pt);
    this.drawSegment();

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    ctx.globalCompositeOperation = "source-over";
  }

  pointerLeaveHandler() {
    if (this.mouseDown) {
      this.commitStroke();
      this.mouseDown = false;

      const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
      ctx.globalCompositeOperation = "source-over";
    }
  }

  pointerEnterHandler(e) {
    if (e.buttons !== 1 && e.pointerType !== 'touch') return;
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];
    this.resetPenPressureState();

    const { x, y } = this.getCoords(e);
    const pt = { x, y };
    if (e.pointerType === "pen") {
      pt.w = this.getPressureAdjustedLineWidth(e);
    }
    this.points.push(pt);
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
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = (w0 + w1) / 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
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
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.globalCompositeOperation = "destination-out";

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

  commitStroke() {
    if (this.points.length === 0) return;

    const stroke = {
      type: "eraser",
      points: this.points,
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

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    ctx.globalCompositeOperation = "source-over";
    canvasState.redrawCanvas();

    this.points = [];
    canvasState.isDrawing = false;
  }
}
