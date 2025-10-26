import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.points = [];
    this.strokeStyle = "#000000";
    this.lineWidth = 1;
    this.mouseDown = false;
    this.animationFrame = null;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  setStrokeColor(color) {
    this.strokeStyle = color;
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmouseleave = this.mouseLeaveHandler.bind(this);
    this.canvas.onmouseenter = this.mouseEnterHandler.bind(this);

    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });

    this.listenGlobalEndEvents();
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.onmouseleave = null;
    this.canvas.onmouseenter = null;
    this.canvas.removeEventListener("touchstart", this.touchStartHandler);
    this.canvas.removeEventListener("touchmove", this.touchMoveHandler);

    this.removeGlobalEndEvents();
  }

  getCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.touches?.[0]?.pageX ?? e.pageX) - rect.left;
    const y = (e.touches?.[0]?.pageY ?? e.pageY) - rect.top;
    return { x, y };
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];

    const { x, y } = this.getCoords(e);
    this.points.push({ x, y });
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    const { x, y } = this.getCoords(e);
    const last = this.points[this.points.length - 1];
    if (last && (Math.abs(x - last.x) < 0.5 && Math.abs(y - last.y) < 0.5)) return;

    this.points.push({ x, y });

    if (!this.animationFrame) {
      this.animationFrame = requestAnimationFrame(() => {
        this.drawSegment();
        this.animationFrame = null;
      });
    }
  }

  mouseLeaveHandler() {
    if (this.mouseDown) {
      this.commitStroke();
      this.mouseDown = false;
    }
  }

  mouseEnterHandler(e) {
    if (e.buttons !== 1) return;
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];

    const { x, y } = this.getCoords(e);
    this.points.push({ x, y });
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];

    const { x, y } = this.getCoords(e);
    this.points.push({ x, y });
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const { x, y } = this.getCoords(e);
    const last = this.points[this.points.length - 1];
    if (last && (Math.abs(x - last.x) < 0.5 && Math.abs(y - last.y) < 0.5)) return;

    this.points.push({ x, y });

    if (!this.animationFrame) {
      this.animationFrame = requestAnimationFrame(() => {
        this.drawSegment();
        this.animationFrame = null;
      });
    }
  }

  drawSegment() {
    const ctx = this.canvas.getContext("2d");
    const len = this.points.length;
    if (len < 2) return;

    ctx.save();
    ctx.strokeStyle = this.strokeStyle;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.moveTo(this.points[len - 2].x, this.points[len - 2].y);
    ctx.lineTo(this.points[len - 1].x, this.points[len - 1].y);
    ctx.stroke();
    ctx.restore();
  }

  commitStroke() {
    if (this.points.length === 0) return;

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

    this.points = [];
    canvasState.isDrawing = false;
  }
}
