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

function isMobileRenderTarget(stroke) {
  return Boolean(stroke?.mobilePreview);
}

function downsamplePoints(points, maxPoints) {
  if (!Array.isArray(points) || points.length <= maxPoints || maxPoints < 2) {
    return points;
  }
  const result = [points[0]];
  const span = points.length - 1;
  const step = span / (maxPoints - 1);
  for (let i = 1; i < maxPoints - 1; i++) {
    result.push(points[Math.round(i * step)]);
  }
  result.push(points[points.length - 1]);
  return result;
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
        dwell: p0.dwell != null && p1.dwell != null ? p0.dwell + (p1.dwell - p0.dwell) * t : p1.dwell,
        pr: p0.pr != null && p1.pr != null ? p0.pr + (p1.pr - p0.pr) * t : (p1.pr ?? p0.pr),
      });
    }
  }
  return result;
}

export function drawMarkerStamp(ctx, x, y, size, angleDeg, color, opacity) {
  const w = size * 1.8;
  const h = size * 0.35;
  const angle = (angleDeg * Math.PI) / 180;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function addRotatedRectToPath(ctx, x, y, width, height, angleDeg) {
  const angle = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const hw = width / 2;
  const hh = height / 2;
  const corners = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ].map((p) => ({
    x: x + p.x * cos - p.y * sin,
    y: y + p.x * sin + p.y * cos,
  }));

  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
}

function drawMarkerPass(ctx, points, lineWidth, angleDeg, color, strokeOpacity) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = strokeOpacity;
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach((p) => {
    if (p.skipStamp) return;
    const size = p.w ?? lineWidth;
    addRotatedRectToPath(ctx, p.x, p.y, size * 1.8, size * 0.35, angleDeg);
  });
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
    livePreview = false,
    mobilePreview = false,
  } = stroke;
  if (!points.length) return;

  const color = parseColor(strokeStyle, 1);
  const mobileMode = mobilePreview || isMobileRenderTarget(stroke);
  const spacing = mobileMode
    ? Math.max(1.2, lineWidth * 0.12)
    : livePreview
      ? Math.max(0.6, lineWidth * 0.08)
      : Math.max(0.35, lineWidth * 0.05);
  const dense = downsamplePoints(densifyPath(points, spacing), mobileMode ? 6000 : 16000);
  drawMarkerPass(ctx, dense, lineWidth, angle, color, strokeOpacity);
}

