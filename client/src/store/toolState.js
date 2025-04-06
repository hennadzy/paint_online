// toolState.js
import { makeAutoObservable } from "mobx";

class ToolState {
    tool = null;
    constructor() {
        makeAutoObservable(this);
    }

    setTool(newTool) {
        if (this.tool && this.tool.destroyEvents) {
            this.tool.destroyEvents();
        }
        this.tool = newTool;
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
    
    setLineWidth(width) {
        if (this.tool) {
            this.tool.lineWidth = width;
        }
    }
}

export default new ToolState();
