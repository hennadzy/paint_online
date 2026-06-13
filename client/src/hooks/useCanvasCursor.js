import { useEffect } from 'react';
import { reaction } from 'mobx';
import toolState from '../store/toolState';

const CURSOR_NONE_TOOLS = ['brush', 'eraser', 'rect', 'circle', 'line', 'arrow', 'polygon'];
const NAV_TOOLS = ['hand', 'move', 'select', 'lasso', 'transform'];

const TOOL_CURSOR_CLASSES = [
  'brush-cursor',
  'eraser-cursor',
  'rect-cursor',
  'circle-cursor',
  'line-cursor',
  'text-cursor',
  'hand-cursor',
  'move-cursor',
  'select-cursor',
  'lasso-cursor',
  'transform-cursor',
];

function drawCursorOverlay(ctx, canvas, x, y) {
  const diameter = toolState.tool?.lineWidth ?? 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (toolState.toolName === 'text') {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, diameter / 2, 0, 2 * Math.PI);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function applyCanvasCursorClass(canvas, toolName) {
  TOOL_CURSOR_CLASSES.forEach((cls) => canvas.classList.remove(cls));
  if (toolName) {
    canvas.classList.add(`${toolName}-cursor`);
  }

  if (CURSOR_NONE_TOOLS.includes(toolName)) {
    canvas.style.cursor = 'none';
  } else if (NAV_TOOLS.includes(toolName)) {
    canvas.style.cursor = '';
  } else if (toolName === 'text') {
    canvas.style.cursor = '';
  } else {
    canvas.style.cursor = 'crosshair';
  }
}

export function useCanvasCursor(canvasRef, cursorRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    if (!canvas || !cursor) return;

    const handleMove = (e) => {
      if (NAV_TOOLS.includes(toolState.toolName)) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const ctx = cursor.getContext('2d');
      drawCursorOverlay(ctx, cursor, x, y);
    };

    const clearCursor = () => {
      const ctx = cursor.getContext('2d');
      ctx.clearRect(0, 0, cursor.width, cursor.height);
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('pointermove', handleMove);
    canvas.addEventListener('mouseleave', clearCursor);
    canvas.addEventListener('pointerleave', clearCursor);

    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('mouseleave', clearCursor);
      canvas.removeEventListener('pointerleave', clearCursor);
    };
  }, [canvasRef, cursorRef]);

  useEffect(() => {
    const dispose = reaction(
      () => toolState.toolName,
      (toolName) => {
        const canvas = canvasRef.current;
        const cursor = cursorRef.current;
        if (!canvas) return;

        applyCanvasCursorClass(canvas, toolName);

        if (cursor) {
          const ctx = cursor.getContext('2d');
          ctx.clearRect(0, 0, cursor.width, cursor.height);
        }
      },
      { fireImmediately: true }
    );

    return dispose;
  }, [canvasRef, cursorRef]);
}
