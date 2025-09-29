import { makeAutoObservable } from "mobx";

class ToolState {
  tool = null;

  // ✅ Цвета — локальные, только для текущего клиента
  strokeColor = '#000000';
  fillColor = '#000000';

  // ✅ Толщины — сохраняются по типу инструмента
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
    // ✅ Очистка предыдущего инструмента
    if (this.tool?.restorePreviousColors) {
      this.tool.restorePreviousColors();
    }
    if (this.tool?.destroyEvents) {
      this.tool.destroyEvents();
    }

    const toolName = tool.constructor.name.toLowerCase();

    // ✅ Применяем сохранённую толщину
    const savedWidth = this.lineWidths[toolName] ?? 1;
    tool.lineWidth = savedWidth;

    // ✅ Применяем локальные цвета
    tool.strokeColor = this.strokeColor;
    tool.fillColor = this.fillColor;

    this.tool = tool;

    // ✅ Назначаем события
    if (this.tool.listen) {
      this.tool.listen();
    }
  }

  setStrokeColor(color) {
    this.strokeColor = color;
    if (this.tool) {
      this.tool.strokeColor = color;
    }
  }

  setFillColor(color) {
    this.fillColor = color;
    if (this.tool) {
      this.tool.fillColor = color;
    }
  }

  setLineWidth(lineWidth) {
    if (this.tool) {
      const toolName = this.tool.constructor.name.toLowerCase();
      this.tool.lineWidth = lineWidth;
      this.lineWidths[toolName] = lineWidth;
    }
  }
}

export default new ToolState();
