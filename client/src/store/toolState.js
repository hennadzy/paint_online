import { makeAutoObservable } from "mobx";

class ToolState {
  tool = null;
  lineWidth = 1;
  hasUsedEraser = false;

  constructor() {
    makeAutoObservable(this);
  }

  setTool(tool) {
    const toolName = tool.constructor.name.toLowerCase();

    // ✅ Если это стерка и она выбрана впервые — установить 10px
    if (toolName === "eraser" && !this.hasUsedEraser) {
      tool.lineWidth = 10;
      this.lineWidth = 10;
      this.hasUsedEraser = true;
    } else {
      tool.lineWidth = this.lineWidth;
    }

    this.tool = tool;
  }

  setLineWidth(width) {
    this.lineWidth = width;
    if (this.tool) {
      this.tool.lineWidth = width;
    }
  }

  getCurrentLineWidth() {
    return this.lineWidth;
  }

  setStrokeColor(color) {
    if (this.tool) this.tool.strokeColor = color;
  }

  setFillColor(color) {
    if (this.tool) this.tool.fillColor = color;
  }
}

export default new ToolState();
