import { useEffect } from "react";
import { reaction } from "mobx";
import selectionState from "../store/selectionState";
import toolState from "../store/toolState";
import {
  drawMarchingAnts,
  imageDataToCanvas,
} from "../utils/selectionUtils";
import { HANDLE_SIZE, ROTATE_HANDLE_OFFSET } from "../tools/Transform";

function drawTransformHandles(ctx, bounds) {
  const { x, y, width, height } = bounds;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const handles = [
    { x, y },
    { x: x + width, y },
    { x, y: y + height },
    { x: x + width, y: y + height },
    { x: cx, y },
    { x: cx, y: y + height },
    { x: x + width, y: cy },
    { x, y: cy },
    { x: cx, y: y - ROTATE_HANDLE_OFFSET },
  ];

  ctx.save();
  ctx.strokeStyle = "#4a90d9";
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.strokeRect(x + 0.5, y + 0.5, width, height);

  ctx.strokeStyle = "#4a90d9";
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, y - ROTATE_HANDLE_OFFSET);
  ctx.stroke();

  handles.forEach((handle) => {
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

function drawSelectionPreview(ctx, canvas) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (selectionState.draftRect) {
    drawMarchingAnts(ctx, selectionState.draftRect, selectionState.marchingAntsOffset);
    return;
  }

  if (selectionState.draftPath?.length > 1) {
    ctx.save();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -selectionState.marchingAntsOffset;
    ctx.beginPath();
    ctx.moveTo(selectionState.draftPath[0].x, selectionState.draftPath[0].y);
    for (let i = 1; i < selectionState.draftPath.length; i++) {
      ctx.lineTo(selectionState.draftPath[i].x, selectionState.draftPath[i].y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (!selectionState.hasSelection && !selectionState.draftRect && !selectionState.draftPath) {
    return;
  }

  if (selectionState.hasSelection) {
    const { previewX, previewY, width, height, imageData, transform, path, type } = selectionState;

    if (imageData && (selectionState.isDragging || selectionState.isTransforming)) {
      const srcCanvas = imageDataToCanvas(imageData);
      ctx.save();
      ctx.translate(previewX + width / 2, previewY + height / 2);
      ctx.rotate((transform.angle * Math.PI) / 180);
      ctx.scale(transform.scaleX, transform.scaleY);
      ctx.drawImage(srcCanvas, -width / 2, -height / 2);
      ctx.restore();
    }

    const rect = { x: previewX, y: previewY, width, height };
    const displayPath =
      type === "lasso" && path.length > 2
        ? path.map((p) => ({
            x: p.x - selectionState.x + previewX,
            y: p.y - selectionState.y + previewY,
          }))
        : null;

    drawMarchingAnts(ctx, rect, selectionState.marchingAntsOffset, displayPath);

    if (toolState.toolName === "transform" && selectionState.isTransforming) {
      drawTransformHandles(ctx, rect);
    }
  }
}

export function useSelectionOverlay(overlayRef, canvasRef) {
  useEffect(() => {
    let animationId = null;

    const tick = () => {
      const overlay = overlayRef.current;
      const canvas = canvasRef.current;
      if (!overlay || !canvas) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const needsAnimation =
        selectionState.hasSelection ||
        selectionState.draftRect ||
        (selectionState.draftPath && selectionState.draftPath.length > 0);

      if (needsAnimation) {
        selectionState.advanceMarchingAnts();
        const ctx = overlay.getContext("2d");
        drawSelectionPreview(ctx, overlay);
      } else {
        const ctx = overlay.getContext("2d");
        ctx.clearRect(0, 0, overlay.width, overlay.height);
      }

      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);

    const dispose = reaction(
      () => [
        selectionState.hasSelection,
        selectionState.previewX,
        selectionState.previewY,
        selectionState.draftRect,
        selectionState.draftPath?.length,
        selectionState.isDragging,
        selectionState.isTransforming,
        selectionState.transform,
        toolState.toolName,
      ],
      () => {
        const overlay = overlayRef.current;
        const canvas = canvasRef.current;
        if (!overlay || !canvas) return;
        const ctx = overlay.getContext("2d");
        drawSelectionPreview(ctx, overlay);
      }
    );

    return () => {
      cancelAnimationFrame(animationId);
      dispose();
      const overlay = overlayRef.current;
      if (overlay) {
        const ctx = overlay.getContext("2d");
        ctx.clearRect(0, 0, overlay.width, overlay.height);
      }
    };
  }, [overlayRef, canvasRef]);
}
