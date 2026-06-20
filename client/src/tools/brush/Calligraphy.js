import BaseStrokeTool from './BaseStrokeTool';
import { renderCalligraphyStroke } from '../../utils/brushEffects';

export default class Calligraphy extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'calligraphy';
    this.speedSensitivity = 50;
    this.angleSensitivity = 50;
  }

  getPointSpacing() {
    return Math.max(1, (this.lineWidth || 5) * 0.12);
  }

  enrichPoint(pt, e) {
    if (e?.pointerType === 'pen') {
      pt.pr = this.getPressureAdjustedLineWidth(e) / Math.max(1, this.lineWidth);
    }
    return pt;
  }

  drawLive() {
    this.drawLiveFull(renderCalligraphyStroke);
  }
}
