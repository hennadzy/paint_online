import Tool from "./Tool";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import { floodFillImageData } from "../utils/floodFill";

export default class Fill extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
  }

  listen() {

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    ctx.globalCompositeOperation = "source-over";

    this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
    this.canvas.addEventListener("pointerdown", this.pointerDownHandlerBound);
  }

  destroyEvents() {
    this.canvas.removeEventListener("pointerdown", this.pointerDownHandlerBound);
  }

  pointerDownHandler(e) {
    if (this.isPinchingActive()) return;

    e.preventDefault();
    e.stopPropagation();

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const stroke = {
      type: "fill",
      x,
      y,
      fillColor: toolState.fillColor,
      username: this.username,
      id: `${Date.now()}-${Math.random()}`
    };

    canvasState.pushStroke(stroke);
    this.saveImage();
    canvasState.redrawCanvas();
    this.sendFillData(stroke);
  }

  sendFillData(stroke) {
    this.send(JSON.stringify({
      method: "draw",
      id: this.id,
      username: this.username,
      figure: stroke,
    }));
  }

  static staticDraw(ctx, x, y, fillColor) {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (floodFillImageData(imageData, x, y, fillColor)) {
      ctx.putImageData(imageData, 0, 0);
    }
  }
}
