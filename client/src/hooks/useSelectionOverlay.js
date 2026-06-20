import { useEffect } from "react";
import { reaction } from "mobx";
import canvasState from "../store/canvasState";
import selectionState from "../store/selectionState";
import {
  drawSelectionPreview,
  isMobileSelectionComposite,
  selectionNeedsVisual,
  syncSelectionOverlay,
} from "../utils/selectionOverlayDraw";

export function useSelectionOverlay(overlayRef, canvasRef) {
  useEffect(() => {
    let animationId = null;
    let wasAnimating = false;

    const redrawOverlay = () => {
      const overlay = overlayRef.current;
      const canvas = canvasRef.current;
      if (!overlay || !canvas) return;

      syncSelectionOverlay(canvas, overlay);
      const ctx = overlay.getContext("2d");
      drawSelectionPreview(ctx, overlay);
    };

    const redrawSelectionVisual = () => {
      if (isMobileSelectionComposite()) {
        canvasState.redrawCanvas();
        return;
      }
      redrawOverlay();
    };

    const redrawAll = () => {
      canvasState.redrawCanvas();
      if (!isMobileSelectionComposite()) {
        redrawOverlay();
      }
    };

    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const needsAnimation = selectionNeedsVisual();

      if (needsAnimation) {
        selectionState.advanceMarchingAnts();
        redrawSelectionVisual();
        wasAnimating = true;
      } else if (wasAnimating) {
        canvasState.redrawCanvas();
        if (!isMobileSelectionComposite()) {
          const overlay = overlayRef.current;
          if (overlay) {
            const ctx = overlay.getContext("2d");
            ctx.clearRect(0, 0, overlay.width, overlay.height);
          }
        }
        wasAnimating = false;
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
        if (!selectionNeedsVisual()) return;
        redrawAll();
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
