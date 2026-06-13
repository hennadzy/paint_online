import { computeFloodFillMask, parseHexColor } from './floodFill';

export function computeRegionMask(imageData, startX, startY) {
  return computeFloodFillMask(imageData, startX, startY);
}

export { parseHexColor };

export function stampBrushInRegion(imageData, mask, x, y, fillColor, brushSize) {
  const { width, height, data } = imageData;
  const { r: fillR, g: fillG, b: fillB } = parseHexColor(fillColor);
  const radius = brushSize / 2;
  const radiusSq = radius * radius;
  const minX = Math.max(0, Math.floor(x - radius));
  const maxX = Math.min(width - 1, Math.ceil(x + radius));
  const minY = Math.max(0, Math.floor(y - radius));
  const maxY = Math.min(height - 1, Math.ceil(y + radius));

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const dx = px - x;
      const dy = py - y;
      if (dx * dx + dy * dy > radiusSq) continue;

      const idx = py * width + px;
      if (!mask[idx]) continue;

      const pos = idx * 4;
      data[pos] = fillR;
      data[pos + 1] = fillG;
      data[pos + 2] = fillB;
      data[pos + 3] = 255;
    }
  }
}

export function drawBrushStrokeInRegion(ctx, mask, points, fillColor, brushSize = 10) {
  if (!points.length) return;

  const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);

  stampBrushInRegion(imageData, mask, points[0].x, points[0].y, fillColor, brushSize);

  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / (brushSize * 0.35)));

    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      stampBrushInRegion(
        imageData,
        mask,
        from.x + dx * t,
        from.y + dy * t,
        fillColor,
        brushSize
      );
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
