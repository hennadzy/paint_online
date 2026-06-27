import BaseStrokeTool from './BaseStrokeTool';
import {
  getMarkerSegmentPolygon,
  MarkerCoverageRenderer,
} from '../../utils/brushEffects';

export default class Marker extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'marker';
    this.strokeOpacity = 0.5;
    this.angle = 0;
  }

  clearLiveLayer() {
    super.clearLiveLayer();
    this._markerCoverageRenderer = null;
    this._markerLiveDistance = 0;
  }

  mergeRegions(a, b) {
    if (!a) return b;
    if (!b) return a;
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const maxX = Math.max(a.x + a.width, b.x + b.width);
    const maxY = Math.max(a.y + a.height, b.y + b.height);
    return { x, y, width: maxX - x, height: maxY - y };
  }

  resetCoverageRenderer() {
    this._markerCoverageRenderer = new MarkerCoverageRenderer(
      this.canvas.width,
      this.canvas.height,
      this.lineWidth || 10
    );
    this._markerLiveDistance = 0;
  }

  drawLive() {
    if (this.points.length === 0) return;

    const liveCtx = this.ensureLiveLayer();

    if (!this._markerCoverageRenderer || this._liveDrawnCount > this.points.length) {
      super.clearLiveLayer();
      this._liveDrawnCount = 0;
      this.resetCoverageRenderer();
    }

    if (
      this._liveDrawnCount === 1 &&
      this.points.length > 1 &&
      this._markerLiveDistance === 0
    ) {
      super.clearLiveLayer();
      this.resetCoverageRenderer();
      this._liveDrawnCount = 0;
    }

    if (this._liveDrawnCount === 0 && this.points.length === 1) {
      const region = this._markerCoverageRenderer.addPolygon(
        getMarkerSegmentPolygon(this.points[0], this.points[0], this.lineWidth, this.angle),
        0
      );
      this._markerCoverageRenderer.renderTo(liveCtx, this.strokeStyle, this.strokeOpacity, region, true);
      this._liveDrawnCount = 1;
      return;
    }

    const startIndex = Math.max(1, this._liveDrawnCount);
    let dirtyRegion = null;
    for (let i = startIndex; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      this._markerLiveDistance += Math.hypot(p1.x - p0.x, p1.y - p0.y);

      dirtyRegion = this.mergeRegions(
        dirtyRegion,
        this._markerCoverageRenderer.addPolygon(
          getMarkerSegmentPolygon(p0, p1, this.lineWidth, this.angle),
          this._markerLiveDistance
        )
      );
    }

    this._markerCoverageRenderer.renderTo(liveCtx, this.strokeStyle, this.strokeOpacity, dirtyRegion, true);
    this._liveDrawnCount = this.points.length;
  }

  commitStroke() {
    // The marker preview is intentionally simplified for responsiveness.
    // Commit the full vector stroke so long lines do not keep preview artifacts.
    this._liveDrawnCount = 0;
    super.commitStroke();
  }
}
