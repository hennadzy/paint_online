import BaseStrokeTool from './BaseStrokeTool';
import { renderAirbrushStroke } from '../../utils/brushEffects';

export default class Airbrush extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'airbrush';
    this.strokeOpacity = 0.35;
    this.scatter = 15;
    this._dwellStart = null;
  }

  onStrokeStart() {
    this._dwellStart = Date.now();
  }

  enrichPoint(pt) {
    const baseW = pt.w ?? this.lineWidth;
    const dwellMs = Date.now() - (this._dwellStart || Date.now());
    const dwellBoost = Math.min(1, dwellMs / 800);
    const speedFactor = Math.max(0.15, 1 - (pt.speed || 0) / 30);
    const press = Math.max(0.2, Math.min(1, baseW / Math.max(1, this.lineWidth)));
    pt.a = this.strokeOpacity * (0.3 + dwellBoost * 0.5) * speedFactor * (0.5 + press * 0.5);
    pt.r = baseW / 2 + this.scatter * (0.5 + dwellBoost * 0.5);
    return pt;
  }

  drawLive() {
    this.drawLiveFull(renderAirbrushStroke);
  }
}
