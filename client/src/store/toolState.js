import {makeAutoObservable} from "mobx";

class ToolState {
    tool = null
    lineWidths = {
        brush: 1,
        rect: 1,
        circle: 1,
        eraser: 10,
        line: 1
    };

    constructor() {
        makeAutoObservable(this)
    }

setTool(tool) {
  if (this.tool?.restorePreviousColors) {
    this.tool.restorePreviousColors();
  }
  if (this.tool?.destroyEvents) {
    this.tool.destroyEvents();
  }

  const toolName = tool.constructor.name.toLowerCase();
  const savedWidth = this.lineWidths[toolName] ?? 1;
  tool.lineWidth = savedWidth;

  tool.strokeColor = this.strokeColor;
  tool.fillColor = this.fillColor;

  this.tool = tool;

  if (this.tool.listen) {
    this.tool.listen();
  }
}

    setFillColor(color) {
        this.tool.fillColor = color
    }
    setStrokeColor(color) {
        this.tool.strokeColor = color
    }
   setLineWidth(lineWidth) {
  if (this.tool) {
    const toolName = this.tool.constructor.name.toLowerCase();
    this.tool.lineWidth = lineWidth;
    this.lineWidths[toolName] = lineWidth;
  }
}
}

export default new ToolState()
