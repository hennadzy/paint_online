import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Line extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    this.strokeStyle = "#000000";
    this.strokeOpacity = 1;
    this.lineWidth = 1;

    this.mouseDownHandlerBound = this.mouseDownHandler.bind(this);
    this.mouseMoveHandlerBound = this.mouseMoveHandler.bind(this);
    this.mouseUpHandlerBound = this.mouseUpHandler.bind(this);
    this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
    this.pointerMoveHandlerBound = this.pointerMoveHandler.bind(this);
    this.pointerUpHandlerBound = this.pointerUpHandler.bind(this);
  }

  setStrokeColor(color) {
    this.strokeStyle = color;
    this.strokeColor = color;
  }

  setStrokeOpacity(opacity) {
    this.strokeOpacity = opacity;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  listen() {
   
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
    this.endX = Math.round((e.pageX - rect.left) * scaleX);
    this.endY = Math.round((e.pageY - rect.top) * scaleY);

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    Line.staticDraw(ctx, this.startX, this.startY, this.endX, this.endY, this.hexToRgba(this.strokeStyle, this.strokeOpacity), this.lineWidth);
  }

  mouseUpHandler(e) {
    if (this.mouseDown) {
      this.commitStroke();
      this.mouseDown = false;
    }
  }

  pointerDownHandler(e) {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.startX = Math.round((e.pageX - rect.left) * scaleX);
    this.startY = Math.round((e.pageY - rect.top) * scaleY);
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.endX = Math.round((e.pageX - rect.left) * scaleX);
    this.endY = Math.round((e.pageY - rect.top) * scaleY);

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    Line.staticDraw(ctx, this.startX, this.startY, this.endX, this.endY, this.hexToRgba(this.strokeStyle, this.strokeOpacity), this.lineWidth);
  }

  pointerUpHandler(e) {
    if (this.mouseDown) {
      this.commitStroke();
      this.mouseDown = false;
    }
  }

  commitStroke() {
    const stroke = {
      type: "line",
      x1: this.startX,
      y1: this.startY,
      x2: this.endX,
      y2: this.endY,
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

    canvasState.isDrawing = false;
  }

  static staticDraw(ctx, x1, y1, x2, y2, strokeStyle, lineWidth) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
    ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
    ctx.stroke();
    ctx.restore();
  }
}
