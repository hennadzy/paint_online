import { useEffect } from 'react';
import canvasState from '../store/canvasState';
import { isMobileCanvasView } from '../utils/pinchPanGestures';

export const useMobileCanvasFit = (containerRef, isConnected) => {
  useEffect(() => {
    const isMobilePortrait = window.innerWidth <= 768 && window.innerHeight > window.innerWidth;
    if (!isMobilePortrait) return;

    const apply = () => {
      const container = containerRef.current;
      if (!container) return;

      const availableW = container.clientWidth - 20;
      const fitZoom = Math.min(1, Math.max(0.5, availableW / window.innerWidth));
      canvasState.resetViewPan();
      canvasState.setZoom(fitZoom);

      if (!isMobileCanvasView()) {
        const scrollX = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
        const scrollY = Math.max(0, (container.scrollHeight - container.clientHeight) / 2);
        container.scrollLeft = scrollX;
        container.scrollTop = scrollY;
      } else {
        container.scrollLeft = 0;
        container.scrollTop = 0;
      }
    };

    if (!isConnected) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        apply();
        setTimeout(apply, 150);
        setTimeout(apply, 300);
      }));
    } else {
      apply();
    }
  }, [isConnected, containerRef]);
};
