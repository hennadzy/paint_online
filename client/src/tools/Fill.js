import Tool from "./Tool";

export default class Fill extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.fillColor = "#000000";
  }

  setFillColor(color) {
    this.fillColor = color;
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
  }

  mouseDownHandler(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    this.floodFill(x, y, this.fillColor);
    this.sendFillData(x, y, this.fillColor);
  }

  floodFill(startX, startY, fillColor) {
    const ctx = this.ctx;
    const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const startPos = (startY * width + startX) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    const fillR = parseInt(fillColor.slice(1, 3), 16);
    const fillG = parseInt(fillColor.slice(3, 5), 16);
    const fillB = parseInt(fillColor.slice(5, 7), 16);
    const fillA = 255;

    if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) {
      return;
    }

    const stack = [[startX, startY]];
    while (stack.length) {
      const [x, y] = stack.pop();
      const pos = (y * width + x) * 4;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (data[pos] !== startR || data[pos + 1] !== startG || data[pos + 2] !== startB || data[pos + 3] !== startA) continue;

      data[pos] = fillR;
      data[pos + 1] = fillG;
      data[pos + 2] = fillB;
      data[pos + 3] = fillA;

      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  sendFillData(x, y, fillColor) {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: {
          type: "fill",
          x,
          y,
          fillColor
        }
      }));
    }
  }

  static staticDraw(ctx, x, y, fillColor, canvasWidth, canvasHeight) {
    // For static draw, we need to implement flood fill on the context
    // This is a simplified version - in practice, you'd need the full flood fill logic
    const fill = new Fill(ctx.canvas, null, null, null);
    fill.fillColor = fillColor;
    fill.floodFill(x, y, fillColor);
  }
}
