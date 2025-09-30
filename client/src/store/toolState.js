import { makeAutoObservable, observable } from "mobx";

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

        if (tool.setStrokeColor) {
            tool.setStrokeColor(this.strokeColor);
        }
        if (tool.setFillColor) {
            tool.setFillColor(this.fillColor);
        }

        this.canvas.onmousedown = null;
        this.canvas.onmousemove = null;
        this.canvas.onmouseup = null;
        this.canvas.ontouchstart = null;
        this.canvas.ontouchmove = null;
        this.canvas.ontouchend = null;

        this.tool = observable(tool);

        if (this.tool.listen) {
            this.tool.listen();
        }



    }

    setStrokeColor(color) {
        this.strokeColor = color;
        if (this.tool?.setStrokeColor) {
            this.tool.setStrokeColor(color);
        }
    }

    setFillColor(color) {
        this.fillColor = color;
        if (this.tool?.setFillColor) {
            this.tool.setFillColor(color);
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
