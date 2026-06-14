import { useEffect } from "react";
import { reaction } from "mobx";
import selectionState from "../store/selectionState";
import {
  drawMarchingAnts,
  imageDataToCanvas,
} from "../utils/selectionUtils";
import {
  drawTransformHandles,
  getTransformedBounds,
} from "../utils/selectionSession";

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

  if (!selectionState.hasSelection) {
    return;
  }

  const { previewX, previewY, width, height, imageData, transform, path, type } = selectionState;

  if (imageData && (selectionState.hasCut || selectionState.floatingOnly)) {
    const srcCanvas = imageDataToCanvas(imageData);
    const drawW = imageData.width;
    const drawH = imageData.height;
    ctx.save();
    ctx.translate(previewX + width / 2, previewY + height / 2);
    ctx.rotate((transform.angle * Math.PI) / 180);
    ctx.scale(transform.scaleX, transform.scaleY);
    ctx.drawImage(srcCanvas, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  if (selectionState.transformSessionActive) {
    const bounds = getTransformedBounds();
    const displayPath =
      type === "lasso" && path.length > 2
        ? path.map((p) => ({
            x: p.x - selectionState.x + previewX,
            y: p.y - selectionState.y + previewY,
          }))
        : null;

    drawMarchingAnts(ctx, bounds, selectionState.marchingAntsOffset, displayPath);
    drawTransformHandles(ctx);
  } else {
    const rect = { x: previewX, y: previewY, width, height };
    drawMarchingAnts(ctx, rect, selectionState.marchingAntsOffset);
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
        selectionState.transformSessionActive,
        selectionState.hasCut,
        selectionState.floatingOnly,
        selectionState.transform,
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
