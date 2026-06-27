import BaseStrokeTool from './BaseStrokeTool';
import { renderMarkerStroke } from '../../utils/brushEffects';

export default class Marker extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'marker';
    this.strokeOpacity = 0.5;
    this.angle = 0;
  }

  drawLive() {
    if (this.points.length === 0) return;

    const from = Math.max(0, this._liveDrawnCount - 1);
    if (from >= this.points.length) return;

    const segmentPoints = this.points.slice(from);
    const payload = {
      ...this.buildStrokePayload(),
      points: segmentPoints,
      livePreview: true,
      mobilePreview: window.innerWidth <= 768,
    };

    const liveCtx = this.ensureLiveLayer();
    renderMarkerStroke(liveCtx, payload);
    this._liveDrawnCount = this.points.length;
  }
}
