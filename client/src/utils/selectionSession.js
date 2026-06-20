import canvasState from "../store/canvasState";
import selectionState from "../store/selectionState";
import {
  buildSelectionTransformStroke,
  eraseMaskFromBuffer,
  pointInMask,
} from "./selectionUtils";

export const HANDLE_SIZE = 8;
export const ROTATE_HANDLE_OFFSET = 24;

export const HANDLES = [
  { id: "nw", cursor: "nw-resize" },
  { id: "ne", cursor: "ne-resize" },
  { id: "sw", cursor: "sw-resize" },
  { id: "se", cursor: "se-resize" },
  { id: "n", cursor: "n-resize" },
  { id: "s", cursor: "s-resize" },
  { id: "e", cursor: "e-resize" },
  { id: "w", cursor: "w-resize" },
  { id: "rotate", cursor: "grab" },
];

export function getTransformedBounds(state = selectionState) {
  const { previewX, previewY, width, height, transform } = state;
  const cx = previewX + width / 2;
  const cy = previewY + height / 2;
  const hw = (width * Math.abs(transform.scaleX)) / 2;
  const hh = (height * Math.abs(transform.scaleY)) / 2;
  const rad = (transform.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const corners = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([dx, dy]) => ({
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  }));

  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    cx,
    cy,
  };
}

