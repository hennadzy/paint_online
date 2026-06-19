import BaseStrokeTool from './BaseStrokeTool';
import canvasState from '../../store/canvasState';
import { calcCalligraphyWidth, renderCalligraphyStroke } from '../../utils/brushEffects';

export default class Calligraphy extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'calligraphy';
    this.speedSensitivity = 50;
  }

  enrichPoint(pt, e, speed) {
    const dx = pt.x - (this.lastX ?? pt.x);
    const dy = pt.y - (this.lastY ?? pt.y);
    let w = calcCalligraphyWidth(this.lineWidth, dx, dy, speed, this.speedSensitivity);
    if (e?.pointerType === 'pen') {
      const pw = this.getPressureAdjustedLineWidth(e);
      w = (w + pw) / 2;
    }
    pt.w = w;
    return pt;
  }

  drawSegment() {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    canvasState.redrawCanvas();
    renderCalligraphyStroke(ctx, {
      type: 'calligraphy',
      points: this.points,
      strokeStyle: this.strokeStyle,
      strokeOpacity: this.strokeOpacity,
      lineWidth: this.lineWidth,
      speedSensitivity: this.speedSensitivity,
    });
  }
}
