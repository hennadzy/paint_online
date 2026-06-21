import Tool from '../Tool';
import canvasState from '../../store/canvasState';
import toolState from '../../store/toolState';
import CanvasService from '../../services/CanvasService';

const HEAVY_STROKE_TYPES = new Set([
  'marker', 'airbrush', 'smudge', 'watercolor', 'oil', 'pastel', 'calligraphy',
]);
const MAX_STROKE_POINTS_DESKTOP = 4000;
const MAX_STROKE_POINTS_MOBILE = 700;
const MOBILE_HEAVY_FRAME_DELAY = 48;
const MOBILE_SMUDGE_FRAME_DELAY = 80;
const MOBILE_SIMPLE_PREVIEW_TYPES = new Set([
  'marker', 'airbrush', 'smudge', 'watercolor', 'oil', 'pastel',
]);

function isMobileBrushDevice() {
  return window.innerWidth <= 768;
}

function supportsDelegatedInk() {
  return typeof navigator !== 'undefined' && typeof navigator.ink?.requestPresenter === 'function';
}

function isMobileDirectStroke(strokeType) {
  return false;
}

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
    this._liveLayer = null;
    this._liveLayerCtx = null;
    this._liveDrawnCount = 0;
    this._liveLayerContainsBuffer = false;
    this._inkPresenterPromise = null;
    this._liveTimeoutId = null;
    this._lastLiveRenderAt = 0;
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

  getPointSpacing(speed = 0) {
    const base = Math.max(1, (this.lineWidth || 5) * 0.15);
    const heavyMul = HEAVY_STROKE_TYPES.has(this.strokeType) ? 2 : 1;
    const mobileMul = isMobileBrushDevice()
      ? (HEAVY_STROKE_TYPES.has(this.strokeType) ? 4.2 : 1.4)
      : 1;
    const speedMul = 1 + Math.min(2, Math.max(0, speed) / 12);
    return base * heavyMul * mobileMul * speedMul;
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
      this._liveDrawnCount = 0;
      this._liveLayerContainsBuffer = false;
    }
    if (this.strokeType === 'smudge' && !this._liveLayerContainsBuffer) {
      this._liveLayerCtx.clearRect(0, 0, this._liveLayer.width, this._liveLayer.height);
      if (CanvasService.bufferCanvas) {
        this._liveLayerCtx.drawImage(CanvasService.bufferCanvas, 0, 0);
      }
      this._liveLayerContainsBuffer = true;
    }
    return this._liveLayerCtx;
  }

  clearLiveLayer() {
    if (this._liveLayerCtx) {
      this._liveLayerCtx.clearRect(0, 0, this._liveLayer.width, this._liveLayer.height);
    }
    this._liveDrawnCount = 0;
    this._liveLayerContainsBuffer = false;
  }

  presentLiveStroke() {
    if (isMobileDirectStroke(this.strokeType)) {
      return;
    }
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
    this._inkPresenterPromise = null;
  }

  ensureInkPresenter() {
    if (!supportsDelegatedInk()) return;
    if (this._inkPresenterPromise) return;
    this._inkPresenterPromise = navigator.ink
      .requestPresenter({ presentationArea: this.canvas })
      .catch(() => null);
  }

  updateInkTrail(e) {
    if (!this.mouseDown) return;
    if (!this._inkPresenterPromise) return;
    if (!e?.isTrusted) return;
    if (e.pointerType === 'mouse') return;

    const diameter = Math.max(
      1,
      e.pointerType === 'pen'
        ? this.getPressureAdjustedLineWidth(e)
        : (this.lineWidth || 1)
    );
    const color = this.strokeStyle || '#000000';

    this._inkPresenterPromise.then((presenter) => {
      if (!presenter) return;
      presenter.updateInkTrailStartPoint(e, { color, diameter });
    });
  }

  cancelLivePreview() {
    if (this._liveRafId != null) {
      cancelAnimationFrame(this._liveRafId);
      this._liveRafId = null;
    }
    if (this._liveTimeoutId != null) {
      clearTimeout(this._liveTimeoutId);
      this._liveTimeoutId = null;
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
    this.ensureInkPresenter();
    this.updateInkTrail(e);

    const { x, y } = this.getCanvasCoordinates(e);
    this.lastX = x;
    this.lastY = y;
    this.lastTime = Date.now();
    const pt = this.createPoint(x, y, e, 0);
    this.points.push(pt);
    this.drawLive();
    this.presentLiveStroke();
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown) return;
    this.updateInkTrail(e);

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
    const spacing = this.getPointSpacing(speed);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.5) return;

    const steps = Math.max(1, Math.ceil(dist / spacing));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.points.push(this.createPoint(x1 + dx * t, y1 + dy * t, e, speed));
    }
    this.trimStrokePoints();
  }

  trimStrokePoints() {
    const maxPoints = isMobileBrushDevice() ? MAX_STROKE_POINTS_MOBILE : MAX_STROKE_POINTS_DESKTOP;
    if (this.points.length <= maxPoints) return;
    const excess = this.points.length - maxPoints;
    // Keep stroke tail responsive while dropping oldest dense points.
    this.points.splice(1, excess);
    this._liveDrawnCount = Math.max(0, this._liveDrawnCount - excess);
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
    this.commitStroke();
    this.clearLiveLayer();
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
      if (this._liveTimeoutId != null) {
        clearTimeout(this._liveTimeoutId);
        this._liveTimeoutId = null;
      }
      this.flushLivePreview();
      return;
    }
    if (this._liveRafId != null || this._liveTimeoutId != null) return;

    const delay = this.getLivePreviewDelay();
    const now = performance.now();
    const wait = Math.max(0, delay - (now - this._lastLiveRenderAt));
    const requestFlush = () => {
      this._liveTimeoutId = null;
      this._liveRafId = requestAnimationFrame(() => {
        this._liveRafId = null;
        this.flushLivePreview();
      });
    };

    if (wait > 0) {
      this._liveTimeoutId = setTimeout(requestFlush, wait);
    } else {
      requestFlush();
    }
  }

  flushLivePreview() {
    const paintFn = this._pendingLiveRender;
    this._pendingLiveRender = null;
    if (!paintFn || !this.mouseDown || this.points.length === 0) return;
    this._lastLiveRenderAt = performance.now();
    paintFn();
    this.presentLiveStroke();
  }

  getLivePreviewDelay() {
    if (!isMobileBrushDevice() || !HEAVY_STROKE_TYPES.has(this.strokeType)) {
      return 0;
    }
    return this.strokeType === 'smudge' ? MOBILE_SMUDGE_FRAME_DELAY : MOBILE_HEAVY_FRAME_DELAY;
  }

  drawLiveFull(renderFn, needsCanvas = false) {
    if (this.points.length === 0) return;

    const from = Math.max(0, this._liveDrawnCount - 1);
    const segmentPoints = this.points.slice(from);
    if (segmentPoints.length === 0) return;

    if (this.shouldUseSimpleMobilePreview()) {
      this.drawSimpleMobileSegment(segmentPoints);
      this._liveDrawnCount = this.points.length;
      return;
    }

    const payload = {
      ...this.buildStrokePayload(),
      points: segmentPoints,
      livePreview: HEAVY_STROKE_TYPES.has(this.strokeType),
      mobilePreview: HEAVY_STROKE_TYPES.has(this.strokeType) && isMobileBrushDevice(),
    };

    const liveCtx = this.ensureLiveLayer();
    if (needsCanvas) {
      renderFn(liveCtx, payload, this.canvas);
    } else {
      renderFn(liveCtx, payload);
    }

    this._liveDrawnCount = this.points.length;
  }

  shouldUseSimpleMobilePreview() {
    return isMobileBrushDevice() && MOBILE_SIMPLE_PREVIEW_TYPES.has(this.strokeType);
  }

  drawSimpleMobileSegment(points) {
    const liveCtx = this.ensureLiveLayer();
    const color = this.strokeType === 'smudge'
      ? 'rgba(180, 180, 180, 0.35)'
      : this.hexToRgba(this.strokeStyle || '#000000', this.strokeOpacity ?? 1);

    liveCtx.save();
    liveCtx.globalCompositeOperation = 'source-over';
    liveCtx.strokeStyle = color;
    liveCtx.fillStyle = color;
    liveCtx.lineCap = 'round';
    liveCtx.lineJoin = 'round';

    if (points.length === 1) {
      const w = points[0].w ?? this.lineWidth ?? 1;
      liveCtx.beginPath();
      liveCtx.arc(points[0].x, points[0].y, w / 2, 0, Math.PI * 2);
      liveCtx.fill();
      liveCtx.restore();
      return;
    }

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const w0 = p0.w ?? this.lineWidth ?? 1;
      const w1 = p1.w ?? this.lineWidth ?? 1;
      liveCtx.lineWidth = Math.max(1, (w0 + w1) / 2);
      liveCtx.beginPath();
      liveCtx.moveTo(p0.x, p0.y);
      liveCtx.lineTo(p1.x, p1.y);
      liveCtx.stroke();
    }
    liveCtx.restore();
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
    if (HEAVY_STROKE_TYPES.has(this.strokeType)) {
      stroke.livePreview = true;
      stroke.mobilePreview = isMobileBrushDevice();
      if (this.shouldUseSimpleMobilePreview()) {
        stroke.mobileFastPath = true;
      }
    }
    const commitFromLiveLayer =
      HEAVY_STROKE_TYPES.has(this.strokeType) &&
      this._liveLayer &&
      this._liveDrawnCount > 0 &&
      CanvasService.bufferCtx;
    if (commitFromLiveLayer) {
      if (this.strokeType === 'smudge') {
        CanvasService.bufferCtx.clearRect(0, 0, CanvasService.bufferCanvas.width, CanvasService.bufferCanvas.height);
      }
      CanvasService.bufferCtx.drawImage(this._liveLayer, 0, 0);
    }

    this.points = [];
    canvasState.pushStroke(stroke, { skipBufferDraw: commitFromLiveLayer });
    this.saveImage();

    this.send(JSON.stringify({
      method: 'draw',
      id: this.id,
      username: this.username,
      figure: stroke,
    }));
    canvasState.isDrawing = false;
  }
}
