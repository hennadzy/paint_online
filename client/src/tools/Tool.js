import toolState from "../store/toolState";

export default class Tool {
  constructor(canvas, socket, id, username) {
    this.canvas = canvas;
    this.socket = socket;
    this.id = id;
    this.username = username;
    this.ctx = canvas.getContext("2d");
    this.strokeColor = toolState.strokeColor;
    this.fillColor = toolState.fillColor;
    const toolName = this.constructor.name.toLowerCase();
    this.lineWidth = toolState.lineWidths[toolName] ?? 1;
    this.mouseDown = false;
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmouseup = null;
    this.canvas.onmousemove = null;
    this.canvas.ontouchstart = null;
    this.canvas.ontouchmove = null;
    this.canvas.ontouchend = null;
  }

  setStrokeColor(color) {
    this.strokeColor = color;
  }

  setFillColor(color) {
    this.fillColor = color;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }
}

