import BaseStrokeTool from './BaseStrokeTool';
import { drawMarkerStamp, hexToRgba } from '../../utils/brushEffects';

export default class Marker extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'marker';
    this.strokeOpacity = 0.5;
    this.angle = 0;
  }

  drawSegment() {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    const len = this.points.length;
    if (len < 1) return;

    const p = this.points[len - 1];
    const color = hexToRgba(this.strokeStyle, 1);
    drawMarkerStamp(ctx, p.x, p.y, this.lineWidth, this.angle, color, this.strokeOpacity);
  }
}
