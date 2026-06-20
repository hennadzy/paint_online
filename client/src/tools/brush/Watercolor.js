import BaseStrokeTool from './BaseStrokeTool';
import { renderWatercolorStroke } from '../../utils/brushEffects';

export default class Watercolor extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'watercolor';
    this.strokeOpacity = 0.45;
    this.saturation = 50;
    this.texture = true;
    this._dwellStart = null;
  }

  onStrokeStart() {
    this._dwellStart = Date.now();
  }

  enrichPoint(pt, e, speed) {
    const baseW = pt.w ?? this.lineWidth;
    const press = Math.max(0.2, Math.min(1, baseW / Math.max(1, this.lineWidth)));
    const dwellMs = Date.now() - (this._dwellStart || Date.now());
    const dwell = Math.min(1, dwellMs / 450);
    const slow = Math.max(0, 1 - (speed || 0) / 18);
    const water = 1 - this.saturation / 100;
    const spread = 1 + dwell * 2.2 + slow * 0.8;
    pt.r = (baseW / 2) * spread;
    pt.a = this.strokeOpacity * (0.12 + water * 0.35 + slow * 0.15) * (0.65 + dwell * 0.35) * (0.45 + press * 0.55);
    pt.dwell = dwell;
    return pt;
  }

  drawLive() {
    this.drawLiveFull(renderWatercolorStroke);
  }
}
