import BaseStrokeTool from './BaseStrokeTool';
import { calcCalligraphyWidth, renderCalligraphyStroke } from '../../utils/brushEffects';

export default class Calligraphy extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'calligraphy';
    this.speedSensitivity = 50;
    this.angleSensitivity = 50;
    this._prevX = null;
    this._prevY = null;
    this._prevW = null;
  }

  pointerDownHandler(e) {
    this._prevX = null;
    this._prevY = null;
    this._prevW = null;
    super.pointerDownHandler(e);
  }

  getPointSpacing() {
    return Math.max(0.15, (this.lineWidth || 5) * 0.022);
  }

  enrichPoint(pt, e, speed) {
    const refX = this._prevX ?? this.lastX ?? pt.x;
    const refY = this._prevY ?? this.lastY ?? pt.y;
    const dx = pt.x - refX;
    const dy = pt.y - refY;
    let w = calcCalligraphyWidth(
      this.lineWidth, dx, dy, speed,
      this.speedSensitivity, this.angleSensitivity
    );

    if (this._prevW != null) {
      const maxStep = Math.max(0.4, this.lineWidth * 0.06);
      w = Math.max(this._prevW - maxStep, Math.min(this._prevW + maxStep, w));
    }

    if (e?.pointerType === 'pen' || (typeof e?.pressure === 'number' && e.pressure > 0 && e.pointerType !== 'touch')) {
      const pw = this.getPressureAdjustedLineWidth(e);
      w = w * 0.4 + pw * 0.6;
    }

    pt.w = Math.max(0.8, w);
    this._prevX = pt.x;
    this._prevY = pt.y;
    this._prevW = pt.w;
    return pt;
  }

  drawLive() {
    this.drawLiveFull(renderCalligraphyStroke);
  }
}
