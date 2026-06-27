import BaseStrokeTool from './BaseStrokeTool';
import {
  addPolygonToPath,
  getMarkerSegmentPolygon,
  getPolygonBounds,
  MARKER_MAX_COVERAGE_LEVELS,
  parseColor,
  drawMarkerPass,
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
    this._markerLiveState = null;
    this.clearMarkerMasks();
  }

  createLiveState() {
    const lineWidth = this.lineWidth || 10;
    return {
      distance: 0,
      pendingSegments: [],
      pendingIndex: 0,
      minPathGap: Math.max(lineWidth * 3.2, 24),
    };
  }

  ensureMarkerMasks() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    if (!this._markerBaseMask) {
      this._markerBaseMask = document.createElement('canvas');
      this._markerScratchMask = document.createElement('canvas');
      this._markerColorLayer = document.createElement('canvas');
      this._markerCoverageMasks = Array.from(
        { length: MARKER_MAX_COVERAGE_LEVELS },
        () => document.createElement('canvas')
      );
    }

    const masks = [
      this._markerBaseMask,
      this._markerScratchMask,
      this._markerColorLayer,
      ...this._markerCoverageMasks,
    ];
    masks.forEach((mask) => {
      if (mask.width !== width || mask.height !== height) {
        mask.width = width;
        mask.height = height;
      }
    });

    this._markerBaseMaskCtx = this._markerBaseMask.getContext('2d');
    this._markerScratchMaskCtx = this._markerScratchMask.getContext('2d');
    this._markerColorLayerCtx = this._markerColorLayer.getContext('2d');
    this._markerCoverageMaskCtxs = this._markerCoverageMasks.map((mask) => mask.getContext('2d'));
  }

  clearMarkerMasks() {
    const masks = [
      this._markerBaseMask,
      this._markerScratchMask,
      this._markerColorLayer,
      ...(this._markerCoverageMasks || []),
    ];
    masks.forEach((mask) => {
      if (!mask) return;
      const ctx = mask.getContext('2d');
      ctx?.clearRect(0, 0, mask.width, mask.height);
    });
  }

  fillMaskPolygon(ctx, polygon) {
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.beginPath();
    addPolygonToPath(ctx, polygon);
    ctx.fill();
    ctx.restore();
  }

  renderMarkerMasksToLive(liveCtx, color) {
    const colorCtx = this._markerColorLayerCtx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    if (!colorCtx) return;

    liveCtx.clearRect(0, 0, width, height);

    const drawColoredMask = (mask) => {
      colorCtx.clearRect(0, 0, width, height);
      colorCtx.save();
      colorCtx.globalCompositeOperation = 'source-over';
      colorCtx.globalAlpha = this.strokeOpacity;
      colorCtx.fillStyle = color;
      colorCtx.fillRect(0, 0, width, height);
      colorCtx.globalCompositeOperation = 'destination-in';
      colorCtx.globalAlpha = 1;
      colorCtx.drawImage(mask, 0, 0);
      colorCtx.restore();
      liveCtx.drawImage(this._markerColorLayer, 0, 0);
    };

    drawColoredMask(this._markerBaseMask);
    for (let level = 1; level < this._markerCoverageMasks.length; level++) {
      drawColoredMask(this._markerCoverageMasks[level]);
    }
  }

  getMaskRegion(polygon) {
    const bounds = getPolygonBounds(polygon);
    const width = this.canvas.width;
    const height = this.canvas.height;
    const x = Math.max(0, Math.floor(bounds.minX - 2));
    const y = Math.max(0, Math.floor(bounds.minY - 2));
    const maxX = Math.min(width, Math.ceil(bounds.maxX + 2));
    const maxY = Math.min(height, Math.ceil(bounds.maxY + 2));
    return {
      x,
      y,
      width: Math.max(0, maxX - x),
      height: Math.max(0, maxY - y),
    };
  }

  processLiveCoverageSegment(state, polygon) {
    while (
      state.pendingIndex < state.pendingSegments.length &&
      state.distance - state.pendingSegments[state.pendingIndex].distance >= state.minPathGap
    ) {
      this.fillMaskPolygon(this._markerCoverageMaskCtxs[0], state.pendingSegments[state.pendingIndex].polygon);
      state.pendingIndex += 1;
    }

    const region = this.getMaskRegion(polygon);
    if (region.width > 0 && region.height > 0) {
      for (let level = this._markerCoverageMaskCtxs.length - 2; level >= 0; level--) {
        this._markerScratchMaskCtx.clearRect(region.x, region.y, region.width, region.height);
        this.fillMaskPolygon(this._markerScratchMaskCtx, polygon);
        this._markerScratchMaskCtx.globalCompositeOperation = 'destination-in';
        this._markerScratchMaskCtx.drawImage(this._markerCoverageMasks[level], 0, 0);
        this._markerScratchMaskCtx.globalCompositeOperation = 'source-over';
        this._markerCoverageMaskCtxs[level + 1].drawImage(
          this._markerScratchMask,
          region.x,
          region.y,
          region.width,
          region.height,
          region.x,
          region.y,
          region.width,
          region.height
        );
      }
      this._markerScratchMaskCtx.clearRect(region.x, region.y, region.width, region.height);
    }

    this.fillMaskPolygon(this._markerBaseMaskCtx, polygon);
    state.pendingSegments.push({ polygon, distance: state.distance });
  }

  drawLive() {
    if (this.points.length === 0) return;

    const liveCtx = this.ensureLiveLayer();
    this.ensureMarkerMasks();

    if (!this._markerLiveState || this._liveDrawnCount > this.points.length) {
      super.clearLiveLayer();
      this.clearMarkerMasks();
      this._liveDrawnCount = 0;
      this._markerLiveState = this.createLiveState();
    }

    let state = this._markerLiveState;
    if (
      this._liveDrawnCount === 1 &&
      this.points.length > 1 &&
      state.distance === 0 &&
      state.pendingSegments.length === 0
    ) {
      super.clearLiveLayer();
      this.clearMarkerMasks();
      this._markerLiveState = this.createLiveState();
      state = this._markerLiveState;
      this._liveDrawnCount = 0;
    }

    const color = parseColor(this.strokeStyle, 1);

    if (this._liveDrawnCount === 0 && this.points.length === 1) {
      drawMarkerPass(this._markerBaseMaskCtx, [this.points[0]], this.lineWidth, this.angle, '#000', 1);
      this.renderMarkerMasksToLive(liveCtx, color);
      this._liveDrawnCount = 1;
      return;
    }

    const startIndex = Math.max(1, this._liveDrawnCount);
    for (let i = startIndex; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      state.distance += Math.hypot(p1.x - p0.x, p1.y - p0.y);

      this.processLiveCoverageSegment(
        state,
        getMarkerSegmentPolygon(p0, p1, this.lineWidth, this.angle)
      );
    }

    this.renderMarkerMasksToLive(liveCtx, color);
    this._liveDrawnCount = this.points.length;
  }

  commitStroke() {
    // The marker preview is intentionally simplified for responsiveness.
    // Commit the full vector stroke so long lines do not keep preview artifacts.
    this._liveDrawnCount = 0;
    super.commitStroke();
  }
}