function getHandlePositions() {
  const { previewX, previewY, width, height } = selectionState;
  const cx = previewX + width / 2;
  const cy = previewY + height / 2;
  const hw = (width * Math.abs(selectionState.transform.scaleX)) / 2;
  const hh = (height * Math.abs(selectionState.transform.scaleY)) / 2;
  const rad = (selectionState.transform.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const corner = (sx, sy) => ({
    x: cx + sx * cos - sy * sin,
    y: cy + sx * sin + sy * cos,
  });

  const topMid = corner(0, -hh);
  const rotate = {
    x: topMid.x + (-sin) * ROTATE_HANDLE_OFFSET,
    y: topMid.y + cos * ROTATE_HANDLE_OFFSET,
  };

  return {
    nw: corner(-hw, -hh),
    ne: corner(hw, -hh),
    sw: corner(-hw, hh),
    se: corner(hw, hh),
    n: topMid,
    s: corner(0, hh),
    e: corner(hw, 0),
    w: corner(-hw, 0),
    rotate,
  };
}

export function isPointInSelection(px, py, canvasWidth) {
  if (!selectionState.hasSelection) return false;

  const { x, y, previewX, previewY, width, height, transform, mask } = selectionState;
  const cx = previewX + width / 2;
  const cy = previewY + height / 2;
  const rad = (-transform.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const scaleX = transform.scaleX || 1;
  const scaleY = transform.scaleY || 1;

  const dx = px - cx;
  const dy = py - cy;
  const localX = (dx * cos - dy * sin) / scaleX;
  const localY = (dx * sin + dy * cos) / scaleY;

  const origCx = x + width / 2;
  const origCy = y + height / 2;
  const maskX = origCx + localX;
  const maskY = origCy + localY;

  if (mask && canvasWidth) {
    return pointInMask(maskX, maskY, mask, canvasWidth);
  }

  return (
    maskX >= x &&
    maskX < x + width &&
    maskY >= y &&
    maskY < y + height
  );
}

export function hitTestTransformTarget(px, py, canvasWidth = 0) {
  if (!selectionState.transformSessionActive || !selectionState.hasSelection) return null;

  const positions = getHandlePositions();
  for (const handle of HANDLES) {
    const pos = positions[handle.id];
    const half = HANDLE_SIZE / 2;
    if (
      px >= pos.x - half &&
      px <= pos.x + half &&
      py >= pos.y - half &&
      py <= pos.y + half
    ) {
      return handle;
    }
  }

  if (isPointInSelection(px, py, canvasWidth)) {
    return { id: "move", cursor: "move" };
  }

  return null;
}

export function enterTransformSession(canvas) {
  selectionState.enterTransformSession();
  if (canvas && !selectionState.floatingOnly && !selectionState.hasCut) {
    cutSelectionFromBuffer(canvas);
  }
}

export function cutSelectionFromBuffer(canvas) {
  if (selectionState.hasCut || selectionState.floatingOnly) return;
  const { mask } = selectionState;
  const bufferCtx = canvasState.bufferCtx;
  if (!mask || !bufferCtx) return;
  eraseMaskFromBuffer(bufferCtx, mask, canvas.width, canvas.height);
  selectionState.setHasCut(true);
  canvasState.redrawCanvas();
}

export function commitSelectionSession(canvas) {
  if (!selectionState.hasSelection) {
    selectionState.exitTransformSession();
    return;
  }

  const {
    type: selectionType,
    x: originX,
    y: originY,
    width: selectionWidth,
    height: selectionHeight,
    mask,
    previewX,
    previewY,
    transform,
    imageData,
    floatingOnly,
  } = selectionState;

  if (!imageData || !canvasState.bufferCtx) {
    selectionState.clear();
    return;
  }

  if (!floatingOnly && !mask) {
    selectionState.clear();
    return;
  }

  const payload = {
    canvasWidth: canvas.width,
    selectionType,
    originX,
    originY,
    selectionWidth,
    selectionHeight,
    previewX,
    previewY,
    transform: { ...transform },
    imageData,
    mask: floatingOnly ? null : mask,
  };

  selectionState.clear();

  void (async () => {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const stroke = buildSelectionTransformStroke(payload);
    await canvasState.pushStroke(stroke);
  })();
}

export function createTransformSessionHandlers(tool) {
  let activeHandle = null;
  let startX = 0;
  let startY = 0;
  let initialTransform = null;
  let initialBounds = null;

  const getLocalBounds = () => ({
    x: selectionState.previewX,
    y: selectionState.previewY,
    width: selectionState.width,
    height: selectionState.height,
  });

  return {
    pointerDown(e) {
      if (tool.isPinchingActive()) return;
      if (!selectionState.transformSessionActive) return false;
      if (e.pointerType === "mouse" && e.button !== 0) return false;

      const { x, y } = tool.getCanvasCoordinates(e);
      const handle = hitTestTransformTarget(x, y, tool.canvas.width);

      if (!handle) {
        commitSelectionSession(tool.canvas);
        return true;
      }

      e.preventDefault();
      tool.mouseDown = true;
      activeHandle = handle;
      startX = x;
      startY = y;
      initialTransform = { ...selectionState.transform };
      initialBounds = getLocalBounds();
      selectionState.setDragging(handle.id === "move");
      tool.canvas.setPointerCapture?.(e.pointerId);
      return true;
    },

    pointerMove(e) {
      if (!tool.mouseDown || !activeHandle) return;

      const { x, y } = tool.getCanvasCoordinates(e);
      const dx = x - startX;
      const dy = y - startY;
      const bounds = initialBounds;
      const transform = { ...initialTransform };

      if (activeHandle.id === "move") {
        selectionState.setPreviewPosition(bounds.x + dx, bounds.y + dy);
        return;
      }

      if (activeHandle.id === "rotate") {
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        const startAngle = Math.atan2(startY - cy, startX - cx);
        const currentAngle = Math.atan2(y - cy, x - cx);
        transform.angle =
          initialTransform.angle + (currentAngle - startAngle) * (180 / Math.PI);
      } else if (e.altKey) {
        const skewFactor = 0.005;
        if (activeHandle.id === "n" || activeHandle.id === "s") {
          transform.skewX = initialTransform.skewX + dx * skewFactor;
        } else if (activeHandle.id === "e" || activeHandle.id === "w") {
          transform.skewY = initialTransform.skewY + dy * skewFactor;
        } else {
          transform.scaleX = Math.max(0.1, initialTransform.scaleX + dx / bounds.width);
          transform.scaleY = Math.max(0.1, initialTransform.scaleY + dy / bounds.height);
        }
      } else {
        const scaleFromHandle = (handleId) => {
          if (handleId === "e" || handleId === "ne" || handleId === "se") {
            transform.scaleX = Math.max(0.1, initialTransform.scaleX + dx / bounds.width);
          }
          if (handleId === "w" || handleId === "nw" || handleId === "sw") {
            transform.scaleX = Math.max(0.1, initialTransform.scaleX - dx / bounds.width);
          }
          if (handleId === "s" || handleId === "se" || handleId === "sw") {
            transform.scaleY = Math.max(0.1, initialTransform.scaleY + dy / bounds.height);
          }
          if (handleId === "n" || handleId === "ne" || handleId === "nw") {
            transform.scaleY = Math.max(0.1, initialTransform.scaleY - dy / bounds.height);
          }
        };
        scaleFromHandle(activeHandle.id);
      }

      selectionState.setTransform(transform);
    },

    pointerUp() {
      if (!tool.mouseDown) return;
      tool.mouseDown = false;
      selectionState.setDragging(false);
      activeHandle = null;
    },

    destroy() {
      activeHandle = null;
      tool.mouseDown = false;
      selectionState.setDragging(false);
    },
  };
}

export function getTransformCursor(px, py, canvasWidth) {
  if (!selectionState.transformSessionActive || !selectionState.hasSelection) return null;
  const hit = hitTestTransformTarget(px, py, canvasWidth);
  if (hit) return hit.cursor;
  return "default";
}

export function drawTransformHandles(ctx) {
  const positions = getHandlePositions();

  ctx.save();
  ctx.strokeStyle = "#4a90d9";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  const { nw, ne, se, sw, n, rotate } = positions;
  ctx.beginPath();
  ctx.moveTo(nw.x, nw.y);
  ctx.lineTo(ne.x, ne.y);
  ctx.lineTo(se.x, se.y);
  ctx.lineTo(sw.x, sw.y);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(n.x, n.y);
  ctx.lineTo(rotate.x, rotate.y);
  ctx.stroke();

  Object.values(positions).forEach((handle) => {
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#4a90d9";
    ctx.fillRect(
      handle.x - HANDLE_SIZE / 2,
      handle.y - HANDLE_SIZE / 2,
      HANDLE_SIZE,
      HANDLE_SIZE
    );
    ctx.strokeRect(
      handle.x - HANDLE_SIZE / 2 + 0.5,
      handle.y - HANDLE_SIZE / 2 + 0.5,
      HANDLE_SIZE,
      HANDLE_SIZE
    );
  });
  ctx.restore();
}
