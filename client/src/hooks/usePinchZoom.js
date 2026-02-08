import { useEffect, useRef } from 'react';
import canvasState from '../store/canvasState';
import toolState from '../store/toolState';

function getDistance(touch1, touch2) {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getPinchCenter(touch1, touch2) {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2
  };
}

export function usePinchZoom(containerRef) {
  const isPinching = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window.isPinching = () => isPinching.current;

    let initialDistance = 0;
    let initialZoom = 1;
    let initialScrollLeft = 0;
    let initialScrollTop = 0;
    let initialCenterX = 0;
    let initialCenterY = 0;

    const cancelDrawing = () => {
      if (toolState.tool && toolState.tool.mouseDown) {
        const tool = toolState.tool;
        tool.mouseDown = false;
        canvasState.isDrawing = false;
        if (tool.points) tool.points.length = 0;
        if (tool.startX !== undefined) tool.startX = undefined;
        if (tool.startY !== undefined) tool.startY = undefined;
        canvasState.redrawCanvas();
      }
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        cancelDrawing();
        isPinching.current = true;
        initialDistance = getDistance(e.touches[0], e.touches[1]);
        initialZoom = canvasState.zoom;
        const center = getPinchCenter(e.touches[0], e.touches[1]);
        initialCenterX = center.x;
        initialCenterY = center.y;
        initialScrollLeft = container.scrollLeft;
        initialScrollTop = container.scrollTop;
      } else if (e.touches.length > 2) {
        e.preventDefault();
        cancelDrawing();
        isPinching.current = true;
      }
    };

    const handleTouchMove = (e) => {
      const touchCount = e.touches.length;

      if (touchCount >= 2) {
        e.preventDefault();
        cancelDrawing();
        isPinching.current = true;

        if (touchCount === 2 && initialDistance > 0) {
          const currentDistance = getDistance(e.touches[0], e.touches[1]);
          const currentCenter = getPinchCenter(e.touches[0], e.touches[1]);
          const containerRect = container.getBoundingClientRect();
          const translationX = currentCenter.x - initialCenterX;
          const translationY = currentCenter.y - initialCenterY;
          const pannedScrollLeft = initialScrollLeft - translationX;
          const pannedScrollTop = initialScrollTop - translationY;

          const scale = currentDistance / initialDistance;
          const newZoom = Math.max(0.5, Math.min(5, initialZoom * scale));
          const viewportX = currentCenter.x - containerRect.left;
          const viewportY = currentCenter.y - containerRect.top;
          const canvasPointX = (pannedScrollLeft + viewportX) / canvasState.zoom;
          const canvasPointY = (pannedScrollTop + viewportY) / canvasState.zoom;

          canvasState.setZoom(newZoom);

          requestAnimationFrame(() => {
            container.scrollLeft = canvasPointX * newZoom - viewportX;
            container.scrollTop = canvasPointY * newZoom - viewportY;
          });
        } else if (touchCount === 2 && initialDistance === 0) {
          initialDistance = getDistance(e.touches[0], e.touches[1]);
          initialZoom = canvasState.zoom;
          const center = getPinchCenter(e.touches[0], e.touches[1]);
          initialCenterX = center.x;
          initialCenterY = center.y;
          initialScrollLeft = container.scrollLeft;
          initialScrollTop = container.scrollTop;
        }
      } else if (touchCount === 1 && isPinching.current) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        initialDistance = 0;
        setTimeout(() => {
          if (e.touches.length < 2) {
            isPinching.current = false;
          }
        }, 150);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);
}
