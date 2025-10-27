import { makeAutoObservable } from "mobx";

class ToolState {
  tool = null;
  toolName = null;
  strokeColor = "#000000";
  fillColor = "#000000";
  strokeOpacity = 1;

  lineWidths = {
    brush: 1,
    rect: 1,
    circle: 1,
    eraser: 10,
    line: 1,
    text: 16,
    fill: 1,
    pipette: 1
  };

  constructor() {
    makeAutoObservable(this);
  }

setTool(tool, toolNameOverride) {
  this.tool?.destroyEvents?.(); // удаляет ВСЕ события

  this.tool = tool;
  this.toolName = toolNameOverride ?? tool.constructor.name.toLowerCase();

  this.tool.setStrokeColor?.(this.strokeColor);
  this.tool.setFillColor?.(this.fillColor);
  this.tool.setStrokeOpacity?.(this.strokeOpacity);

  const savedWidth = this.lineWidths[this.toolName] ?? 1;
  this.tool.setLineWidth?.(savedWidth);

  this.tool.listen?.();

  if (this.tool.canvas) {
    this.tool.canvas.style.pointerEvents = "auto";
  }
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
