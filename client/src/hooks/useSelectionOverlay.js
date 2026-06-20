import { useEffect } from "react";
import { reaction } from "mobx";
import canvasState from "../store/canvasState";
import selectionState from "../store/selectionState";
import {
  drawSelectionPreview,
  isMobileSelectionComposite,
  selectionNeedsVisual,
} from "../utils/selectionOverlayDraw";

export function useSelectionOverlay(overlayRef, canvasRef) {
  useEffect(() => {
    let animationId = null;
    let wasAnimating = false;

    const redrawSelection = () => {
      if (isMobileSelectionComposite()) {
        canvasState.redrawCanvas();
        return;
      }

      const overlay = overlayRef.current;
      const canvas = canvasRef.current;
      if (!overlay || !canvas) return;
      const ctx = overlay.getContext("2d");
      drawSelectionPreview(ctx, overlay);
    };

    const tick = () => {
      const overlay = overlayRef.current;
      const canvas = canvasRef.current;
      if (!canvas || (!isMobileSelectionComposite() && !overlay)) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const needsAnimation = selectionNeedsVisual();

      if (needsAnimation) {
        selectionState.advanceMarchingAnts();
        redrawSelection();
        wasAnimating = true;
      } else if (wasAnimating) {
        if (isMobileSelectionComposite()) {
          canvasState.redrawCanvas();
        } else if (overlay) {
          const ctx = overlay.getContext("2d");
          ctx.clearRect(0, 0, overlay.width, overlay.height);
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
        redrawSelection();
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
