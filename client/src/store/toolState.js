import {makeAutoObservable} from "mobx";

class ToolState {
    tool = null
    constructor() {
        makeAutoObservable(this)
    }

    setTool(tool) {
        if (this.tool && this.tool.destroyEvents) {
            this.tool.destroyEvents(); // Удаляем обработчики старого инструмента
        }
        this.tool = tool;
        if (this.tool.listen) {
            this.tool.listen(); // Назначаем новые обработчики
        }
    }
    
    setFillColor(color) {
        this.tool.fillColor = color
    }
    setStrokeColor(color) {
        this.tool.strokeColor = color
    }
    setLineWidth(width) {
        this.tool.lineWidth = width
    }
}

export default new ToolState()
