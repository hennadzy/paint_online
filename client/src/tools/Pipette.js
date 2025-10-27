import Tool from "./Tool";
import toolState from "../store/toolState";

export default class Pipette extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
  }

  mouseDownHandler(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = this.ctx;
    const imageData = ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;
    const r = data[0];
    const g = data[1];
    const b = data[2];
    const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    toolState.setStrokeColor(color);
  }
}
