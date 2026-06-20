import Tool from '../Tool';
import canvasState from '../../store/canvasState';
import toolState from '../../store/toolState';
import CanvasService from '../../services/CanvasService';

export default class BaseStrokeTool extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.points = [];
    this.strokeStyle = '#000000';
    this.strokeOpacity = 1;
    this.lastX = null;
    this.lastY = null;
    this.strokeType = 'brush';
    this._liveRafId = null;
    this._pendingLiveRender = null;
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
    const base = Math.max(1, (this.lineWidth || 5) * 0.15);
    return window.innerWidth <= 768 ? base * 1.6 : base;
  }

  ensureLiveLayer() {
    if (!this._liveLayer) {
      this._liveLayer = document.createElement('canvas');
      this._liveLayerCtx = this._liveLayer.getContext('2d', { willReadFrequently: true });
    }
    if (
      this._liveLayer.width !== this.canvas.width ||
      this._liveLayer.height !== this.canvas.height
    ) {
      this._liveLayer.width = this.canvas.width;
      this._liveLayer.height = this.canvas.height;
    }
    return this._liveLayerCtx;
  }

  clearLiveLayer() {
    if (this._liveLayerCtx) {
      this._liveLayerCtx.clearRect(0, 0, this._liveLayer.width, this._liveLayer.height);
    }
    this._livePointCount = 0;
  }

  compositeLiveToDisplay() {
    CanvasService.blitBufferToDisplay();
    if (!this._liveLayer) return;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(this._liveLayer, 0, 0);
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
    this.cancelLivePreview();
    this.clearLiveLayer();
  }

  cancelLivePreview() {
    if (this._liveRafId != null) {
      cancelAnimationFrame(this._liveRafId);
      this._liveRafId = null;
    }
    this._pendingLiveRender = null;
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
    this.cancelLivePreview();
    this.clearLiveLayer();
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
    this.compositeLiveToDisplay();
    this.drawLive();
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown) return;

    if (this.isPinchingActive()) {
      this.mouseDown = false;
      canvasState.isDrawing = false;
      this.cancelLivePreview();
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

    this.scheduleLivePreview(() => this.drawLive());
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
    this.cancelLivePreview();
    this.clearLiveLayer();
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

  scheduleLivePreview(paintFn, immediate = false) {
    this._pendingLiveRender = paintFn;
    if (immediate) {
      if (this._liveRafId != null) {
        cancelAnimationFrame(this._liveRafId);
        this._liveRafId = null;
      }
      this.flushLivePreview();
      return;
    }
    if (this._liveRafId != null) return;

    const throttleMs = window.innerWidth <= 768 ? 32 : 0;
    const now = performance.now();
    if (throttleMs > 0 && this._lastLiveFrameAt && now - this._lastLiveFrameAt < throttleMs) {
      this._liveRafId = requestAnimationFrame(() => {
        this._liveRafId = null;
        this.scheduleLivePreview(paintFn);
      });
      return;
    }

    this._liveRafId = requestAnimationFrame(() => {
      this._liveRafId = null;
      this._lastLiveFrameAt = performance.now();
      this.flushLivePreview();
    });
  }

  flushLivePreview() {
    const paintFn = this._pendingLiveRender;
    this._pendingLiveRender = null;
    if (!paintFn || !this.mouseDown || this.points.length === 0) return;
    paintFn();
    this.compositeLiveToDisplay();
  }

  drawLiveFull(renderFn, needsCanvas = false) {
    if (this.points.length === 0) return;

    const liveCtx = this.ensureLiveLayer();
    const from = Math.max(0, this._livePointCount - 1);
    const segmentPoints = this.points.slice(from);
    if (segmentPoints.length === 0) return;

    const payload = {
      ...this.buildStrokePayload(),
      points: segmentPoints,
      livePreview: true,
    };

    if (needsCanvas) {
      renderFn(liveCtx, payload, this.canvas);
    } else {
      renderFn(liveCtx, payload);
    }

    this._livePointCount = this.points.length;
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
    this.clearLiveLayer();
  }
}
