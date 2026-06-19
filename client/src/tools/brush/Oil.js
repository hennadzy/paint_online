import BaseStrokeTool from './BaseStrokeTool';
import { renderOilStroke } from '../../utils/brushEffects';

export default class Oil extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'oil';
    this.edgeHardness = 70;
  }

  enrichPoint(pt, e, speed) {
    if (e?.pointerType === 'pen' && pt.w) return pt;
    const speedBoost = Math.min(1, (speed || 0) / 20);
    pt.w = this.lineWidth * (1 + speedBoost * 0.5);
    return pt;
  }

  drawLive() {
    this.drawLiveStroke(renderOilStroke);
  }
}
