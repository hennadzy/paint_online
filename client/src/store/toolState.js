import {makeAutoObservable} from "mobx";

class ToolState {
    tool = null
    // lineWidths = {
    //     brush: 1,
    //     rect: 1,
    //     circle: 1,
    //     eraser: 10,
    //     line: 1
    // };

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
        let lineWidth = this.lineWidths[toolName] || 1;

        if (toolName === 'eraser') {
            lineWidth = 10;
        }

        tool.lineWidth = lineWidth;
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