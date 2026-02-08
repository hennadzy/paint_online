import { useEffect, useRef } from 'react';
import canvasState from '../store/canvasState';

const LOGICAL_WIDTH = 720;
const LOGICAL_HEIGHT = 480;

export function useCanvasResize(canvasRef, cursorRef, containerRef) {
  const initialMobileZoomDone = useRef(false);

  useEffect(() => {
    const adjustCanvasSize = () => {
      const canvas = canvasRef.current;
      const cursor = cursorRef.current;
      if (!canvas || !cursor) return;

      canvas.width = LOGICAL_WIDTH;
      canvas.height = LOGICAL_HEIGHT;
      cursor.width = LOGICAL_WIDTH;
      cursor.height = LOGICAL_HEIGHT;

      canvasState.setCanvas(canvas);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      canvasState.rebuildBuffer();
      canvasState.redrawCanvas();
      canvasState.setZoom(canvasState.zoom);
    };

    adjustCanvasSize();
    window.addEventListener('resize', adjustCanvasSize);
    return () => window.removeEventListener('resize', adjustCanvasSize);
  }, []);

  useEffect(() => {
    if (window.innerWidth > 768) return;
    if (initialMobileZoomDone.current) return;
    const timer = setTimeout(() => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;
      initialMobileZoomDone.current = true;
      const availableW = container.clientWidth - 20;
      const fitZoom = Math.min(1, Math.max(0.5, availableW / window.innerWidth));
      canvasState.setZoom(fitZoom);
    }, 150);
    return () => clearTimeout(timer);
  }, []);
}
