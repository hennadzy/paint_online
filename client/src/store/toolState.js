import { makeAutoObservable } from "mobx";
import canvasState from "./canvasState";

class ToolState {
  tool = null;
  toolName = null;
  strokeColor = "#000000";
  fillColor = "#000000";
  strokeOpacity = 1;
  textInputActive = false;

  lineWidths = {
    brush: 1,
    rect: 1,
    circle: 1,
    polygon: 1,
    eraser: 10,
    line: 1,
    arrow: 2,
    text: 16,
    fill: 1,
    pipette: 1
  };

  groups = {
    brush: ["brush", "line", "arrow"],
    shapes: ["circle", "rect", "polygon"],
    color: ["pipette", "fill"]
  };

  lastSelected = {
    brush: "brush",
    shapes: "circle",
    color: "pipette"
  };

  constructor() {
    makeAutoObservable(this);
  }

  getGroupForTool(toolName) {
    for (let group in this.groups) {
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

  setTool(tool, toolNameOverride) {
    this.tool?.destroyEvents?.();

    this.tool = tool;
    this.toolName = toolNameOverride ?? tool.constructor.name.toLowerCase();

    const group = this.getGroupForTool(this.toolName);
    if (group) this.lastSelected[group] = this.toolName;

    this.tool.setStrokeColor?.(this.strokeColor);
    this.tool.setFillColor?.(this.fillColor);
    this.tool.setStrokeOpacity?.(this.strokeOpacity);
    this.tool.setLineWidth?.(this.lineWidths[this.toolName] ?? 1);

    if (this.tool.canvas) {
      const ctx = this.tool.canvas.getContext("2d");
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
