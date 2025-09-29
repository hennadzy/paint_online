import { makeAutoObservable } from "mobx";

class ToolState {
  tool = null;

  // ✅ Толщина по умолчанию для каждого инструмента
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

  setTool(tool) {
    // ✅ Сохраняем цвета предыдущего инструмента
    if (this.tool?.restorePreviousColors) {
      this.tool.restorePreviousColors();
    }

    // ✅ Удаляем события предыдущего инструмента
    if (this.tool?.destroyEvents) {
      this.tool.destroyEvents();
    }

    const toolName = tool.constructor.name.toLowerCase();

    // ✅ Применяем сохранённую толщину
    const savedWidth = this.lineWidths[toolName] ?? 1;
    tool.lineWidth = savedWidth;

    this.tool = tool;

    // ✅ Назначаем события нового инструмента
    if (this.tool.listen) {
      this.tool.listen();
    }
  }

  setFillColor(color) {
    if (this.tool) {
      this.tool.fillColor = color;
    }
  }

  setStrokeColor(color) {
    if (this.tool) {
      this.tool.strokeColor = color;
    }
  }

  setLineWidth(lineWidth) {
    if (this.tool) {
      const toolName = this.tool.constructor.name.toLowerCase();
      this.tool.lineWidth = lineWidth;
      this.lineWidths[toolName] = lineWidth; // ✅ Сохраняем толщину для текущего инструмента
    }
  }
}

export default new ToolState();
