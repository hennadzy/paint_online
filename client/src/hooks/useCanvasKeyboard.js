import { useEffect } from 'react';
import canvasState from '../store/canvasState';
import toolState from '../store/toolState';
import Brush from '../tools/Brush';
import Eraser from '../tools/Eraser';
import Line from '../tools/Line';
import Rect from '../tools/Rect';
import Circle from '../tools/Circle';
import Text from '../tools/Text';

const TOOL_MAP = {
  b: [Brush, 'brush'],
  e: [Eraser, 'eraser'],
  l: [Line, 'line'],
  r: [Rect, 'rect'],
  c: [Circle, 'circle'],
  t: [Text, 'text']
};

export function useCanvasKeyboard() {
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (toolState.textInputActive || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const { canvas, socket, sessionId, username } = canvasState;
      if (!canvas) return;
      const safeUsername = username || 'local';

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        canvasState.undo();
        return;
      }

      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        canvasState.redo();
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        canvasState.zoomIn();
        return;
      }

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        canvasState.zoomOut();
        return;
      }

      const tool = TOOL_MAP[e.key.toLowerCase()];
      if (tool) {
        toolState.setTool(new tool[0](canvas, socket, sessionId, safeUsername), tool[1]);
      } else if (e.key.toLowerCase() === 'g') {
        canvasState.toggleGrid();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
}
