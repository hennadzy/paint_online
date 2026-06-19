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
  const color = parseColor(strokeStyle, strokeOpacity);
  const step = Math.max(2, lineWidth * 0.35);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (i > 0) {
      const prev = points[i - 1];
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.floor(dist / step));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = prev.x + dx * t;
        const y = prev.y + dy * t;
        drawMarkerStamp(ctx, x, y, lineWidth, angle, color, strokeOpacity);
      }
    } else {
      drawMarkerStamp(ctx, p.x, p.y, lineWidth, angle, color, strokeOpacity);
    }
  }
  ctx.restore();
}

export function sprayAirbrush(ctx, x, y, radius, color, opacity, seed = 0) {
  const rand = seededRandom(Math.floor(x * 1000 + y + seed));
  const count = Math.max(8, Math.floor(radius * 1.5));
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

  points.forEach((p, i) => {
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
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    applySmudgeAt(ctx, canvas, p1.x, p1.y, lineWidth / 2, strength, dx / len, dy / len);
  }
  if (points.length === 1) {
    applySmudgeAt(ctx, canvas, points[0].x, points[0].y, lineWidth / 2, strength, 0, 0);
  }
}

function drawGrainDot(ctx, x, y, size, color, opacity, rand) {
  const jitterX = (rand() - 0.5) * size;
  const jitterY = (rand() - 0.5) * size;
  ctx.globalAlpha = opacity * (0.4 + rand() * 0.6);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + jitterX, y + jitterY, 0.5 + rand() * 1.2, 0, Math.PI * 2);
  ctx.fill();
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
  const alpha = strokeOpacity * (0.5 + (1 - waterFactor) * 0.5);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  points.forEach((p, i) => {
    const rand = seededRandom(Math.floor(p.x * 7 + p.y * 13 + i));
    const r = lineWidth / 2;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    grad.addColorStop(0, parseColor(strokeStyle, alpha));
    grad.addColorStop(0.6, parseColor(strokeStyle, alpha * 0.5));
    grad.addColorStop(1, parseColor(strokeStyle, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * (0.85 + rand() * 0.3), 0, Math.PI * 2);
    ctx.fill();

    const grainCount = Math.floor(r * 0.8);
    for (let g = 0; g < grainCount; g++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * r;
      drawGrainDot(
        ctx,
        p.x + Math.cos(angle) * dist,
        p.y + Math.sin(angle) * dist,
        r * 0.3,
        parseColor(strokeStyle, 1),
        alpha * 0.4,
        rand
      );
    }
  });

  if (points.length > 1) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = parseColor(strokeStyle, alpha);
    ctx.lineWidth = lineWidth * 0.3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }
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
  const hardness = edgeHardness / 100;
  const color = parseColor(strokeStyle, strokeOpacity);
  const highlight = parseColor(strokeStyle, strokeOpacity * 0.35);
  const shadow = parseColor(strokeStyle, strokeOpacity * 0.5);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const w0 = p0.w ?? lineWidth;
    const w1 = p1.w ?? lineWidth;
    const lw = (w0 + w1) / 2;

    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const relief = (1 - hardness) * 2 + 1;

    ctx.lineWidth = lw + relief;
    ctx.strokeStyle = shadow;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(p0.x + nx, p0.y + ny);
    ctx.lineTo(p1.x + nx, p1.y + ny);
    ctx.stroke();

    ctx.lineWidth = lw;
    ctx.strokeStyle = color;
    ctx.globalAlpha = strokeOpacity;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    ctx.lineWidth = Math.max(1, lw * 0.3);
    ctx.strokeStyle = highlight;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(p0.x - nx * 0.5, p0.y - ny * 0.5);
    ctx.lineTo(p1.x - nx * 0.5, p1.y - ny * 0.5);
    ctx.stroke();

    const rand = seededRandom(Math.floor(p1.x + p1.y + i));
    for (let t = 0; t < 3; t++) {
      const jx = (rand() - 0.5) * lw * 0.4;
      const jy = (rand() - 0.5) * lw * 0.4;
      ctx.globalAlpha = strokeOpacity * 0.3;
      ctx.lineWidth = 1 + rand() * 2;
      ctx.beginPath();
      ctx.moveTo(p1.x + jx, p1.y + jy);
      ctx.lineTo(p1.x + jx + (rand() - 0.5) * 4, p1.y + jy + (rand() - 0.5) * 4);
      ctx.stroke();
    }
  }

  if (points.length === 1) {
    const p = points[0];
    const w = p.w ?? lineWidth;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, w / 2, 0, Math.PI * 2);
    ctx.fill();
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
  const color = parseColor(strokeStyle, 1);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  points.forEach((p, i) => {
    const rand = seededRandom(Math.floor(p.x * 11 + p.y * 17 + i));
    const r = lineWidth / 2;
    const dots = Math.floor(8 + grain * 20);

    for (let d = 0; d < dots; d++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * r;
      const dotR = 0.4 + rand() * 1.8;
      ctx.globalAlpha = strokeOpacity * (0.3 + rand() * 0.7);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(angle) * dist, p.y + Math.sin(angle) * dist, dotR, 0, Math.PI * 2);
      ctx.fill();
    }

    if (rand() > 0.5) {
      const dustCount = Math.floor(grain * 5);
      for (let d = 0; d < dustCount; d++) {
        ctx.globalAlpha = strokeOpacity * 0.2;
        ctx.fillStyle = color;
        const dx = (rand() - 0.5) * r * 2.5;
        const dy = (rand() - 0.5) * r * 2.5;
        ctx.fillRect(p.x + dx, p.y + dy, 1, 1);
      }
    }
  });

  if (points.length > 1) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = strokeOpacity * 0.5;
    ctx.strokeStyle = parseColor(strokeStyle, strokeOpacity);
    ctx.lineWidth = lineWidth * 0.25;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }
  ctx.restore();
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

export function renderCalligraphyStroke(ctx, stroke) {
  const {
    points = [],
    strokeStyle = '#000000',
    strokeOpacity = 1,
    lineWidth = 8,
    speedSensitivity = 50,
  } = stroke;
  const color = parseColor(strokeStyle, strokeOpacity);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const w = p1.w ?? calcCalligraphyWidth(
      lineWidth,
      p1.x - p0.x,
      p1.y - p0.y,
      p1.speed ?? 0,
      speedSensitivity
    );
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  if (points.length === 1) {
    const p = points[0];
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (p.w ?? lineWidth) / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
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
