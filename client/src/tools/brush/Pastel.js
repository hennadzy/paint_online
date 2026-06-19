import BaseStrokeTool from './BaseStrokeTool';
import canvasState from '../../store/canvasState';
import { renderPastelStroke } from '../../utils/brushEffects';

export default class Pastel extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'pastel';
    this.strokeOpacity = 0.35;
    this.graininess = 60;
  }

  drawSegment() {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    canvasState.redrawCanvas();
    renderPastelStroke(ctx, {
      type: 'pastel',
      points: this.points,
      strokeStyle: this.strokeStyle,
      strokeOpacity: this.strokeOpacity,
      lineWidth: this.lineWidth,
      graininess: this.graininess,
    });
  }
}
