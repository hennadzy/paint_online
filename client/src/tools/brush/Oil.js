import BaseStrokeTool from './BaseStrokeTool';
import canvasState from '../../store/canvasState';
import { renderOilStroke } from '../../utils/brushEffects';

export default class Oil extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'oil';
    this.edgeHardness = 70;
  }

  getPointSpacing() {
    return Math.max(1, this.lineWidth * 0.12);
  }

  enrichPoint(pt, e, speed) {
    if (e?.pointerType === 'pen' && pt.w) return pt;
    const speedBoost = Math.min(1, (speed || 0) / 20);
    pt.w = this.lineWidth * (1 + speedBoost * 0.5);
    return pt;
  }

  drawSegment() {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    canvasState.redrawCanvas();
    renderOilStroke(ctx, {
      type: 'oil',
      points: this.points,
      strokeStyle: this.strokeStyle,
      strokeOpacity: this.strokeOpacity,
      lineWidth: this.lineWidth,
      edgeHardness: this.edgeHardness,
    });
  }
}
