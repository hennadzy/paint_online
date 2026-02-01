import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Arrow extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.listen();
  }

  listen() {
    const ctx = this.canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";

    this.canvas.onpointerdown = this.pointerDownHandler.bind(this);
  }

  pointerDownHandler(e) {
    if (this.isPinchingActive()) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.startX = Math.floor((e.clientX - rect.left) * scaleX);
    this.startY = Math.floor((e.clientY - rect.top) * scaleY);
    this.saveImage();
    
    this.canvas.onpointermove = this.pointerMoveHandler.bind(this);
    this.canvas.onpointerup = this.pointerUpHandler.bind(this);
  }

  pointerMoveHandler(e) {
    // Check if pinch started during drawing
    if (this.isPinchingActive()) {
      this.canvas.onpointermove = null;
      this.canvas.onpointerup = null;
      canvasState.redrawCanvas();
      return;
    }
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.currentX = Math.floor((e.clientX - rect.left) * scaleX);
    this.currentY = Math.floor((e.clientY - rect.top) * scaleY);
    canvasState.redrawCanvas();
    this.drawArrow(this.startX, this.startY, this.currentX, this.currentY);
  }

  pointerUpHandler(e) {
    this.canvas.onpointermove = null;
    this.canvas.onpointerup = null;
    
    const stroke = {
      type: "arrow",
      x1: this.startX,
      y1: this.startY,
      x2: this.currentX,
      y2: this.currentY,
      strokeStyle: this.strokeColor,
      lineWidth: this.lineWidth,
      opacity: this.strokeOpacity,
      username: this.username
    };
    canvasState.pushStroke(stroke);
    this.sendArrowData(this.startX, this.startY, this.currentX, this.currentY);
    canvasState.redrawCanvas();
  }

  drawArrow(x1, y1, x2, y2) {
    const ctx = this.ctx;
    const headlen = Math.max(10, this.lineWidth * 3);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.save();
    ctx.globalAlpha = this.strokeOpacity;
    ctx.strokeStyle = this.strokeColor;
    ctx.fillStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headlen * Math.cos(angle - Math.PI / 6),
      y2 - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headlen * Math.cos(angle + Math.PI / 6),
      y2 - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  sendArrowData(x1, y1, x2, y2) {
    this.send(JSON.stringify({
      method: "draw",
      id: this.id,
      username: this.username,
      figure: {
        type: "arrow",
        x1,
        y1,
        x2,
        y2,
        strokeStyle: this.strokeColor,
        lineWidth: this.lineWidth,
        opacity: this.strokeOpacity
      }
    }));
  }

  static staticDraw(ctx, x1, y1, x2, y2, strokeStyle, lineWidth, opacity = 1) {
    const headlen = Math.max(10, lineWidth * 3);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = strokeStyle;
    ctx.fillStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headlen * Math.cos(angle - Math.PI / 6),
      y2 - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headlen * Math.cos(angle + Math.PI / 6),
      y2 - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  destroyEvents() {
    this.canvas.onpointerdown = null;
    this.canvas.onpointermove = null;
    this.canvas.onpointerup = null;
    super.destroyEvents();
  }
}