export function sprayAirbrush(ctx, x, y, radius, color, opacity, seed = 0, livePreview = false, mobilePreview = false) {
  const rand = seededRandom(Math.floor(x * 1000 + y + seed));
  const count = mobilePreview
    ? Math.max(2, Math.floor(radius * 0.18))
    : livePreview
    ? Math.max(5, Math.floor(radius * 0.65))
    : Math.max(12, Math.floor(radius * 2));
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
    livePreview = false,
    mobilePreview = false,
  } = stroke;
  const mobileMode = mobilePreview || isMobileRenderTarget(stroke);
  const spacing = mobileMode
    ? Math.max(10, lineWidth * 0.85)
    : livePreview
      ? Math.max(3, lineWidth * 0.28)
      : Math.max(2, lineWidth * 0.2);
  const dense = downsamplePoints(densifyPath(points, spacing), mobileMode ? 420 : 2600);

  dense.forEach((p, i) => {
    const alpha = p.a ?? strokeOpacity;
    const r = p.r ?? (lineWidth / 2 + scatter * 0.5);
    sprayAirbrush(ctx, p.x, p.y, r, parseColor(strokeStyle, 1), alpha, i, livePreview, mobileMode);
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
  const { points = [], lineWidth = 20, strength = 50, livePreview = false, mobilePreview = false } = stroke;
  const mobileMode = mobilePreview || isMobileRenderTarget(stroke);
  const spacing = mobileMode
    ? Math.max(16, lineWidth * 1.1)
    : livePreview
      ? Math.max(4, lineWidth * 0.35)
      : Math.max(2, lineWidth * 0.25);
  const dense = downsamplePoints(densifyPath(points, spacing), mobileMode ? 240 : 1400);
  for (let i = 1; i < dense.length; i++) {
    const p0 = dense[i - 1];
    const p1 = dense[i];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const baseW = p1.w ?? lineWidth;
    applySmudgeAt(ctx, canvas, p1.x, p1.y, baseW / 2, strength, dx / len, dy / len);
  }
  if (dense.length === 1) {
    const baseW = dense[0].w ?? lineWidth;
    applySmudgeAt(ctx, canvas, dense[0].x, dense[0].y, baseW / 2, strength, 0, 0);
  }
}

function drawWatercolorWash(ctx, x, y, r, colorOrHex, alpha, rand, options = {}) {
  const { texture = true, bleed = 0.5, livePreview = false, mobilePreview = false } = options;
  const strokeStyle = typeof colorOrHex === 'string' && colorOrHex.startsWith('#')
    ? colorOrHex
    : '#000000';
  const bx = x + (rand() - 0.5) * r * bleed * 0.35;
  const by = y + (rand() - 0.5) * r * bleed * 0.35;
  const rr = r * (mobilePreview ? 0.82 : 1 + rand() * 0.2);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const grad = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
  grad.addColorStop(0, parseColor(strokeStyle, alpha * (texture ? 0.38 : 0.32)));
  grad.addColorStop(0.25, parseColor(strokeStyle, alpha * (texture ? 0.22 : 0.18)));
  grad.addColorStop(0.6, parseColor(strokeStyle, alpha * 0.07));
  grad.addColorStop(1, parseColor(strokeStyle, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(bx, by, rr, 0, Math.PI * 2);
  ctx.fill();

  if (texture && !livePreview) {
    const grainCount = Math.floor(rr * 1.4);
    for (let g = 0; g < grainCount; g++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * rr * 0.92;
      const gx = bx + Math.cos(angle) * dist;
      const gy = by + Math.sin(angle) * dist;
      const size = 0.6 + rand() * 2.2;
      ctx.globalAlpha = alpha * (0.1 + rand() * 0.22);
      ctx.fillStyle = parseColor(strokeStyle, 0.75);
      ctx.fillRect(gx - size / 2, gy - size / 2, size, size * (0.6 + rand() * 0.8));
    }

    const fiberCount = Math.floor(rr * 0.35);
    for (let f = 0; f < fiberCount; f++) {
      const angle = rand() * Math.PI * 2;
      const dist = rand() * rr * 0.75;
      ctx.globalAlpha = alpha * 0.06;
      ctx.fillStyle = parseColor(strokeStyle, 0.5);
      ctx.fillRect(
        bx + Math.cos(angle) * dist,
        by + Math.sin(angle) * dist,
        1 + rand() * 2,
        0.5
      );
    }
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
    texture = true,
    livePreview = false,
    mobilePreview = false,
  } = stroke;
  const waterFactor = 1 - saturation / 100;
  const defaultAlpha = strokeOpacity * (0.18 + (1 - waterFactor) * 0.35);
  const mobileMode = mobilePreview || isMobileRenderTarget(stroke);
  const spacing = mobileMode
    ? Math.max(10, lineWidth * 0.85)
    : livePreview
      ? Math.max(2.5, lineWidth * 0.24)
      : Math.max(1.5, lineWidth * 0.18);
  const dense = downsamplePoints(densifyPath(points, spacing), mobileMode ? 360 : 2200);
  const useTexture = livePreview ? false : texture;

  dense.forEach((p, i) => {
    const rand = seededRandom(Math.floor(p.x * 7 + p.y * 13 + i));
    const baseW = p.w ?? lineWidth;
    const r = p.r ?? baseW / 2;
    const alpha = p.a ?? defaultAlpha;
    const dwell = p.dwell ?? 0;
    const mixedColor = strokeStyle;

    drawWatercolorWash(ctx, p.x, p.y, r, mixedColor, alpha, rand, {
      texture: useTexture,
      bleed: 0.45 + dwell * 0.25,
      livePreview,
      mobilePreview: mobileMode,
    });

    if (!livePreview && dwell > 0.2) {
      drawWatercolorWash(ctx, p.x, p.y, r * (1.15 + dwell * 0.5), mixedColor, alpha * 0.28, rand, {
        texture: false,
        bleed: 0.65,
        livePreview,
      });
    }

    if (!livePreview && i > 0 && !texture) {
      const prev = dense[i - 1];
      const mx = (p.x + prev.x) / 2;
      const my = (p.y + prev.y) / 2;
      const mr = ((p.r ?? r) + (prev.r ?? r)) / 2 * 0.9;
      drawWatercolorWash(ctx, mx, my, mr, mixedColor, alpha * 0.22, rand, { texture: false, bleed: 0.2, livePreview });
    }
  });
}

function drawOilBristleSegment(ctx, p0, p1, lw, strokeStyle, strokeOpacity, hardness, seed, livePreview = false, mobilePreview = false) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const rand = seededRandom(seed);
  const roughness = 1 - hardness / 100;
  const edgeJitter = lw * roughness * 0.22;
  const wetColor = strokeStyle;
  const bristleColor = strokeStyle;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = strokeOpacity * 0.35;
  ctx.strokeStyle = parseColor(wetColor, 1);
  ctx.lineWidth = lw * 1.15;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();

  ctx.globalAlpha = strokeOpacity * 0.75;
  ctx.strokeStyle = parseColor(strokeStyle, 1);
  ctx.lineWidth = lw * 0.85;
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.stroke();

  const bristles = mobilePreview
    ? 2 + Math.floor(roughness * 2)
    : livePreview
    ? 3 + Math.floor(roughness * 2)
    : 8 + Math.floor(roughness * 5);
  const spread = lw * (0.35 + roughness * 0.65);
  for (let b = 0; b < bristles; b++) {
    const t = (b + 0.5) / bristles;
    const bx = p0.x + dx * t;
    const by = p0.y + dy * t;
    const off = (b - (bristles - 1) / 2) * (spread / Math.max(1, bristles - 1));
    const jitter = (rand() - 0.5) * edgeJitter;
    ctx.globalAlpha = strokeOpacity * (0.35 + rand() * 0.4);
    ctx.lineWidth = Math.max(0.7, lw * (0.1 + rand() * 0.12));
    ctx.strokeStyle = parseColor(bristleColor, 0.85);
    ctx.beginPath();
    ctx.moveTo(bx + nx * (off + jitter), by + ny * (off + jitter));
    ctx.lineTo(bx + nx * (off + jitter) + dx * 0.55, by + ny * (off + jitter) + dy * 0.55);
    ctx.stroke();
  }

  if (!livePreview && roughness > 0.08) {
    const impastoCount = 3 + Math.floor(roughness * 4);
    ctx.fillStyle = parseColor(strokeStyle, 1);
    for (let i = 0; i < impastoCount; i++) {
      const t = rand();
      const ix = p0.x + dx * t;
      const iy = p0.y + dy * t;
      ctx.globalAlpha = strokeOpacity * (0.35 + rand() * 0.5);
      ctx.beginPath();
      ctx.arc(ix + (rand() - 0.5) * spread * 0.5, iy + (rand() - 0.5) * spread * 0.5, lw * (0.05 + rand() * 0.09), 0, Math.PI * 2);
      ctx.fill();
    }
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
    livePreview = false,
    mobilePreview = false,
  } = stroke;
  const mobileMode = mobilePreview || isMobileRenderTarget(stroke);
  const spacing = mobileMode
    ? Math.max(8, lineWidth * 0.85)
    : livePreview
      ? Math.max(2, lineWidth * 0.24)
      : Math.max(1, lineWidth * 0.18);
  const dense = downsamplePoints(densifyPath(points, spacing), mobileMode ? 450 : 2800);

  for (let i = 1; i < dense.length; i++) {
    const p0 = dense[i - 1];
    const p1 = dense[i];
    const w0 = p0.w ?? lineWidth;
    const w1 = p1.w ?? lineWidth;
    drawOilBristleSegment(
      ctx, p0, p1, (w0 + w1) / 2,
      strokeStyle, strokeOpacity, edgeHardness,
      Math.floor(p1.x * 3 + p1.y * 5 + i),
      livePreview,
      mobileMode
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

function drawPastelGrainAt(ctx, x, y, r, strokeStyle, strokeOpacity, grain, seed, angleDeg = 0, livePreview = false, mobilePreview = false) {
  const rand = seededRandom(seed);
  const dots = mobilePreview
    ? Math.floor(1 + grain * 3)
    : livePreview
    ? Math.floor(4 + grain * 8)
    : Math.floor(10 + grain * 24);
  const angleRad = (angleDeg * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (let d = 0; d < dots; d++) {
    const a = rand() * Math.PI * 2;
    const dist = rand() * r;
    let ox = Math.cos(a) * dist;
    let oy = Math.sin(a) * dist;
    const rx = ox * cosA - oy * sinA;
    const ry = ox * sinA + oy * cosA;
    const dotR = 0.3 + rand() * 2.2;
    ctx.globalAlpha = strokeOpacity * (0.25 + rand() * 0.55);
    ctx.fillStyle = parseColor(strokeStyle, 1);
    ctx.beginPath();
    ctx.arc(x + rx, y + ry, dotR, 0, Math.PI * 2);
    ctx.fill();
  }

  const dustCount = mobilePreview
    ? Math.floor(1 + grain)
    : livePreview ? Math.floor(1 + grain * 2) : Math.floor(2 + grain * 6);
  for (let d = 0; d < dustCount; d++) {
    ctx.globalAlpha = strokeOpacity * 0.18;
    ctx.fillStyle = parseColor(strokeStyle, 1);
    let dx = (rand() - 0.5) * r * 2.8;
    let dy = (rand() - 0.5) * r * 2.8;
    const rdx = dx * cosA - dy * sinA;
    const rdy = dx * sinA + dy * cosA;
    ctx.fillRect(x + rdx, y + rdy, 1 + rand(), 1);
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
    angle = 0,
    livePreview = false,
    mobilePreview = false,
  } = stroke;
  const grain = graininess / 100;
  const mobileMode = mobilePreview || isMobileRenderTarget(stroke);
  const spacing = mobileMode
    ? Math.max(8, lineWidth * 0.8)
    : livePreview
      ? Math.max(2, lineWidth * 0.2)
      : Math.max(1, lineWidth * 0.14);
  const dense = downsamplePoints(densifyPath(points, spacing), mobileMode ? 380 : 2400);

  dense.forEach((p, i) => {
    const baseW = p.w ?? lineWidth;
    drawPastelGrainAt(
      ctx, p.x, p.y, baseW / 2,
      strokeStyle, strokeOpacity, grain,
      Math.floor(p.x * 11 + p.y * 17 + i),
      angle,
      livePreview,
      mobileMode
    );
  });
}

export function calcCalligraphyWidth(baseWidth, dx, dy, speed, speedSensitivity, angleSensitivity, nibAngleDeg = 45) {
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return Math.max(1, baseWidth * 0.08);
  }

  const beta = Math.atan2(dy, dx);
  const alpha = (nibAngleDeg * Math.PI) / 180;
  const minW = baseWidth * 0.08;
  const sinVal = Math.abs(Math.sin(beta - alpha));
  const aSens = angleSensitivity / 100;
  const angleW = minW + (baseWidth - minW) * ((1 - aSens) * 0.35 + aSens * sinVal);

  const speedFactor = Math.min(1, Math.max(0, speed / 14));
  const sSens = speedSensitivity / 100;
  const speedMul = 1 - speedFactor * sSens * 0.78;

  return Math.max(1, angleW * Math.max(0.15, speedMul));
}

function drawCalligraphyRibbon(ctx, p0, p1, w0, w1, color) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p0.x, p0.y, Math.max(w0, w1) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const nx = -dy / len;
  const ny = dx / len;
  const ext = Math.min(2, len * 0.2);
  const ux = dx / len;
  const uy = dy / len;
  const ax = p0.x - ux * ext;
  const ay = p0.y - uy * ext;
  const bx = p1.x + ux * ext;
  const by = p1.y + uy * ext;

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.moveTo(ax + nx * w0 / 2, ay + ny * w0 / 2);
  ctx.lineTo(bx + nx * w1 / 2, by + ny * w1 / 2);
  ctx.lineTo(bx - nx * w1 / 2, by - ny * w1 / 2);
  ctx.lineTo(ax - nx * w0 / 2, ay - ny * w0 / 2);
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
    angleSensitivity = 50,
    livePreview = false,
    mobilePreview = false,
  } = stroke;
  const color = parseColor(strokeStyle, strokeOpacity);

  if (points.length < 2) return;

  const mobileMode = mobilePreview || isMobileRenderTarget(stroke);
  const spacing = mobileMode
    ? Math.max(3.5, lineWidth * 0.35)
    : livePreview
      ? Math.max(1.2, lineWidth * 0.1)
      : Math.max(0.8, lineWidth * 0.07);
  const dense = downsamplePoints(densifyPath(points, spacing), mobileMode ? 650 : 4200);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  let prevW = null;

  for (let i = 1; i < dense.length; i++) {
    const p0 = dense[i - 1];
    const p1 = dense[i];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    let w0 = calcCalligraphyWidth(lineWidth, dx, dy, p0.speed ?? 0, speedSensitivity, angleSensitivity);
    let w1 = calcCalligraphyWidth(lineWidth, dx, dy, p1.speed ?? 0, speedSensitivity, angleSensitivity);

    if (p0.pr != null) w0 *= p0.pr;
    if (p1.pr != null) w1 *= p1.pr;

    if (prevW != null) {
      w0 = prevW * 0.45 + w0 * 0.55;
    }

    w0 = Math.max(0.8, w0);
    w1 = Math.max(0.8, w1);
    prevW = w1;

    drawCalligraphyRibbon(ctx, p0, p1, w0, w1, color);
  }

  ctx.restore();
}

export const BRUSH_STROKE_TYPES = [
  'airbrush',
  'smudge',
  'watercolor',
  'oil',
  'pastel',
  'calligraphy',
];

export function renderSpecialBrushStroke(ctx, stroke, canvas) {
  switch (stroke.type) {
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
