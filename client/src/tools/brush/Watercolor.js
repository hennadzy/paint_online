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
    const dwellMs = Date.now() - (this._dwellStart || Date.now());
    const dwell = Math.min(1, dwellMs / 450);
    const slow = Math.max(0, 1 - (speed || 0) / 18);
    const water = 1 - this.saturation / 100;
    const spread = 1 + dwell * 2.2 + slow * 0.8;
    pt.r = (this.lineWidth / 2) * spread;
    pt.a = this.strokeOpacity * (0.12 + water * 0.35 + slow * 0.15) * (0.65 + dwell * 0.35);
    pt.dwell = dwell;
    return pt;
  }

  getPointSpacing() {
    return Math.max(1.5, (this.lineWidth || 5) * 0.2);
  }

  drawLive() {
    this.drawLiveFull(renderWatercolorStroke);
  }
}
