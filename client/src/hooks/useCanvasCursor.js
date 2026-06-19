import { useEffect } from 'react';
import { reaction } from 'mobx';
import toolState from '../store/toolState';
import selectionState from '../store/selectionState';
import { getTransformCursor } from '../utils/selectionSession';
import {
  HAND_GRAB_STYLE,
  LASSO_CURSOR_STYLE,
  MOVE_CURSOR_STYLE,
  SELECT_CURSOR_STYLE,
} from '../utils/toolCursors';

const CURSOR_NONE_TOOLS = [
  'brush', 'eraser', 'rect', 'circle', 'ellipse', 'line', 'arrow', 'polygon',
  'marker', 'airbrush', 'smudge', 'watercolor', 'oil', 'pastel', 'calligraphy',
];
const SELECTION_TOOLS = ['select', 'lasso'];
const STAMP_TOOLS = ['stamp'];

const TOOL_CURSOR_CLASSES = [
  'brush-cursor', 'eraser-cursor', 'rect-cursor', 'circle-cursor', 'ellipse-cursor',
  'line-cursor', 'text-cursor', 'hand-cursor', 'select-cursor', 'lasso-cursor',
  'marker-cursor', 'airbrush-cursor', 'smudge-cursor', 'watercolor-cursor',
  'oil-cursor', 'pastel-cursor', 'calligraphy-cursor', 'stamp-cursor',
];

function drawDefaultCircleCursor(ctx, canvas, x, y, diameter) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.beginPath();
  ctx.arc(x, y, diameter / 2, 0, 2 * Math.PI);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawMarkerCursor(ctx, canvas, x, y, size, angleDeg) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const w = size * 1.6;
  const h = size * 0.45;
  const angle = ((angleDeg ?? 0) * Math.PI) / 180;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function drawAirbrushCursor(ctx, canvas, x, y, size, scatter) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const r = size / 2 + (scatter ?? 15) * 0.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.strokeStyle = 'rgba(80,80,80,0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const d = r * 0.6;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(100,100,100,0.4)';
    ctx.fill();
  }
}

function drawSmudgeCursor(ctx, canvas, x, y, size) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y);
  ctx.quadraticCurveTo(x, y - r * 0.3, x + r * 0.5, y);
  ctx.strokeStyle = '#999';
  ctx.stroke();
}

function drawWatercolorCursor(ctx, canvas, x, y, size) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const r = size / 2;
  const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, 'rgba(100,150,255,0.3)');
  grad.addColorStop(1, 'rgba(100,150,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,120,200,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawOilCursor(ctx, canvas, x, y, size) {
  drawDefaultCircleCursor(ctx, canvas, x, y, size);
  ctx.beginPath();
  ctx.arc(x - size * 0.15, y - size * 0.15, size * 0.15, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
}

function drawPastelCursor(ctx, canvas, x, y, size) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.strokeStyle = '#888';
  ctx.setLineDash([2, 2]);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2;
    ctx.fillRect(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, 1, 1);
  }
}

function drawCalligraphyCursor(ctx, canvas, x, y, size) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 4);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.6, size * 0.2, 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawCursorOverlay(ctx, canvas, x, y) {
  const toolName = toolState.toolName;
  const diameter = toolState.tool?.lineWidth ?? 1;
  const params = toolState.getToolParams(toolName);

  if (toolName === 'text') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    return;
  }

  switch (toolName) {
    case 'airbrush':
      drawAirbrushCursor(ctx, canvas, x, y, diameter, params.scatter);
      break;
    case 'smudge':
      drawSmudgeCursor(ctx, canvas, x, y, diameter);
      break;
    case 'watercolor':
      drawWatercolorCursor(ctx, canvas, x, y, diameter);
      break;
    case 'oil':
      drawOilCursor(ctx, canvas, x, y, diameter);
      break;
    case 'pastel':
      drawPastelCursor(ctx, canvas, x, y, diameter);
      break;
    case 'calligraphy':
      drawCalligraphyCursor(ctx, canvas, x, y, diameter);
      break;
    default:
      drawDefaultCircleCursor(ctx, canvas, x, y, diameter);
  }
}

function getSelectionToolCursor(toolName) {
  if (toolName === 'select') return SELECT_CURSOR_STYLE;
  if (toolName === 'lasso') return LASSO_CURSOR_STYLE;
  return 'crosshair';
}

function applyCanvasCursorClass(canvas, toolName) {
  TOOL_CURSOR_CLASSES.forEach((cls) => canvas.classList.remove(cls));
  if (toolName) {
    canvas.classList.add(`${toolName}-cursor`);
  }

  if (CURSOR_NONE_TOOLS.includes(toolName)) {
    canvas.style.cursor = 'none';
  } else if (STAMP_TOOLS.includes(toolName)) {
    canvas.style.cursor = 'crosshair';
  } else if (toolName === 'hand') {
    canvas.style.cursor = HAND_GRAB_STYLE;
  } else if (toolName === 'text') {
    canvas.style.cursor = '';
  } else if (SELECTION_TOOLS.includes(toolName)) {
    canvas.style.cursor = selectionState.transformSessionActive
      ? 'default'
      : getSelectionToolCursor(toolName);
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
        if (transformCursor === 'move') {
          canvas.style.cursor = MOVE_CURSOR_STYLE;
        } else if (transformCursor && transformCursor !== 'default') {
          canvas.style.cursor = transformCursor;
        } else {
          canvas.style.cursor = 'default';
        }
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
      () => [selectionState.transformSessionActive, selectionState.previewX, selectionState.previewY],
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
