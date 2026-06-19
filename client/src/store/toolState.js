import { makeAutoObservable } from "mobx";
import canvasState from "./canvasState";
import selectionState from "./selectionState";
import { commitSelectionSession } from "../utils/selectionSession";

const DEFAULT_TOOL_PARAMS = {
  marker: { angle: 0 },
  airbrush: { scatter: 15 },
  smudge: { strength: 50 },
  watercolor: { saturation: 50 },
  oil: { edgeHardness: 70 },
  pastel: { graininess: 60 },
  calligraphy: { speedSensitivity: 50 },
  stamp: { stampSize: 48, selectedStamp: '😊' },
};

class ToolState {
  tool = null;
  toolName = null;
  strokeColor = "#000000";
  fillColor = "#000000";
  strokeOpacity = 1;
  textInputActive = false;
  stampPaletteOpen = false;

  lineWidths = {
    brush: 1,
    marker: 12,
    airbrush: 20,
    smudge: 24,
    watercolor: 14,
    oil: 10,
    pastel: 12,
    calligraphy: 8,
    rect: 1,
    circle: 1,
    ellipse: 1,
    polygon: 1,
    eraser: 10,
    line: 1,
    arrow: 2,
    text: 16,
    fill: 1,
    pipette: 1,
    stamp: 48,
  };

  defaultOpacity = {
    marker: 0.5,
    airbrush: 0.35,
    watercolor: 0.45,
    pastel: 0.35,
  };

  toolParams = JSON.parse(JSON.stringify(DEFAULT_TOOL_PARAMS));

  groups = {
    selection: ["select", "lasso"],
    brush: ["brush", "line", "arrow"],
    brushExtra: ["marker", "airbrush", "smudge"],
    brushPro: ["watercolor", "oil", "pastel", "calligraphy"],
    shapes: ["circle", "rect", "polygon", "ellipse", "stamp"],
    color: ["fill", "pipette"],
    eraser: ["eraser"],
  };

  lastSelected = {
    selection: "select",
    brush: "brush",
    brushExtra: "marker",
    brushPro: "watercolor",
    shapes: "circle",
    color: "fill",
    eraser: "eraser",
  };

  groupLabels = {
    brush: { brush: "Кисть", line: "Линия", arrow: "Стрелка" },
    brushExtra: { marker: "Маркер", airbrush: "Аэрограф", smudge: "Размывайка" },
    brushPro: { watercolor: "Акварель", oil: "Масляная", pastel: "Пастель", calligraphy: "Каллиграфия" },
    shapes: {
      circle: "Круг", rect: "Прямоугольник", polygon: "Многоугольник",
      ellipse: "Эллипс", stamp: "Штампики",
    },
    color: { pipette: "Пипетка", fill: "Заливка" },
    selection: { select: "Выделение", lasso: "Лассо" },
  };

  constructor() {
    makeAutoObservable(this);
  }

  getGroupForTool(toolName) {
    for (const group in this.groups) {
      if (this.groups[group].includes(toolName)) return group;
    }
    return null;
  }

  getLastInGroup(group) {
    return this.lastSelected[group] || this.groups[group][0];
  }

  isToolInGroup(toolName, group) {
    return this.groups[group].includes(toolName);
  }

  getToolParams(toolName) {
    return { ...(this.toolParams[toolName] || {}) };
  }

  setToolParam(toolName, key, value) {
    if (!this.toolParams[toolName]) {
      this.toolParams[toolName] = {};
    }
    this.toolParams[toolName][key] = value;
    if (toolName === 'stamp' && key === 'selectedStamp') {
      this.stampPaletteOpen = false;
    }
    if (this.toolName === toolName && this.tool) {
      this.tool[key] = value;
    }
  }

  setTool(tool, toolNameOverride) {
    if (selectionState.transformSessionActive) {
      const canvas = canvasState.canvas || this.tool?.canvas;
      if (canvas) {
        commitSelectionSession(canvas);
      } else {
        selectionState.clear();
      }
    }

    this.tool?.destroyEvents?.();

    this.tool = tool;
    this.toolName = toolNameOverride ?? tool.constructor.name.toLowerCase();

    const group = this.getGroupForTool(this.toolName);
    if (group) this.lastSelected[group] = this.toolName;

    if (this.defaultOpacity[this.toolName] !== undefined) {
      this.strokeOpacity = this.defaultOpacity[this.toolName];
    }

    if (this.toolName === 'stamp') {
      this.stampPaletteOpen = true;
    }

    this.tool.setStrokeColor?.(this.strokeColor);
    this.tool.setFillColor?.(this.fillColor);
    this.tool.setStrokeOpacity?.(this.strokeOpacity);
    this.tool.setLineWidth?.(this.lineWidths[this.toolName] ?? 1);

    const params = this.getToolParams(this.toolName);
    Object.entries(params).forEach(([key, value]) => {
      if (this.tool) this.tool[key] = value;
    });

    if (this.tool.canvas) {
      const ctx = this.tool.canvas.getContext("2d", { willReadFrequently: true });
      ctx.globalCompositeOperation = "source-over";
      this.tool.canvas.style.pointerEvents = "auto";

      if (canvasState.bufferCtx) {
        canvasState.bufferCtx.globalCompositeOperation = "source-over";
      }
    }

    this.tool.listen?.();
    canvasState.redrawCanvas();
  }

  setLineWidth(lineWidth) {
    if (this.tool && this.toolName) {
      this.tool.setLineWidth?.(lineWidth);
      this.lineWidths[this.toolName] = lineWidth;
    }
  }

  setStrokeColor(color) {
    this.strokeColor = color;
    this.tool?.setStrokeColor?.(color);
  }

  setStrokeOpacity(opacity) {
    this.strokeOpacity = opacity;
    this.tool?.setStrokeOpacity?.(opacity);
  }

  setFillColor(color) {
    this.fillColor = color;
    this.tool?.setFillColor?.(color);
  }
}

const toolState = new ToolState();
export default toolState;
