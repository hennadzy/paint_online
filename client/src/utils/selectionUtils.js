export function normalizeRect(x1, y1, x2, y2) {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  return { x, y, width, height };
}

export function createMask(width, height) {
  return new Uint8Array(width * height);
}

export function fillRectMask(mask, canvasWidth, x, y, width, height) {
  const x1 = Math.max(0, Math.floor(x));
  const y1 = Math.max(0, Math.floor(y));
  const x2 = Math.min(canvasWidth, Math.ceil(x + width));
  const y2 = Math.min(mask.length / canvasWidth, Math.ceil(y + height));

  for (let py = y1; py < y2; py++) {
    for (let px = x1; px < x2; px++) {
      mask[py * canvasWidth + px] = 1;
    }
  }
}

export function fillPathMask(mask, canvasWidth, canvasHeight, path) {
  if (!path || path.length < 3) return;

  const minY = Math.max(0, Math.floor(Math.min(...path.map((p) => p.y))));
  const maxY = Math.min(canvasHeight - 1, Math.ceil(Math.max(...path.map((p) => p.y))));

  for (let y = minY; y <= maxY; y++) {
    const intersections = [];
    for (let i = 0; i < path.length; i++) {
      const p1 = path[i];
      const p2 = path[(i + 1) % path.length];
      if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
        const x = p1.x + ((y - p1.y) * (p2.x - p1.x)) / (p2.y - p1.y);
        intersections.push(x);
      }
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i < intersections.length; i += 2) {
      if (intersections[i + 1] === undefined) break;
      const xStart = Math.max(0, Math.floor(intersections[i]));
      const xEnd = Math.min(canvasWidth - 1, Math.ceil(intersections[i + 1]));
      for (let x = xStart; x <= xEnd; x++) {
        mask[y * canvasWidth + x] = 1;
      }
    }
  }
}

export function combineMasks(existingMask, newMask, mode, canvasWidth, canvasHeight) {
  const result = existingMask ? new Uint8Array(existingMask) : createMask(canvasWidth, canvasHeight);
  const size = canvasWidth * canvasHeight;

  for (let i = 0; i < size; i++) {
    if (mode === "add") {
      result[i] = result[i] || newMask[i] ? 1 : 0;
    } else if (mode === "subtract") {
      result[i] = result[i] && !newMask[i] ? 1 : 0;
    } else {
      result[i] = newMask[i];
    }
  }
  return result;
}

export function getMaskBounds(mask, canvasWidth, canvasHeight) {
  let minX = canvasWidth;
  let minY = canvasHeight;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      if (mask[y * canvasWidth + x]) {
        found = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!found) return null;
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

export function extractImageDataFromMask(sourceCtx, mask, canvasWidth, bounds) {
  const { x, y, width, height } = bounds;
  const source = sourceCtx.getImageData(x, y, width, height);
  const data = new Uint8ClampedArray(source.data.length);

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const maskIndex = (y + row) * canvasWidth + (x + col);
      const dataIndex = (row * width + col) * 4;
      if (mask[maskIndex]) {
        data[dataIndex] = source.data[dataIndex];
        data[dataIndex + 1] = source.data[dataIndex + 1];
        data[dataIndex + 2] = source.data[dataIndex + 2];
        data[dataIndex + 3] = source.data[dataIndex + 3];
      }
    }
  }

  return new ImageData(data, width, height);
}

export function eraseMaskFromBuffer(bufferCtx, mask, canvasWidth, canvasHeight) {
  const imageData = bufferCtx.getImageData(0, 0, canvasWidth, canvasHeight);
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      const idx = i * 4;
      imageData.data[idx] = 255;
      imageData.data[idx + 1] = 255;
      imageData.data[idx + 2] = 255;
      imageData.data[idx + 3] = 255;
    }
  }
  bufferCtx.putImageData(imageData, 0, 0);
}

export function pointInRect(px, py, rect) {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

export function pointInMask(px, py, mask, canvasWidth) {
  const x = Math.floor(px);
  const y = Math.floor(py);
  if (x < 0 || y < 0) return false;
  return Boolean(mask[y * canvasWidth + x]);
}

export function drawMarchingAnts(ctx, rect, offset = 0, path = null) {
  ctx.save();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -offset;

  if (path && path.length > 2) {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (rect) {
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width, rect.height);
  }

  ctx.strokeStyle = "#fff";
  ctx.lineDashOffset = -(offset + 4);
  if (path && path.length > 2) {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (rect) {
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width, rect.height);
  }

  ctx.restore();
}

export function imageDataToCanvas(imageData) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  canvas.getContext("2d").putImageData(imageData, 0, 0);
  return canvas;
}

export function applyTransformToImageData(imageData, transform) {
  const { angle = 0, scaleX = 1, scaleY = 1, skewX = 0, skewY = 0 } = transform;
  const srcCanvas = imageDataToCanvas(imageData);
  const w = imageData.width;
  const h = imageData.height;

  const rad = (angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const scaledW = w * Math.abs(scaleX);
  const scaledH = h * Math.abs(scaleY);
  const skewExpand = 1 + Math.abs(skewX) + Math.abs(skewY);

  const destW = Math.max(1, Math.ceil((scaledW * cos + scaledH * sin) * skewExpand));
  const destH = Math.max(1, Math.ceil((scaledW * sin + scaledH * cos) * skewExpand));

  const destCanvas = document.createElement("canvas");
  destCanvas.width = destW;
  destCanvas.height = destH;
  const ctx = destCanvas.getContext("2d");

  ctx.translate(destW / 2, destH / 2);
  ctx.rotate(rad);
  ctx.transform(1, skewY, skewX, 1, 0, 0);
  ctx.scale(scaleX, scaleY);
  ctx.drawImage(srcCanvas, -w / 2, -h / 2, w, h);

  return ctx.getImageData(0, 0, destW, destH);
}

export function getSelectionMode(e) {
  if (e.altKey) return "subtract";
  if (e.shiftKey) return "add";
  return "new";
}
