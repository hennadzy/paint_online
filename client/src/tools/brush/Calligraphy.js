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
    return Math.max(0.4, (this.lineWidth || 5) * 0.08);
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
      const maxStep = this.lineWidth * 0.28;
      w = Math.max(this._prevW - maxStep, Math.min(this._prevW + maxStep, w));
    }

    if (e?.pointerType === 'pen') {
      const pw = this.getPressureAdjustedLineWidth(e);
      w = w * 0.55 + pw * 0.45;
    }

    pt.w = Math.max(1, w);
    this._prevX = pt.x;
    this._prevY = pt.y;
    this._prevW = pt.w;
    return pt;
  }

  drawLive() {
    this.drawLiveFull(renderCalligraphyStroke);
  }
}
