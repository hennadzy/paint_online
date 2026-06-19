import Tool from './Tool';
import canvasState from '../store/canvasState';

export default class Ellipse extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.startX = 0;
    this.startY = 0;
    this.width = 0;
    this.height = 0;
    this.strokeStyle = '#000000';
    this.strokeOpacity = 1;
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

    this.canvas.addEventListener('pointerdown', this.pointerDownHandlerBound);
    document.addEventListener('pointermove', this.pointerMoveHandlerBound);
    document.addEventListener('pointerup', this.pointerUpHandlerBound);
    this.listenGlobalEndEvents();
  }

  destroyEvents() {
    this.canvas.removeEventListener('pointerdown', this.pointerDownHandlerBound);
    document.removeEventListener('pointermove', this.pointerMoveHandlerBound);
    document.removeEventListener('pointerup', this.pointerUpHandlerBound);
    this.removeGlobalEndEvents();
  }

  pointerDownHandler(e) {
    if (this.isPinchingActive()) return;

    e.target.setPointerCapture(e.pointerId);
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;

    const { x, y } = this.getCanvasCoordinates(e);
    this.startX = x;
    this.startY = y;
    this.shiftKey = e.shiftKey;
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown) return;

    if (this.isPinchingActive()) {
      this.mouseDown = false;
      canvasState.isDrawing = false;
      return;
    }

    const { x, y } = this.getCanvasCoordinates(e);
    this.width = x - this.startX;
    this.height = y - this.startY;

    if (e.shiftKey || this.shiftKey) {
      const size = Math.max(Math.abs(this.width), Math.abs(this.height));
      this.width = this.width < 0 ? -size : size;
      this.height = this.height < 0 ? -size : size;
    }

    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    canvasState.redrawCanvas();
    Ellipse.staticDraw(
      ctx,
      this.startX,
      this.startY,
      this.width,
      this.height,
      this.hexToRgba(this.strokeStyle, this.strokeOpacity),
      this.lineWidth
    );
  }

  pointerUpHandler() {
    if (this.mouseDown) {
      this.commitStroke();
      this.mouseDown = false;
    }
  }

  commitStroke() {
    const stroke = {
      type: 'ellipse',
      x: this.startX,
      y: this.startY,
      width: this.width,
      height: this.height,
      strokeStyle: this.strokeStyle,
      strokeOpacity: this.strokeOpacity,
      lineWidth: this.lineWidth,
      username: this.username,
    };

    canvasState.pushStroke(stroke);
    this.saveImage();

    this.send(JSON.stringify({
      method: 'draw',
      id: this.id,
      username: this.username,
      figure: stroke,
    }));

    canvasState.isDrawing = false;
  }

  static staticDraw(ctx, x, y, width, height, strokeStyle, lineWidth) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    const rx = Math.abs(width / 2);
    const ry = Math.abs(height / 2);

    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.globalCompositeOperation = 'source-over';
    ctx.beginPath();
    ctx.ellipse(Math.round(cx) + 0.5, Math.round(cy) + 0.5, Math.round(rx), Math.round(ry), 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }
}
