import BaseStrokeTool from './BaseStrokeTool';
import { sprayAirbrush, hexToRgba } from '../../utils/brushEffects';

export default class Airbrush extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'airbrush';
    this.strokeOpacity = 0.35;
    this.scatter = 15;
    this._dwellStart = null;
    this._dwellAlpha = 0;
  }

  onStrokeStart() {
    this._dwellStart = Date.now();
    this._dwellAlpha = 0;
  }

  enrichPoint(pt) {
    const dwellMs = Date.now() - (this._dwellStart || Date.now());
    const dwellBoost = Math.min(1, dwellMs / 800);
    const speedFactor = Math.max(0.15, 1 - (pt.speed || 0) / 30);
    pt.a = this.strokeOpacity * (0.3 + dwellBoost * 0.5) * speedFactor;
    pt.r = this.lineWidth / 2 + this.scatter * (0.5 + dwellBoost * 0.5);
    return pt;
  }

  drawSegment() {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    const len = this.points.length;
    if (len < 1) return;

    const p = this.points[len - 1];
    const alpha = p.a ?? this.strokeOpacity;
    const radius = p.r ?? (this.lineWidth / 2 + this.scatter);
    sprayAirbrush(ctx, p.x, p.y, radius, hexToRgba(this.strokeStyle, 1), alpha, len);
  }
}
