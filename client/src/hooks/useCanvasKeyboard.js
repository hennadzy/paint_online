import { useEffect } from 'react';
import canvasState from '../store/canvasState';
import toolState from '../store/toolState';
import selectionState from '../store/selectionState';
import capabilitiesState from '../store/capabilitiesState';
import {
  copySelection,
  cutSelection,
  hasClipboardContent,
  pasteSelection,
} from '../utils/selectionClipboard';
import Brush from '../tools/Brush';
import Marker from '../tools/brush/Marker';
import Airbrush from '../tools/brush/Airbrush';
import Smudge from '../tools/brush/Smudge';
import Watercolor from '../tools/brush/Watercolor';
import Oil from '../tools/brush/Oil';
import Pastel from '../tools/brush/Pastel';
import Calligraphy from '../tools/brush/Calligraphy';
import Eraser from '../tools/Eraser';
import Line from '../tools/Line';
import Rect from '../tools/Rect';
import Circle from '../tools/Circle';
import Ellipse from '../tools/Ellipse';
import Stamp from '../tools/Stamp';
import Text from '../tools/Text';
import Hand from '../tools/Hand';
import RectSelect from '../tools/RectSelect';
import Lasso from '../tools/Lasso';

const TOOL_MAP = {
  b: [Brush, 'brush'],
  e: [Eraser, 'eraser'],
  l: [Line, 'line'],
  r: [Rect, 'rect'],
  c: [Circle, 'circle'],
  t: [Text, 'text'],
  h: [Hand, 'hand'],
  m: [RectSelect, 'select'],
  q: [Lasso, 'lasso'],
  и: [Brush, 'brush'],
  у: [Eraser, 'eraser'],
  д: [Line, 'line'],
  к: [Rect, 'rect'],
  с: [Circle, 'circle'],
  е: [Text, 'text'],
  р: [Hand, 'hand'],
  ь: [RectSelect, 'select'],
  й: [Lasso, 'lasso'],
};

const SHIFT_TOOL_MAP = {
  m: [Marker, 'marker'],
  a: [Airbrush, 'airbrush'],
  s: [Smudge, 'smudge'],
  w: [Watercolor, 'watercolor'],
  o: [Oil, 'oil'],
  p: [Pastel, 'pastel'],
  c: [Calligraphy, 'calligraphy'],
  e: [Ellipse, 'ellipse'],
  y: [Stamp, 'stamp'],
  ь: [Marker, 'marker'],
  ф: [Airbrush, 'airbrush'],
  ы: [Smudge, 'smudge'],
  ц: [Watercolor, 'watercolor'],
  щ: [Oil, 'oil'],
  з: [Pastel, 'pastel'],
  с: [Calligraphy, 'calligraphy'],
  у: [Ellipse, 'ellipse'],
  н: [Stamp, 'stamp'],
};

const BRUSH_PRO_TOOLS = new Set(['watercolor', 'oil', 'pastel', 'calligraphy']);

export function useCanvasKeyboard() {
  useEffect(() => {
    const activateTool = (ToolClass, toolName) => {
      const { canvas, socket, sessionId, username } = canvasState;
      if (!canvas) return;
      if (BRUSH_PRO_TOOLS.has(toolName) && !capabilitiesState.brushProAllowed) return;
      const safeUsername = username || 'local';
      toolState.setTool(new ToolClass(canvas, socket, sessionId, safeUsername), toolName);
    };

    const handleKeyPress = (e) => {
      if (toolState.textInputActive || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      const { canvas } = canvasState;
      if (!canvas) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'я') && !e.shiftKey) {
        e.preventDefault();
        canvasState.undo();
        return;
      }

      if (((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'я')) ||
          ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'н'))) {
        e.preventDefault();
        canvasState.redo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyC') {
        if (selectionState.hasSelection) {
          e.preventDefault();
          copySelection();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyX') {
        if (selectionState.hasSelection) {
          e.preventDefault();
          cutSelection(canvas);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === 'KeyV') {
        if (hasClipboardContent()) {
          e.preventDefault();
          pasteSelection(canvas);
        }
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

      const key = e.key.toLowerCase();

      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const shiftTool = SHIFT_TOOL_MAP[key];
        if (shiftTool) {
          e.preventDefault();
          activateTool(shiftTool[0], shiftTool[1]);
          return;
        }
      }

      const tool = TOOL_MAP[key];
      if (tool) {
        activateTool(tool[0], tool[1]);
      } else if (key === 'g' || key === 'п') {
        canvasState.toggleGrid();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
}
