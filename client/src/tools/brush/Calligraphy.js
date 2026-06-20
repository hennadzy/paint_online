import BaseStrokeTool from './BaseStrokeTool';
import canvasState from '../../store/canvasState';
import { calcCalligraphyWidth, renderCalligraphyStroke } from '../../utils/brushEffects';

export default class Calligraphy extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'calligraphy';
    this.speedSensitivity = 50;
    this._prevX = null;
    this._prevY = null;
  }

  pointerDownHandler(e) {
    this._prevX = null;
    this._prevY = null;
    super.pointerDownHandler(e);
  }

  getPointSpacing() {
    return Math.max(0.5, (this.lineWidth || 5) * 0.12);
  }

  enrichPoint(pt, e, speed) {
    const refX = this._prevX ?? this.lastX ?? pt.x;
    const refY = this._prevY ?? this.lastY ?? pt.y;
    const dx = pt.x - refX;
    const dy = pt.y - refY;
    let w = calcCalligraphyWidth(this.lineWidth, dx, dy, speed, this.speedSensitivity);
    if (e?.pointerType === 'pen') {
      const pw = this.getPressureAdjustedLineWidth(e);
      w = (w + pw) / 2;
    }
    pt.w = w;
    this._prevX = pt.x;
    this._prevY = pt.y;
    return pt;
  }

  drawLive() {
    canvasState.redrawCanvas();
    if (this.points.length === 0) return;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    renderCalligraphyStroke(ctx, this.buildStrokePayload());
  }
}
