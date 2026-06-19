import BaseStrokeTool from './BaseStrokeTool';
import canvasState from '../../store/canvasState';
import { renderWatercolorStroke } from '../../utils/brushEffects';

export default class Watercolor extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'watercolor';
    this.strokeOpacity = 0.45;
    this.saturation = 50;
  }

  getPointSpacing() {
    return Math.max(1.5, this.lineWidth * 0.18);
  }

  drawSegment() {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    canvasState.redrawCanvas();
    renderWatercolorStroke(ctx, {
      type: 'watercolor',
      points: this.points,
      strokeStyle: this.strokeStyle,
      strokeOpacity: this.strokeOpacity,
      lineWidth: this.lineWidth,
      saturation: this.saturation,
    });
  }
}
