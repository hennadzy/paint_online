import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Polygon extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.points = [];
    this.isDrawing = false;
    this.tempCanvas = null;
  }

  listen() {
    const ctx = this.canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";

    this.canvas.onpointerdown = this.pointerDownHandler.bind(this);
    this.canvas.onpointermove = this.pointerMoveHandler.bind(this);
    this.canvas.ondblclick = this.doubleClickHandler.bind(this);
  }

  pointerDownHandler(e) {
    if (this.isPinchingActive()) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (!this.isDrawing) {
      this.isDrawing = true;
    }

    this.points.push({ x, y });
    canvasState.redrawCanvas();
    this.drawPolygon();
  }

  pointerMoveHandler(e) {
    if (!this.isDrawing || this.points.length === 0) return;
    
    if (this.isPinchingActive()) {
      this.isDrawing = false;
      this.points = [];
      canvasState.redrawCanvas();
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    canvasState.redrawCanvas();
    this.drawPolygon();

    const ctx = this.ctx;
    const lastPoint = this.points[this.points.length - 1];
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.globalAlpha = this.strokeOpacity;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  doubleClickHandler(e) {
    e.preventDefault();
    if (!this.isDrawing || this.points.length < 3) {
      this.points = [];
      this.isDrawing = false;
      canvasState.redrawCanvas();
      return;
    }

    this.finishPolygon();
  }

  drawPolygon() {
    if (this.points.length < 2) return;

    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.globalAlpha = this.strokeOpacity;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  finishPolygon() {
    if (this.points.length < 3) return;

    const stroke = {
      type: "polygon",
      points: [...this.points],
      strokeStyle: this.strokeColor,
      lineWidth: this.lineWidth,
      opacity: this.strokeOpacity,
      username: this.username
    };

    canvasState.pushStroke(stroke);
    this.sendPolygonData(this.points);
    canvasState.redrawCanvas();

    this.points = [];
    this.isDrawing = false;
  }

  sendPolygonData(points) {
    this.send(JSON.stringify({
      method: "draw",
      id: this.id,
      username: this.username,
      figure: {
        type: "polygon",
        points,
        strokeStyle: this.strokeColor,
        lineWidth: this.lineWidth,
        opacity: this.strokeOpacity
      }
    }));
  }

  static staticDraw(ctx, points, strokeStyle, lineWidth, opacity = 1) {
    if (!points || points.length < 3) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = opacity;
    ctx.stroke();
    ctx.restore();
  }

  destroyEvents() {
    this.canvas.onpointerdown = null;
    this.canvas.onpointermove = null;
    this.canvas.ondblclick = null;
    this.points = [];
    this.isDrawing = false;
    super.destroyEvents();
  }
}
