import Tool from "./Tool";
import toolState from "../store/toolState";

export default class Pipette extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
  }

  listen() {
    const ctx = this.canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";

    this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
    this.canvas.addEventListener("click", this.pointerDownHandlerBound);
  }

  destroyEvents() {
    if (this.pointerDownHandlerBound) {
      this.canvas.removeEventListener("click", this.pointerDownHandlerBound);
      this.pointerDownHandlerBound = null;
    }
  }

  pointerDownHandler(e) {
    e.preventDefault();
    e.stopPropagation();

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = this.ctx;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const color = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;

    toolState.setStrokeColor(color);
    toolState.setFillColor(color);
  }
}
