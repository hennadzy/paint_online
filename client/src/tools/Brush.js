import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Brush extends Tool {
  constructor(canvas, socket, id) {
    super(canvas, socket, id);
    this.listen();
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this.ctx.beginPath();
    this.ctx.moveTo(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop);
    this.sendDrawData(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop, true);
  }

  mouseUpHandler(e) {
    this.mouseDown = false;
    this.sendDrawData(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop);
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      this.sendDrawData(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop);
    }
  }

  sendDrawData(x, y, isStart = false) {
    const message = {
      method: "draw",
      id: this.id,
      figure: {
        type: "brush",
        x,
        y,
        isStart,
        strokeStyle: this.strokeStyle,
        lineWidth: this.lineWidth // ✅ отправляем локальную толщину
      }
    };
    this.socket.send(JSON.stringify(message));
  }

  static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineTo(x, y);
    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
}
