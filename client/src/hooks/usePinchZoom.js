import { useEffect, useRef } from 'react';
import canvasState from '../store/canvasState';
import toolState from '../store/toolState';
import {
  attachPinchPanGestures,
  getTouchCenter,
  getTouchDistance,
  isMobileCanvasView,
} from '../utils/pinchPanGestures';

function getPinchCenter(touch1, touch2) {
  return getTouchCenter(touch1, touch2);
}

export function usePinchZoom(containerRef, wrapperRef) {
  const isPinching = useRef(false);
  const panRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    panRef.current = { x: canvasState.viewPanX, y: canvasState.viewPanY };
  }, [canvasState.viewPanX, canvasState.viewPanY]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    window.isPinching = () => isPinching.current;

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

    if (isMobileCanvasView()) {
      const canvas = container.querySelector('.main-canvas');

      const detach = attachPinchPanGestures({
        getTargets: () => [container, wrapperRef.current, canvas].filter(Boolean),
        getZoom: () => canvasState.zoom,
        setZoom: (value) => canvasState.setZoom(value),
        getPan: () => panRef.current,
        setPan: (pan) => {
          panRef.current = pan;
          canvasState.setViewPan(pan.x, pan.y);
        },
        clampZoom: (value) => Math.max(0.5, Math.min(3, value)),
        onPinchStart: () => {
          cancelDrawing();
          isPinching.current = true;
        },
        onPinchEnd: () => {
          isPinching.current = false;
        },
      });

      return detach;
    }

    let initialDistance = 0;
    let initialZoom = 1;
    let initialScrollLeft = 0;
    let initialScrollTop = 0;
    let initialCenterX = 0;
    let initialCenterY = 0;

    const handleScroll = () => {
      if (container.scrollTop < 0) {
        container.scrollTop = 0;
      }
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        cancelDrawing();
        isPinching.current = true;
        initialDistance = getTouchDistance(e.touches[0], e.touches[1]);
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
          const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
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
            const rawScrollLeft = canvasPointX * newZoom - viewportX;
            const rawScrollTop = canvasPointY * newZoom - viewportY;

            const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
            const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);

            container.scrollLeft = Math.max(0, Math.min(maxScrollLeft, rawScrollLeft));
            container.scrollTop = Math.max(0, Math.min(maxScrollTop, rawScrollTop));
          });
        } else if (touchCount === 2 && initialDistance === 0) {
          initialDistance = getTouchDistance(e.touches[0], e.touches[1]);
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
    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, wrapperRef]);
}
