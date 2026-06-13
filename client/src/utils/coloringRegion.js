const FILL_THRESHOLD = 32;
const FILL_THRESHOLD_SQ = FILL_THRESHOLD * FILL_THRESHOLD * 4;

export function computeRegionMask(imageData, startX, startY) {
  const { width, height, data } = imageData;
  const startPos = (startY * width + startX) * 4;

  if (startPos < 0 || startPos >= data.length) {
    return new Uint8Array(width * height);
  }

  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  const startA = data[startPos + 3];

  const matchesStartColor = (pos) => {
    const dr = data[pos] - startR;
    const dg = data[pos + 1] - startG;
    const db = data[pos + 2] - startB;
    const da = data[pos + 3] - startA;
    return dr * dr + dg * dg + db * db + da * da <= FILL_THRESHOLD_SQ;
  };

  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const stack = [[startX, startY]];

  while (stack.length > 0) {
    const [nx, ny] = stack.pop();

    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    if (visited[ny * width + nx]) continue;

    const pos = (ny * width + nx) * 4;
    if (!matchesStartColor(pos)) continue;

    let west = nx;
    while (west > 0 && !visited[ny * width + (west - 1)] && matchesStartColor((ny * width + (west - 1)) * 4)) {
      west--;
    }

    let east = nx;
    while (east < width - 1 && !visited[ny * width + (east + 1)] && matchesStartColor((ny * width + (east + 1)) * 4)) {
      east++;
    }

    for (let i = west; i <= east; i++) {
      const idx = ny * width + i;
      if (!visited[idx]) {
        visited[idx] = 1;
        mask[idx] = 1;
      }
    }

    for (let i = west; i <= east; i++) {
      if (ny > 0 && !visited[(ny - 1) * width + i]) {
        const upPos = ((ny - 1) * width + i) * 4;
        if (matchesStartColor(upPos)) {
          stack.push([i, ny - 1]);
        }
      }
      if (ny < height - 1 && !visited[(ny + 1) * width + i]) {
        const downPos = ((ny + 1) * width + i) * 4;
        if (matchesStartColor(downPos)) {
          stack.push([i, ny + 1]);
        }
      }
    }
  }

  return mask;
}

function parseHexColor(fillColor) {
  if (!fillColor.startsWith('#')) {
    return { r: 0, g: 0, b: 0 };
  }

  const hex = fillColor.replace('#', '');
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }

  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

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
