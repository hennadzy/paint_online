const DEFAULT_THRESHOLD = 24;
const DEFAULT_THRESHOLD_SQ = DEFAULT_THRESHOLD * DEFAULT_THRESHOLD * 4;
const BARRIER_LUMINANCE_RATIO = 0.42;
const BARRIER_MIN_ALPHA = 180;
const EXPANSION_PASSES = 2;

export function parseHexColor(fillColor) {
  if (!fillColor || !fillColor.startsWith('#')) {
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

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function colorDistSq(data, pos, r, g, b, a) {
  const dr = data[pos] - r;
  const dg = data[pos + 1] - g;
  const db = data[pos + 2] - b;
  const da = data[pos + 3] - a;
  return dr * dr + dg * dg + db * db + da * da;
}

function matchesStartColor(data, pos, startR, startG, startB, startA, thresholdSq) {
  return colorDistSq(data, pos, startR, startG, startB, startA) <= thresholdSq;
}

function isStrokeBarrier(data, pos, startR, startG, startB) {
  const r = data[pos];
  const g = data[pos + 1];
  const b = data[pos + 2];
  const a = data[pos + 3];

  if (a < 64) {
    return true;
  }

  if (a < BARRIER_MIN_ALPHA) {
    return false;
  }

  const startLum = luminance(startR, startG, startB);
  const pixLum = luminance(r, g, b);
  const lumRatio = pixLum / Math.max(startLum, 1);

  if (lumRatio < BARRIER_LUMINANCE_RATIO) {
    return true;
  }

  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  const startSaturation = Math.max(startR, startG, startB) - Math.min(startR, startG, startB);

  if (saturation > 50 && saturation > startSaturation + 30) {
    const distToStart = (r - startR) ** 2 + (g - startG) ** 2 + (b - startB) ** 2;
    if (distToStart > DEFAULT_THRESHOLD_SQ) {
      return true;
    }
  }

  return false;
}

function hasFilledNeighbor(mask, width, height, x, y) {
  if (x > 0 && mask[y * width + (x - 1)]) return true;
  if (x < width - 1 && mask[y * width + (x + 1)]) return true;
  if (y > 0 && mask[(y - 1) * width + x]) return true;
  if (y < height - 1 && mask[(y + 1) * width + x]) return true;
  return false;
}

export function computeFloodFillMask(imageData, startX, startY, options = {}) {
  const { width, height, data } = imageData;
  const thresholdSq = (options.threshold ?? DEFAULT_THRESHOLD) ** 2 * 4;
  const expandEdges = options.expandEdges !== false;

  const startPos = (startY * width + startX) * 4;
  if (startPos < 0 || startPos >= data.length) {
    return new Uint8Array(width * height);
  }

  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  const startA = data[startPos + 3];

  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const stack = [[startX, startY]];

  while (stack.length > 0) {
    const [nx, ny] = stack.pop();

    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    if (visited[ny * width + nx]) continue;

    const pos = (ny * width + nx) * 4;
    if (!matchesStartColor(data, pos, startR, startG, startB, startA, thresholdSq)) continue;

    let west = nx;
    while (west > 0 && !visited[ny * width + (west - 1)] && matchesStartColor(data, (ny * width + (west - 1)) * 4, startR, startG, startB, startA, thresholdSq)) {
      west--;
    }

    let east = nx;
    while (east < width - 1 && !visited[ny * width + (east + 1)] && matchesStartColor(data, (ny * width + (east + 1)) * 4, startR, startG, startB, startA, thresholdSq)) {
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
        if (matchesStartColor(data, upPos, startR, startG, startB, startA, thresholdSq)) {
          stack.push([i, ny - 1]);
        }
      }
      if (ny < height - 1 && !visited[(ny + 1) * width + i]) {
        const downPos = ((ny + 1) * width + i) * 4;
        if (matchesStartColor(data, downPos, startR, startG, startB, startA, thresholdSq)) {
          stack.push([i, ny + 1]);
        }
      }
    }
  }

  if (!expandEdges) {
    return mask;
  }

  for (let pass = 0; pass < EXPANSION_PASSES; pass++) {
    const toFill = [];

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const idx = py * width + px;
        if (mask[idx] || !hasFilledNeighbor(mask, width, height, px, py)) continue;

        const pos = idx * 4;
        if (!isStrokeBarrier(data, pos, startR, startG, startB)) {
          toFill.push(idx);
        }
      }
    }

    if (toFill.length === 0) break;

    for (const idx of toFill) {
      mask[idx] = 1;
    }
  }

  return mask;
}

export function floodFillImageData(imageData, startX, startY, fillColor, options = {}) {
  const { width, height, data } = imageData;
  const { r: fillR, g: fillG, b: fillB } = parseHexColor(fillColor);

  const startPos = (startY * width + startX) * 4;
  if (startPos < 0 || startPos >= data.length) {
    return false;
  }

  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  const startA = data[startPos + 3];

  if (startR === fillR && startG === fillG && startB === fillB && startA === 255) {
    return false;
  }

  const mask = computeFloodFillMask(imageData, startX, startY, options);

  let filledAny = false;
  for (let idx = 0; idx < mask.length; idx++) {
    if (!mask[idx]) continue;

    const pos = idx * 4;
    data[pos] = fillR;
    data[pos + 1] = fillG;
    data[pos + 2] = fillB;
    data[pos + 3] = 255;
    filledAny = true;
  }

  return filledAny;
}
