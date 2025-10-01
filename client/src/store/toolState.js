import { makeAutoObservable, observable } from "mobx";

class ToolState {
  tool = null;

  strokeColor = "#000000";
  fillColor = "#000000";

  lineWidths = {
    brush: 5,
    rect: 1,
    circle: 1,
    eraser: 15,
    line: 1
  };

  constructor() {
    makeAutoObservable(this);
  }

  setTool(tool) {
    this.tool?.destroyEvents?.();
   this.tool = tool;

    this.tool.setStrokeColor?.(this.strokeColor);
    this.tool.setFillColor?.(this.fillColor);
console.log("toolName:", tool.constructor.name);

    const toolName = tool.constructor.name.toLowerCase();
    this.tool.setLineWidth?.(this.lineWidths[toolName] ?? 2);

    this.tool.listen?.();
  }

  setStrokeColor(color) {
    this.strokeColor = color;
    this.tool?.setStrokeColor?.(color);
  }

  setFillColor(color) {
    this.fillColor = color;
    this.tool?.setFillColor?.(color);
  }

  setLineWidth(lineWidth) {
    if (this.tool) {
      const toolName = this.tool.constructor.name.toLowerCase();
      this.tool.setLineWidth?.(lineWidth);
      this.lineWidths[toolName] = lineWidth;
    }
  }
}

export default new ToolState();
