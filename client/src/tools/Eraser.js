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
    
    const ctx = this.canvas.getContext("2d");
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

    const { x, y } = this.getCoords(e);
    this.points.push({ x, y });
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
    this.points.push({ x, y });
    this.drawSegment();
    
    const ctx = this.canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
  }

  pointerLeaveHandler() {
    if (this.mouseDown) {
      this.commitStroke();
      this.mouseDown = false;
      
      const ctx = this.canvas.getContext("2d");
      ctx.globalCompositeOperation = "source-over";
    }
  }

  pointerEnterHandler(e) {
    if (e.buttons !== 1 && e.pointerType !== 'touch') return;
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];

    const { x, y } = this.getCoords(e);
    this.points.push({ x, y });
  }

  drawSegment() {
    const ctx = this.canvas.getContext("2d");
    const len = this.points.length;
    if (len < 2) return;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
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
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.globalCompositeOperation = "destination-out";

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

    const ctx = this.canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    canvasState.redrawCanvas();
    
    this.points = [];
    canvasState.isDrawing = false;
  }
}
