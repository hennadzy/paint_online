import {makeAutoObservable} from "mobx";

class ToolState {
    tool = null
    lineWidths = {
        brush: 3,
        rect: 3,
        circle: 3,
        eraser: 10,
        line: 3
    };

    constructor() {
        makeAutoObservable(this)
    }

    setTool(tool) {
        if (this.tool && this.tool.restorePreviousColors) {
            this.tool.restorePreviousColors();
        }
        if (this.tool && this.tool.destroyEvents) {
            this.tool.destroyEvents();
        }

        const toolName = tool.constructor.name.toLowerCase();
        tool.lineWidth = this.lineWidths[toolName] || 3;

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
            this.tool.lineWidth = lineWidth;
            const toolName = this.tool.constructor.name.toLowerCase();
            this.lineWidths[toolName] = lineWidth;
        }
    }
}

export default new ToolState()