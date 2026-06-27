import BaseStrokeTool from './BaseStrokeTool';
import {
  addPolygonToPath,
  boundsOverlap,
  clipPolygon,
  getMarkerSegmentPolygon,
  getPolygonBounds,
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
      cells: new Map(),
      cellSize: Math.max(8, lineWidth * 1.4),
      minPathGap: Math.max(lineWidth * 3.2, 24),
    };
  }

  ensureMarkerMasks() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    if (!this._markerBaseMask) {
      this._markerBaseMask = document.createElement('canvas');
      this._markerOverlapMask = document.createElement('canvas');
      this._markerColorLayer = document.createElement('canvas');
    }

    const masks = [this._markerBaseMask, this._markerOverlapMask, this._markerColorLayer];
    masks.forEach((mask) => {
      if (mask.width !== width || mask.height !== height) {
        mask.width = width;
        mask.height = height;
      }
    });

    this._markerBaseMaskCtx = this._markerBaseMask.getContext('2d');
    this._markerOverlapMaskCtx = this._markerOverlapMask.getContext('2d');
    this._markerColorLayerCtx = this._markerColorLayer.getContext('2d');
  }

  clearMarkerMasks() {
    const masks = [this._markerBaseMask, this._markerOverlapMask, this._markerColorLayer];
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
    drawColoredMask(this._markerOverlapMask);
  }

  getCellRange(bounds, cellSize) {
    return {
      minX: Math.floor(bounds.minX / cellSize),
      minY: Math.floor(bounds.minY / cellSize),
      maxX: Math.floor(bounds.maxX / cellSize),
      maxY: Math.floor(bounds.maxY / cellSize),
    };
  }

  addLiveSegmentToCells(state, segment) {
    const range = this.getCellRange(segment.bounds, state.cellSize);
    for (let y = range.minY; y <= range.maxY; y++) {
      for (let x = range.minX; x <= range.maxX; x++) {
        const key = `${x}:${y}`;
        const bucket = state.cells.get(key) || [];
        bucket.push(segment);
        state.cells.set(key, bucket);
      }
    }
  }

  getLiveCandidates(state, bounds) {
    const range = this.getCellRange(bounds, state.cellSize);
    const candidates = new Set();
    for (let y = range.minY; y <= range.maxY; y++) {
      for (let x = range.minX; x <= range.maxX; x++) {
        const bucket = state.cells.get(`${x}:${y}`);
        if (!bucket) continue;
        bucket.forEach((segment) => candidates.add(segment));
      }
    }
    return candidates;
  }

  drawLiveOverlap(state, polygon, bounds) {
    const candidates = this.getLiveCandidates(state, bounds);
    if (!candidates.size) return;

    candidates.forEach((older) => {
      if (!boundsOverlap(bounds, older.bounds)) return;

      const intersection = clipPolygon(polygon, older.polygon);
      if (!intersection.length) return;

      this.fillMaskPolygon(this._markerOverlapMaskCtx, intersection);
    });
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

      while (
        state.pendingIndex < state.pendingSegments.length &&
        state.distance - state.pendingSegments[state.pendingIndex].distance >= state.minPathGap
      ) {
        this.addLiveSegmentToCells(state, state.pendingSegments[state.pendingIndex]);
        state.pendingIndex += 1;
      }

      const polygon = getMarkerSegmentPolygon(p0, p1, this.lineWidth, this.angle);
      const bounds = getPolygonBounds(polygon);

      this.fillMaskPolygon(this._markerBaseMaskCtx, polygon);
      this.drawLiveOverlap(state, polygon, bounds);

      state.pendingSegments.push({ polygon, bounds, distance: state.distance });
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
