import Tool from '../Tool';
import canvasState from '../../store/canvasState';
import toolState from '../../store/toolState';

export default class BaseStrokeTool extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.points = [];
    this.strokeStyle = '#000000';
    this.strokeOpacity = 1;
    this.lastX = null;
    this.lastY = null;
    this.strokeType = 'brush';
  }

  setStrokeColor(color) {
    this.strokeStyle = color;
  }

  setStrokeOpacity(opacity) {
    this.strokeOpacity = opacity;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  getPointSpacing() {
    return Math.max(1, (this.lineWidth || 5) * 0.15);
  }

  applyToolParams() {
    const params = toolState.getToolParams(this.strokeType);
    Object.assign(this, params);
  }

  listen() {
    if (!this.pointerDownHandlerBound) {
      this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
      this.pointerMoveHandlerBound = this.pointerMoveHandler.bind(this);
      this.pointerUpHandlerBound = this.pointerUpHandler.bind(this);
      this.lostPointerCaptureHandlerBound = this.lostPointerCaptureHandler.bind(this);
    }

    this.applyToolParams();
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    ctx.globalCompositeOperation = 'source-over';

    this.canvas.addEventListener('pointerdown', this.pointerDownHandlerBound);
    this.canvas.addEventListener('pointermove', this.pointerMoveHandlerBound);
    this.canvas.addEventListener('pointerup', this.pointerUpHandlerBound);
    this.canvas.addEventListener('pointercancel', this.pointerUpHandlerBound);
    this.canvas.addEventListener('lostpointercapture', this.lostPointerCaptureHandlerBound);
  }

  destroyEvents() {
    this.canvas.removeEventListener('pointerdown', this.pointerDownHandlerBound);
    this.canvas.removeEventListener('pointermove', this.pointerMoveHandlerBound);
    this.canvas.removeEventListener('pointerup', this.pointerUpHandlerBound);
    this.canvas.removeEventListener('pointercancel', this.pointerUpHandlerBound);
    this.canvas.removeEventListener('lostpointercapture', this.lostPointerCaptureHandlerBound);
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
    this.applyToolParams();
    this.onStrokeStart?.(e);

    const { x, y } = this.getCanvasCoordinates(e);
    this.lastX = x;
    this.lastY = y;
    this.lastTime = Date.now();
    const pt = this.createPoint(x, y, e, 0);
    this.points.push(pt);
    canvasState.redrawCanvas();
    this.drawLive();
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown) return;

    if (this.isPinchingActive()) {
      this.mouseDown = false;
      canvasState.isDrawing = false;
      if (this.points.length > 0) this.commitStroke();
      return;
    }

    const { x, y } = this.getCanvasCoordinates(e);
    const now = Date.now();
    const dt = Math.max(1, now - (this.lastTime || now));
    const speed = Math.sqrt((x - this.lastX) ** 2 + (y - this.lastY) ** 2) / dt * 16;

    this.addPointsAlongLine(this.lastX, this.lastY, x, y, e, speed);
    this.lastX = x;
    this.lastY = y;
    this.lastTime = now;

    this.drawLive();
  }

  addPointsAlongLine(x1, y1, x2, y2, e, speed) {
    const spacing = this.getPointSpacing();
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) return;

    const steps = Math.max(1, Math.ceil(dist / spacing));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.points.push(this.createPoint(x1 + dx * t, y1 + dy * t, e, speed));
    }
  }

  pointerUpHandler(e) {
    if (!this.mouseDown) {
      if (this._hasCommitted) canvasState.isDrawing = false;
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

  createPoint(x, y, e, speed) {
    const pt = { x, y, speed };
    if (e?.pointerType === 'pen') {
      pt.w = this.getPressureAdjustedLineWidth(e);
    }
    return this.enrichPoint?.(pt, e, speed) ?? pt;
  }

  drawLive() {
    this.drawSegment?.();
  }

  /** Live-preview = commit: полный redraw + тот же рендер, что после отпускания */
  drawLiveFull(renderFn, needsCanvas = false) {
    canvasState.redrawCanvas();
    if (this.points.length === 0) return;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    const payload = this.buildStrokePayload();
    if (needsCanvas) {
      renderFn(ctx, payload, this.canvas);
    } else {
      renderFn(ctx, payload);
    }
  }

  buildStrokePayload() {
    const params = toolState.getToolParams(this.strokeType);
    return {
      type: this.strokeType,
      points: [...this.points],
      strokeStyle: this.strokeStyle,
      strokeOpacity: this.strokeOpacity,
      lineWidth: this.lineWidth,
      username: this.username,
      ...params,
    };
  }

  commitStroke() {
    if (this.points.length === 0) {
      canvasState.isDrawing = false;
      return;
    }

    const stroke = this.buildStrokePayload();
    this.points = [];
    canvasState.pushStroke(stroke);
    this.saveImage();

    this.send(JSON.stringify({
      method: 'draw',
      id: this.id,
      username: this.username,
      figure: stroke,
    }));

    canvasState.redrawCanvas();
    canvasState.isDrawing = false;
  }
}
