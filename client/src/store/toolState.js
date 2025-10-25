import { makeAutoObservable } from "mobx";

class ToolState {
  tool = null;
  toolName = null;
  strokeColor = "#000000";
  fillColor = "#000000";

  lineWidths = {
    brush: 1,
    rect: 1,
    circle: 1,
    eraser: 10,
    line: 1
  };

  constructor() {
    makeAutoObservable(this);
  }

  setTool(tool, toolNameOverride) {
    if (canvas) {
      canvas.style.pointerEvents = 'auto';
    }
    this.tool?.destroyEvents?.();
    this.tool = tool;
    this.toolName = toolNameOverride ?? tool.constructor.name.toLowerCase();

    this.tool.setStrokeColor?.(this.strokeColor);
    this.tool.setFillColor?.(this.fillColor);

    const savedWidth = this.lineWidths[this.toolName] ?? 1;
    this.tool.setLineWidth?.(savedWidth);

    this.tool.listen?.();
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

  setFillColor(color) {
    this.fillColor = color;
    this.tool?.setFillColor?.(color);
  }
}

export default new ToolState();

