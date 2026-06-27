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

    const liveCtx = this.ensureLiveLayer();
    this.clearLiveLayer();
    renderMarkerStroke(liveCtx, {
      ...this.buildStrokePayload(),
      points: this.points,
      livePreview: true,
      incremental: true,
      mobilePreview: window.innerWidth <= 768,
    });
    this._liveDrawnCount = this.points.length;
  }
}
