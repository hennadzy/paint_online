import { useEffect } from 'react';
import { reaction } from 'mobx';
import toolState from '../store/toolState';
import selectionState from '../store/selectionState';
import { getTransformCursor } from '../utils/selectionSession';

const CURSOR_NONE_TOOLS = ['brush', 'eraser', 'rect', 'circle', 'line', 'arrow', 'polygon'];
const SELECTION_TOOLS = ['select', 'lasso'];

const TOOL_CURSOR_CLASSES = [
  'brush-cursor',
  'eraser-cursor',
  'rect-cursor',
  'circle-cursor',
  'line-cursor',
  'text-cursor',
  'hand-cursor',
  'select-cursor',
  'lasso-cursor',
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
  } else if (toolName === 'hand' || toolName === 'text') {
    canvas.style.cursor = '';
  } else if (SELECTION_TOOLS.includes(toolName)) {
    canvas.style.cursor = selectionState.transformSessionActive ? '' : 'crosshair';
  } else {
    canvas.style.cursor = 'crosshair';
  }
}

export function useCanvasCursor(canvasRef, cursorRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const cursor = cursorRef.current;
    if (!canvas || !cursor) return;

    const getCoords = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const handleMove = (e) => {
      if (toolState.toolName === 'hand') return;

      if (
        SELECTION_TOOLS.includes(toolState.toolName) &&
        selectionState.transformSessionActive
      ) {
        const { x, y } = getCoords(e);
        const transformCursor = getTransformCursor(x, y, canvas.width);
        canvas.style.cursor = transformCursor || 'default';
        return;
      }

      if (CURSOR_NONE_TOOLS.includes(toolState.toolName) || toolState.toolName === 'text') {
        const { x, y } = getCoords(e);
        const ctx = cursor.getContext('2d');
        drawCursorOverlay(ctx, cursor, x, y);
        return;
      }

      const ctx = cursor.getContext('2d');
      ctx.clearRect(0, 0, cursor.width, cursor.height);
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
    const disposeTool = reaction(
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

    const disposeSelection = reaction(
      () => selectionState.transformSessionActive,
      () => {
        const canvas = canvasRef.current;
        if (!canvas || !SELECTION_TOOLS.includes(toolState.toolName)) return;
        applyCanvasCursorClass(canvas, toolState.toolName);
      }
    );

    return () => {
      disposeTool();
      disposeSelection();
    };
  }, [canvasRef, cursorRef]);
}
