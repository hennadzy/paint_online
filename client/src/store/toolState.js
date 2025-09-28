import { makeAutoObservable } from "mobx";

class ToolState {
  tool = null;
  color = "#000000";
  lineWidth = 1;
  eraserWidth = 10; // ✅ толщина стерки по умолчанию

  constructor() {
    makeAutoObservable(this);
  }

  setTool(tool) {
    this.tool = tool;
  }

  setColor(color) {
    this.color = color;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  setEraserWidth(width) {
    this.eraserWidth = width;
  }
}

export default new ToolState();
