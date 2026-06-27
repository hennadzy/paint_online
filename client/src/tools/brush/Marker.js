import BaseStrokeTool from './BaseStrokeTool';
import {
  addPolygonToPath,
  clipConvexPolygons,
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
      baseGrid: new Map(),
      coverageGrids: Array.from({ length: MARKER_MAX_COVERAGE_LEVELS }, () => new Map()),
      pendingBase: { items: [], index: 0 },
      pendingCoverage: Array.from(
        { length: MARKER_MAX_COVERAGE_LEVELS },
        () => ({ items: [], index: 0 })
      ),
      minPathGap: Math.max(lineWidth * 3.2, 24),
      cellSize: Math.max(8, lineWidth * 1.4),
    };
  }

  ensureMarkerMasks() {
    const width = this.canvas.width;
    const height = this.canvas.height;

    if (!this._markerBaseMask) {
      this._markerBaseMask = document.createElement('canvas');
      this._markerColorLayer = document.createElement('canvas');
      this._markerCoverageMasks = Array.from(
        { length: MARKER_MAX_COVERAGE_LEVELS },
        () => document.createElement('canvas')
      );
    }

    const masks = [
      this._markerBaseMask,
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
    this._markerColorLayerCtx = this._markerColorLayer.getContext('2d');
    this._markerCoverageMaskCtxs = this._markerCoverageMasks.map((mask) => mask.getContext('2d'));
  }

  clearMarkerMasks() {
    const masks = [
      this._markerBaseMask,
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

  getMaskRegionFromBounds(bounds) {
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

  mergeRegions(a, b) {
    if (!a) return b;
    if (!b) return a;
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const maxX = Math.max(a.x + a.width, b.x + b.width);
    const maxY = Math.max(a.y + a.height, b.y + b.height);
    return { x, y, width: maxX - x, height: maxY - y };
  }

  renderMarkerMasksToLive(liveCtx, color, dirtyRegion = null) {
    const colorCtx = this._markerColorLayerCtx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    if (!colorCtx) return;

    const region = dirtyRegion || { x: 0, y: 0, width, height };
    if (region.width <= 0 || region.height <= 0) return;

    liveCtx.clearRect(region.x, region.y, region.width, region.height);

    const drawColoredMask = (mask) => {
      colorCtx.clearRect(region.x, region.y, region.width, region.height);
      colorCtx.save();
      colorCtx.globalCompositeOperation = 'source-over';
      colorCtx.globalAlpha = this.strokeOpacity;
      colorCtx.fillStyle = color;
      colorCtx.fillRect(region.x, region.y, region.width, region.height);
      colorCtx.globalCompositeOperation = 'destination-in';
      colorCtx.globalAlpha = 1;
      colorCtx.drawImage(
        mask,
        region.x,
        region.y,
        region.width,
        region.height,
        region.x,
        region.y,
        region.width,
        region.height
      );
      colorCtx.restore();
      liveCtx.drawImage(
        this._markerColorLayer,
        region.x,
        region.y,
        region.width,
        region.height,
        region.x,
        region.y,
        region.width,
        region.height
      );
    };

    drawColoredMask(this._markerBaseMask);
    for (let level = 1; level < this._markerCoverageMasks.length; level++) {
      drawColoredMask(this._markerCoverageMasks[level]);
    }
  }

  getCellRange(bounds, cellSize) {
    return {
      minX: Math.floor(bounds.minX / cellSize),
      minY: Math.floor(bounds.minY / cellSize),
      maxX: Math.floor(bounds.maxX / cellSize),
      maxY: Math.floor(bounds.maxY / cellSize),
    };
  }

  addLiveItemToGrid(grid, item, cellSize) {
    const range = this.getCellRange(item.bounds, cellSize);
    for (let y = range.minY; y <= range.maxY; y++) {
      for (let x = range.minX; x <= range.maxX; x++) {
        const key = `${x}:${y}`;
        const bucket = grid.get(key) || [];
        bucket.push(item);
        grid.set(key, bucket);
      }
    }
  }

  getLiveCandidates(grid, bounds, cellSize) {
    const range = this.getCellRange(bounds, cellSize);
    const candidates = new Set();
    for (let y = range.minY; y <= range.maxY; y++) {
      for (let x = range.minX; x <= range.maxX; x++) {
        const bucket = grid.get(`${x}:${y}`);
        if (!bucket) continue;
        bucket.forEach((item) => candidates.add(item));
      }
    }
    return candidates;
  }

  matureLivePending(state, pending, grid) {
    while (
      pending.index < pending.items.length &&
      state.distance - pending.items[pending.index].distance >= state.minPathGap
    ) {
      this.addLiveItemToGrid(grid, pending.items[pending.index], state.cellSize);
      pending.index += 1;
    }
  }

  fillLiveIntersections(state, polygon, bounds, sourceGrid, targetLevel) {
    const candidates = this.getLiveCandidates(sourceGrid, bounds, state.cellSize);
    candidates.forEach((older) => {
      const olderBounds = older.bounds;
      if (
        bounds.minX > olderBounds.maxX ||
        bounds.maxX < olderBounds.minX ||
        bounds.minY > olderBounds.maxY ||
        bounds.maxY < olderBounds.minY
      ) {
        return;
      }

      const intersection = clipConvexPolygons(polygon, older.polygon);
      if (!intersection.length) return;

      this.fillMaskPolygon(this._markerCoverageMaskCtxs[targetLevel], intersection);
      state.pendingCoverage[targetLevel].items.push({
        polygon: intersection,
        bounds: getPolygonBounds(intersection),
        distance: state.distance,
      });
    });
  }

  processLiveCoverageSegment(state, polygon) {
    this.matureLivePending(state, state.pendingBase, state.baseGrid);
    for (let level = 1; level < state.pendingCoverage.length; level++) {
      this.matureLivePending(state, state.pendingCoverage[level], state.coverageGrids[level]);
    }

    const bounds = getPolygonBounds(polygon);
    this.fillLiveIntersections(state, polygon, bounds, state.baseGrid, 1);
    for (let level = 2; level < this._markerCoverageMaskCtxs.length; level++) {
      this.fillLiveIntersections(state, polygon, bounds, state.coverageGrids[level - 1], level);
    }

    this.fillMaskPolygon(this._markerBaseMaskCtx, polygon);
    state.pendingBase.items.push({ polygon, bounds, distance: state.distance });
    return this.getMaskRegionFromBounds(bounds);
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
      state.pendingBase.items.length === 0
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
      this.renderMarkerMasksToLive(
        liveCtx,
        color,
        this.getMaskRegionFromBounds(getPolygonBounds(
          getMarkerSegmentPolygon(this.points[0], this.points[0], this.lineWidth, this.angle)
        ))
      );
      this._liveDrawnCount = 1;
      return;
    }

    const startIndex = Math.max(1, this._liveDrawnCount);
    let dirtyRegion = null;
    for (let i = startIndex; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      state.distance += Math.hypot(p1.x - p0.x, p1.y - p0.y);

      dirtyRegion = this.mergeRegions(dirtyRegion, this.processLiveCoverageSegment(
        state,
        getMarkerSegmentPolygon(p0, p1, this.lineWidth, this.angle)
      ));
    }

    this.renderMarkerMasksToLive(liveCtx, color, dirtyRegion);
    this._liveDrawnCount = this.points.length;
  }

  commitStroke() {
    // The marker preview is intentionally simplified for responsiveness.
    // Commit the full vector stroke so long lines do not keep preview artifacts.
    this._liveDrawnCount = 0;
    super.commitStroke();
  }
}
