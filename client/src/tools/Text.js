import Tool from "./Tool";

export default class Text extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;
    this.text = "";
    this.fontSize = 16;
    this.fontFamily = "Arial";
  }

  setFontSize(size) {
    this.fontSize = size;
  }

  setFontFamily(family) {
    this.fontFamily = family;
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;

    this.text = prompt("Введите текст:");
    if (this.text) {
      this.drawText(this.startX, this.startY);
      this.sendTextData(this.startX, this.startY, this.text);
    }
  }

  mouseUpHandler() {
    this.mouseDown = false;
  }

  drawText(x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.fillStyle = this.strokeColor;
    ctx.fillText(this.text, x, y);
    ctx.restore();
  }

  sendTextData(x, y, text) {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: {
          type: "text",
          x,
          y,
          text,
          fontSize: this.fontSize,
          fontFamily: this.fontFamily,
          strokeStyle: this.strokeColor
        }
      }));
    }
  }

  static staticDraw(ctx, x, y, text, fontSize, fontFamily, strokeStyle) {
    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = strokeStyle;
    ctx.fillText(text, x, y);
    ctx.restore();
  }
}
