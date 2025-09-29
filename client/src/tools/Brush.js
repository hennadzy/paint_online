import Tool from "./Tool";

export default class Brush extends Tool {
  constructor(canvas, socket, sessionid) {
    super(canvas, socket, sessionid);
    this.listen();
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this.ctx.beginPath();
    this.ctx.moveTo(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop);

    this.socket.send(JSON.stringify({
      method: "draw",
      id: this.sessionid,
      figure: {
        type: "brush",
        x: e.pageX - e.target.offsetLeft,
        y: e.pageY - e.target.offsetTop,
        isStart: true,
        strokeStyle: this.strokeColor,
        lineWidth: this.lineWidth
      }
    }));
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      this.draw(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop);

      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.sessionid,
        figure: {
          type: "brush",
          x: e.pageX - e.target.offsetLeft,
          y: e.pageY - e.target.offsetTop,
          isStart: false,
          strokeStyle: this.strokeColor,
          lineWidth: this.lineWidth
        }
      }));
    }
  }

  mouseUpHandler() {
    this.mouseDown = false;
  }

  draw(x, y) {
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = "round";
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";

    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
}
