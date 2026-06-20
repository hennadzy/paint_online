import BaseStrokeTool from './BaseStrokeTool';
import { renderOilStroke } from '../../utils/brushEffects';

export default class Oil extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'oil';
    this.edgeHardness = 70;
    this.pressureSensitivity = true;
  }

  enrichPoint(pt, e) {
    if (!this.pressureSensitivity) {
      pt.w = this.lineWidth;
      return pt;
    }
    if (e?.pointerType === 'pen') {
      pt.w = this.getPressureAdjustedLineWidth(e);
    } else if (typeof e?.pressure === 'number') {
      pt.w = this.lineWidth * (0.25 + e.pressure * 0.75);
    } else {
      pt.w = this.lineWidth;
    }
    return pt;
  }

  drawLive() {
    this.drawLiveFull(renderOilStroke);
  }
}
