export function hexToRgba(hex, opacity = 1) {
  if (!hex || hex.length < 7) return `rgba(0, 0, 0, ${opacity})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function parseColor(hex, opacity = 1) {
  return hexToRgba(hex, opacity);
}

function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Разбивает путь на плотные точки для непрерывного рендера */
export function densifyPath(points, spacing) {
  if (!points.length) return [];
  if (points.length === 1) return [points[0]];

  const step = Math.max(0.5, spacing);
  const result = [{ ...points[0] }];

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(dist / step));

    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      result.push({
        x: p0.x + dx * t,
        y: p0.y + dy * t,
        w: p0.w != null && p1.w != null ? p0.w + (p1.w - p0.w) * t : (p1.w ?? p0.w),
        speed: p0.speed != null && p1.speed != null ? p0.speed + (p1.speed - p0.speed) * t : (p1.speed ?? 0),
        a: p0.a != null && p1.a != null ? p0.a + (p1.a - p0.a) * t : p1.a,
        r: p0.r != null && p1.r != null ? p0.r + (p1.r - p0.r) * t : p1.r,
      });
    }
  }
  return result;
}

export function drawMarkerStamp(ctx, x, y, size, angleDeg, color, opacity) {
  const w = size * 1.6;
  const h = size * 0.45;
  const angle = (angleDeg * Math.PI) / 180;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.lineTo(w / 2 * 0.85, h / 2);
  ctx.lineTo(-w / 2 * 0.85, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function renderMarkerStroke(ctx, stroke) {
  const {
    points = [],
    strokeStyle = '#000000',
    strokeOpacity = 0.5,
    lineWidth = 10,
    angle = 0,
  } = stroke;
  const color = parseColor(strokeStyle, 1);
  const dense = densifyPath(points, Math.max(1, lineWidth * 0.12));

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  dense.forEach((p) => {
    drawMarkerStamp(ctx, p.x, p.y, lineWidth, angle, color, strokeOpacity);
  });
  ctx.restore();
}

export function sprayAirbrush(ctx, x, y, radius, color, opacity, seed = 0) {
  const rand = seededRandom(Math.floor(x * 1000 + y + seed));
  const count = Math.max(12, Math.floor(radius * 2));
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const dist = rand() * radius;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const dotSize = 0.5 + rand() * 1.5;
    ctx.globalAlpha = opacity * (0.3 + rand() * 0.7);
    ctx.beginPath();
    ctx.arc(px, py, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function renderAirbrushStroke(ctx, stroke) {
  const {
    points = [],
    strokeStyle = '#000000',
    strokeOpacity = 0.4,
    lineWidth = 15,
    scatter = 15,
  } = stroke;
  const dense = densifyPath(points, Math.max(2, lineWidth * 0.2));

  dense.forEach((p, i) => {
    const alpha = p.a ?? strokeOpacity;
    const r = p.r ?? (lineWidth / 2 + scatter * 0.5);
    sprayAirbrush(ctx, p.x, p.y, r, parseColor(strokeStyle, 1), alpha, i);
  });
}

export function applySmudgeAt(ctx, canvas, x, y, radius, strength, dirX, dirY) {
  const r = Math.ceil(radius);
  const sx = Math.max(0, Math.floor(x - r));
  const sy = Math.max(0, Math.floor(y - r));
  const sw = Math.min(canvas.width - sx, r * 2);
  const sh = Math.min(canvas.height - sy, r * 2);
  if (sw <= 0 || sh <= 0) return;

  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const data = imageData.data;
  const w = sw;
  const h = sh;
  const copy = new Uint8ClampedArray(data);
  const factor = strength / 100;
  const ox = Math.round(dirX * factor * 3);
  const oy = Math.round(dirY * factor * 3);

  for (let py = 1; py < h - 1; py++) {
    for (let px = 1; px < w - 1; px++) {
      const cx = px + sx;
      const cy = py + sy;
      const dist = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
      if (dist > radius) continue;

      const idx = (py * w + px) * 4;
      const sx2 = Math.max(0, Math.min(w - 1, px - ox));
      const sy2 = Math.max(0, Math.min(h - 1, py - oy));
      const sidx = (sy2 * w + sx2) * 4;
      const blend = factor * (1 - dist / radius);

      data[idx] = copy[idx] * (1 - blend) + copy[sidx] * blend;
      data[idx + 1] = copy[idx + 1] * (1 - blend) + copy[sidx + 1] * blend;
      data[idx + 2] = copy[idx + 2] * (1 - blend) + copy[sidx + 2] * blend;
      data[idx + 3] = copy[idx + 3];
    }
  }
  ctx.putImageData(imageData, sx, sy);
}

export function renderSmudgeStroke(ctx, stroke, canvas) {
  const { points = [], lineWidth = 20, strength = 50 } = stroke;
  const dense = densifyPath(points, Math.max(2, lineWidth * 0.25));
  for (let i = 1; i < dense.length; i++) {
    const p0 = dense[i - 1];
    const p1 = dense[i];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    applySmudgeAt(ctx, canvas, p1.x, p1.y, lineWidth / 2, strength, dx / len, dy / len);
  }
  if (dense.length === 1) {
    applySmudgeAt(ctx, canvas, dense[0].x, dense[0].y, lineWidth / 2, strength, 0, 0);
  }
}

function drawWatercolorBlob(ctx, x, y, r, strokeStyle, alpha, rand, bleed = 0) {
  const bx = x + (rand() - 0.5) * r * bleed;
  const by = y + (rand() - 0.5) * r * bleed;
  const rr = r * (0.9 + rand() * 0.25);

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const grad = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
  grad.addColorStop(0, parseColor(strokeStyle, alpha * 0.85));
  grad.addColorStop(0.35, parseColor(strokeStyle, alpha * 0.45));
  grad.addColorStop(0.7, parseColor(strokeStyle, alpha * 0.12));
  grad.addColorStop(1, parseColor(strokeStyle, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(bx, by, rr, 0, Math.PI * 2);
  ctx.fill();

  const grainCount = Math.floor(rr * 0.6);
  for (let g = 0; g < grainCount; g++) {
    const angle = rand() * Math.PI * 2;
    const dist = rand() * rr * 0.85;
    ctx.globalAlpha = alpha * 0.15 * rand();
    ctx.fillStyle = parseColor(strokeStyle, 1);
    ctx.fillRect(bx + Math.cos(angle) * dist, by + Math.sin(angle) * dist, 1, 1);
  }
  ctx.restore();
}

export function renderWatercolorStroke(ctx, stroke) {
  const {
    points = [],
    strokeStyle = '#000000',
    strokeOpacity = 0.45,
    lineWidth = 12,
    saturation = 50,
  } = stroke;
  const waterFactor = 1 - saturation / 100;
  const alpha = strokeOpacity * (0.35 + (1 - waterFactor) * 0.55);
  const dense = densifyPath(points, Math.max(1.5, lineWidth * 0.18));

  dense.forEach((p, i) => {
    const rand = seededRandom(Math.floor(p.x * 7 + p.y * 13 + i));
    const r = lineWidth / 2;
    drawWatercolorBlob(ctx, p.x, p.y, r, strokeStyle, alpha, rand, 0.35);

    if (i > 0) {
      const prev = dense[i - 1];
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const bleedOff = r * 0.25;
      drawWatercolorBlob(ctx, p.x + nx * bleedOff, p.y + ny * bleedOff, r * 0.85, strokeStyle, alpha * 0.5, rand, 0.2);
      drawWatercolorBlob(ctx, p.x - nx * bleedOff, p.y - ny * bleedOff, r * 0.85, strokeStyle, alpha * 0.5, rand, 0.2);
    }
  });
}

function drawOilBristleSegment(ctx, p0, p1, lw, strokeStyle, strokeOpacity, hardness, seed) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const rand = seededRandom(seed);
  const softEdge = 1 - hardness / 100;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'source-over';

  ctx.globalAlpha = strokeOpacity * 0.35;
  ctx.strokeStyle = parseColor(strokeStyle, 0.6);
  ctx.lineWidth = lw + softEdge * 3;
  ctx.beginPath();
  ctx.moveTo(p0.x + nx * 1.2, p0.y + ny * 1.2);
  ctx.lineTo(p1.x + nx * 1.2, p1.y + ny * 1.2);
  ctx.stroke();

  ctx.globalAlpha = strokeOpacity;
  ctx.strokeStyle = parseColor(strokeStyle, 1);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();

  const bristles = 4 + Math.floor(softEdge * 4);
  for (let b = 0; b < bristles; b++) {
    const t = rand();
    const bx = p0.x + dx * t;
    const by = p0.y + dy * t;
    const off = (rand() - 0.5) * lw * 0.5;
    ctx.globalAlpha = strokeOpacity * (0.15 + rand() * 0.25);
    ctx.lineWidth = 0.8 + rand() * 1.8;
    ctx.strokeStyle = parseColor(strokeStyle, 0.9);
    ctx.beginPath();
    ctx.moveTo(bx + nx * off, by + ny * off);
    ctx.lineTo(bx + nx * off + dx * 0.08, by + ny * off + dy * 0.08);
    ctx.stroke();
  }

  ctx.globalAlpha = strokeOpacity * 0.45;
  ctx.lineWidth = Math.max(1, lw * 0.25);
  ctx.strokeStyle = parseColor(strokeStyle, 0.5);
  ctx.beginPath();
  ctx.moveTo(p0.x - nx * 0.6, p0.y - ny * 0.6);
  ctx.lineTo(p1.x - nx * 0.6, p1.y - ny * 0.6);
  ctx.stroke();
  ctx.restore();
}

export function renderOilStroke(ctx, stroke) {
  const {
    points = [],
    strokeStyle = '#000000',
    strokeOpacity = 1,
    lineWidth = 8,
    edgeHardness = 70,
  } = stroke;
  const dense = densifyPath(points, Math.max(1, lineWidth * 0.12));

  for (let i = 1; i < dense.length; i++) {
    const p0 = dense[i - 1];
    const p1 = dense[i];
    const w0 = p0.w ?? lineWidth;
    const w1 = p1.w ?? lineWidth;
    drawOilBristleSegment(
      ctx, p0, p1, (w0 + w1) / 2,
      strokeStyle, strokeOpacity, edgeHardness,
      Math.floor(p1.x * 3 + p1.y * 5 + i)
    );
  }

  if (dense.length === 1) {
    const p = dense[0];
    const w = p.w ?? lineWidth;
    ctx.save();
    ctx.fillStyle = parseColor(strokeStyle, strokeOpacity);
    ctx.beginPath();
    ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPastelGrainAt(ctx, x, y, r, strokeStyle, strokeOpacity, grain, seed) {
  const rand = seededRandom(seed);
  const dots = Math.floor(10 + grain * 24);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (let d = 0; d < dots; d++) {
    const angle = rand() * Math.PI * 2;
    const dist = rand() * r;
    const dotR = 0.3 + rand() * 2.2;
    ctx.globalAlpha = strokeOpacity * (0.25 + rand() * 0.55);
    ctx.fillStyle = parseColor(strokeStyle, 1);
    ctx.beginPath();
    ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  const dustCount = Math.floor(2 + grain * 6);
  for (let d = 0; d < dustCount; d++) {
    ctx.globalAlpha = strokeOpacity * 0.18;
    ctx.fillStyle = parseColor(strokeStyle, 1);
    const dx = (rand() - 0.5) * r * 2.8;
    const dy = (rand() - 0.5) * r * 2.8;
    ctx.fillRect(x + dx, y + dy, 1 + rand(), 1);
  }
  ctx.restore();
}

export function renderPastelStroke(ctx, stroke) {
  const {
    points = [],
    strokeStyle = '#000000',
    strokeOpacity = 0.35,
    lineWidth = 10,
    graininess = 60,
  } = stroke;
  const grain = graininess / 100;
  const dense = densifyPath(points, Math.max(1, lineWidth * 0.14));

  dense.forEach((p, i) => {
    drawPastelGrainAt(
      ctx, p.x, p.y, lineWidth / 2,
      strokeStyle, strokeOpacity, grain,
      Math.floor(p.x * 11 + p.y * 17 + i)
    );
  });
}

export function calcCalligraphyWidth(baseWidth, dx, dy, speed, sensitivity) {
  const angle = Math.abs(Math.atan2(dy, dx));
  const angleFactor = Math.abs(Math.sin(angle * 2));
  const speedFactor = Math.min(1, speed / 15);
  const sens = sensitivity / 100;
  const widthFromSpeed = baseWidth * (1 - speedFactor * sens * 0.7);
  const widthFromAngle = baseWidth * (0.3 + angleFactor * 0.7);
  return Math.max(1, (widthFromSpeed + widthFromAngle) / 2);
}

function drawCalligraphyRibbon(ctx, p0, p1, w0, w1, color) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, w0 / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const nx = -dy / len;
  const ny = dx / len;

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.moveTo(p0.x + nx * w0 / 2, p0.y + ny * w0 / 2);
  ctx.lineTo(p1.x + nx * w1 / 2, p1.y + ny * w1 / 2);
  ctx.lineTo(p1.x - nx * w1 / 2, p1.y - ny * w1 / 2);
  ctx.lineTo(p0.x - nx * w0 / 2, p0.y - ny * w0 / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function renderCalligraphyStroke(ctx, stroke) {
  const {
    points = [],
    strokeStyle = '#000000',
    strokeOpacity = 1,
    lineWidth = 8,
    speedSensitivity = 50,
  } = stroke;
  const color = parseColor(strokeStyle, strokeOpacity);
  const dense = densifyPath(points, Math.max(0.8, lineWidth * 0.08));

  for (let i = 1; i < dense.length; i++) {
    const p0 = dense[i - 1];
    const p1 = dense[i];
    const w0 = p0.w ?? calcCalligraphyWidth(lineWidth, p1.x - p0.x, p1.y - p0.y, p0.speed ?? 0, speedSensitivity);
    const w1 = p1.w ?? calcCalligraphyWidth(lineWidth, p1.x - p0.x, p1.y - p0.y, p1.speed ?? 0, speedSensitivity);
    drawCalligraphyRibbon(ctx, p0, p1, w0, w1, color);
  }

  if (dense.length === 1) {
    const p = dense[0];
    drawCalligraphyRibbon(ctx, p, p, p.w ?? lineWidth, p.w ?? lineWidth, color);
  }
}

export const BRUSH_STROKE_TYPES = [
  'marker',
  'airbrush',
  'smudge',
  'watercolor',
  'oil',
  'pastel',
  'calligraphy',
];

export function renderSpecialBrushStroke(ctx, stroke, canvas) {
  switch (stroke.type) {
    case 'marker':
      renderMarkerStroke(ctx, stroke);
      break;
    case 'airbrush':
      renderAirbrushStroke(ctx, stroke);
      break;
    case 'smudge':
      renderSmudgeStroke(ctx, stroke, canvas || ctx.canvas);
      break;
    case 'watercolor':
      renderWatercolorStroke(ctx, stroke);
      break;
    case 'oil':
      renderOilStroke(ctx, stroke);
      break;
    case 'pastel':
      renderPastelStroke(ctx, stroke);
      break;
    case 'calligraphy':
      renderCalligraphyStroke(ctx, stroke);
      break;
    default:
      break;
  }
}

/** Рисует маркерные штампы вдоль отрезка (для live-preview) */
export function drawMarkerAlongSegment(ctx, x0, y0, x1, y1, lineWidth, angle, strokeStyle, strokeOpacity) {
  const color = parseColor(strokeStyle, 1);
  const spacing = Math.max(1, lineWidth * 0.12);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.ceil(dist / spacing));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    drawMarkerStamp(ctx, x0 + dx * t, y0 + dy * t, lineWidth, angle, color, strokeOpacity);
  }
}
