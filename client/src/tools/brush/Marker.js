import BaseStrokeTool from './BaseStrokeTool';
import { drawMarkerAlongSegment } from '../../utils/brushEffects';

export default class Marker extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'marker';
    this.strokeOpacity = 0.5;
    this.angle = 0;
    this._liveFrom = 0;
  }

  getPointSpacing() {
    return Math.max(1, this.lineWidth * 0.12);
  }

  pointerDownHandler(e) {
    this._liveFrom = 0;
    super.pointerDownHandler(e);
  }

  drawSegment() {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    const pts = this.points;
    if (pts.length < 1) return;

    const start = Math.max(1, this._liveFrom);
    for (let i = start; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      drawMarkerAlongSegment(
        ctx, p0.x, p0.y, p1.x, p1.y,
        this.lineWidth, this.angle, this.strokeStyle, this.strokeOpacity
      );
    }
    this._liveFrom = pts.length - 1;
  }
}
