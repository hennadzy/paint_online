import { makeAutoObservable } from "mobx";

class ToolState {
  tool = null;

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
    this.tool?.destroyEvents?.();
    this.tool = tool;

    const toolName = toolNameOverride ?? tool.constructor.name.toLowerCase();

    this.tool.setStrokeColor?.(this.strokeColor);
    this.tool.setFillColor?.(this.fillColor);

    // Всегда восстанавливаем сохранённую толщину
    const savedWidth = this.lineWidths[toolName] ?? 1;
    console.log("Restoring lineWidth for", toolName, "→", savedWidth);
    this.tool.setLineWidth?.(savedWidth);


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
