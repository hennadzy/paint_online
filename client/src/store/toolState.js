import { makeAutoObservable } from "mobx";

class ToolState {
  tool = null;


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

    // ✅ Применяем текущие цвета
  if (this.tool?.strokeColor) {
        tool.strokeColor = this.tool.strokeColor;
    }
    if (this.tool?.fillColor) {
        tool.fillColor = this.tool.fillColor;
    }

    this.tool = tool;

    // ✅ Назначаем события нового инструмента
    if (this.tool.listen) {
      this.tool.listen();
    }
  }

setStrokeColor(color) {
  if (this.tool?.setStrokeColor) {
    this.tool.setStrokeColor(color);
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
