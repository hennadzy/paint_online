import Tool from "./Tool";

class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;

    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
  }


  mouseDownHandler(e) {
    this.mouseDown = true;
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX, e.clientY);
    this.sendDrawData(e.clientX, e.clientY, true);
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      this.ctx.lineTo(e.clientX, e.clientY);
      this.ctx.stroke();
      this.sendDrawData(e.clientX, e.clientY);
    }
  }

  mouseUpHandler(e) {
    this.mouseDown = false;
  }

  sendDrawData(x, y, isStart = false) {
    const { lineWidth, strokeStyle } = this.ctx;
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          figure: {
            type: "brush",
            x,
            y,
            lineWidth,
            strokeStyle,
            isStart,
            username: this.username,
          },
        })
      );
    }
    Brush.staticDraw(this.ctx, x, y, lineWidth, strokeStyle, isStart);
  }

  static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart = false) {
    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
}