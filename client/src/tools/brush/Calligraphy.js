import BaseStrokeTool from './BaseStrokeTool';
import canvasState from '../../store/canvasState';
import { calcCalligraphyWidth, drawCalligraphyRibbon, parseColor } from '../../utils/brushEffects';

export default class Calligraphy extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'calligraphy';
    this.speedSensitivity = 50;
    this._prevX = null;
    this._prevY = null;
  }

  getPointSpacing() {
    return Math.max(0.5, this.lineWidth * 0.06);
  }

  pointerDownHandler(e) {
    this._prevX = null;
    this._prevY = null;
    super.pointerDownHandler(e);
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

  drawSegment() {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    const len = this.points.length;
    if (len < 2) return;

    const p0 = this.points[len - 2];
    const p1 = this.points[len - 1];
    const w0 = p0.w ?? this.lineWidth;
    const w1 = p1.w ?? this.lineWidth;
    const color = parseColor(this.strokeStyle, this.strokeOpacity);

    drawCalligraphyRibbon(ctx, p0, p1, w0, w1, color);
  }
}
