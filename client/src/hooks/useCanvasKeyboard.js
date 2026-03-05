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
  // Английские
  b: [Brush, 'brush'],
  e: [Eraser, 'eraser'],
  l: [Line, 'line'],
  r: [Rect, 'rect'],
  c: [Circle, 'circle'],
  t: [Text, 'text'],
  // Русские (физически те же клавиши, но code может быть другим)
  и: [Brush, 'brush'], // b
  у: [Eraser, 'eraser'], // e
  д: [Line, 'line'], // l
  к: [Rect, 'rect'], // r
  с: [Circle, 'circle'], // c
  е: [Text, 'text'] // t
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

      // Отмена (Ctrl+Z / Ctrl+Я)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'я') && !e.shiftKey) {
        e.preventDefault();
        canvasState.undo();
        return;
      }

      // Повтор (Ctrl+Y / Ctrl+Н / Ctrl+Shift+Z / Ctrl+Shift+Я)
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'я')) ||
          ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'н'))) {
        e.preventDefault();
        canvasState.redo();
        return;
      }

      // Масштабирование
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

      // Инструменты
      const key = e.key.toLowerCase();
      const tool = TOOL_MAP[key];
      if (tool) {
        toolState.setTool(new tool[0](canvas, socket, sessionId, safeUsername), tool[1]);
      } else if (key === 'g' || key === 'п') { // G/П для сетки
        canvasState.toggleGrid();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
}
