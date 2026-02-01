import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Circle extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.startX = 0;
    this.startY = 0;
    this.radius = 0;
    this.strokeStyle = "#000000";
    this.strokeOpacity = 1;
    this.lineWidth = 1;


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
    e.target.setPointerCapture(e.pointerId);
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;

    const { x, y } = this.getCanvasCoordinates(e);
    this.startX = x;
    this.startY = y;
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown) return;

    const { x, y } = this.getCanvasCoordinates(e);
    this.radius = Math.sqrt((x - this.startX) ** 2 + (y - this.startY) ** 2);

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    Circle.staticDraw(ctx, this.startX, this.startY, this.radius, this.hexToRgba(this.strokeStyle, this.strokeOpacity), this.lineWidth);
  }

  pointerUpHandler(e) {
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
