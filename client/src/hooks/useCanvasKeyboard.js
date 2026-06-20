import { useEffect } from 'react';
import canvasState from '../store/canvasState';
import toolState from '../store/toolState';
import selectionState from '../store/selectionState';
import capabilitiesState from '../store/capabilitiesState';
import { findToolByHotkey, resolveHotkeyKey } from '../config/toolHotkeys';
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
import Fill from '../tools/Fill';
import Pipette from '../tools/Pipette';
import Polygon from '../tools/Polygon';
import Arrow from '../tools/Arrow';

const TOOL_CLASSES = {
  hand: Hand,
  select: RectSelect,
  lasso: Lasso,
  brush: Brush,
  eraser: Eraser,
  line: Line,
  rect: Rect,
  circle: Circle,
  text: Text,
  marker: Marker,
  airbrush: Airbrush,
  smudge: Smudge,
  watercolor: Watercolor,
  oil: Oil,
  pastel: Pastel,
  calligraphy: Calligraphy,
  ellipse: Ellipse,
  stamp: Stamp,
  fill: Fill,
  pipette: Pipette,
  polygon: Polygon,
  arrow: Arrow,
};

const BRUSH_PRO_TOOLS = new Set(['watercolor', 'oil', 'pastel', 'calligraphy']);

export function useCanvasKeyboard() {
  useEffect(() => {
    const activateTool = (toolName) => {
      const ToolClass = TOOL_CLASSES[toolName];
      if (!ToolClass) return;
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

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = resolveHotkeyKey(e.key);
      if (key === 'G') {
        canvasState.toggleGrid();
        return;
      }

      const toolName = findToolByHotkey(e.key);
      if (toolName) {
        e.preventDefault();
        activateTool(toolName);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
}
