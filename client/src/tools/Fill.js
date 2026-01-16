import Tool from "./Tool";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";

export default class Fill extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
  }

  listen() {
  
    const ctx = this.canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";

    this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
    this.canvas.addEventListener("pointerdown", this.pointerDownHandlerBound);
  }

  destroyEvents() {
    this.canvas.removeEventListener("pointerdown", this.pointerDownHandlerBound);
  }

  pointerDownHandler(e) {
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
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const fillR = parseInt(fillColor.slice(1, 3), 16);
    const fillG = parseInt(fillColor.slice(3, 5), 16);
    const fillB = parseInt(fillColor.slice(5, 7), 16);

    const startPos = (y * width + x) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    if (startR === fillR && startG === fillG && startB === fillB) {
        return;
    }

    const matchesStartColor = (pos) => {
        return data[pos] === startR && data[pos + 1] === startG && data[pos + 2] === startB && data[pos + 3] === startA;
    }

    const setColor = (pos) => {
        data[pos] = fillR;
        data[pos + 1] = fillG;
        data[pos + 2] = fillB;
        data[pos + 3] = 255;
    }

    const pixelStack = [[x, y]];

    while (pixelStack.length) {
        const [nx, ny] = pixelStack.pop();
        let currentPos = (ny * width + nx) * 4;

        if (ny < 0 || ny >= height || nx < 0 || nx >= width || !matchesStartColor(currentPos)) {
            continue;
        }

        let west = nx;
        while (west > 0 && matchesStartColor((ny * width + (west - 1)) * 4)) {
            west--;
        }

        let east = nx;
        while (east < width - 1 && matchesStartColor((ny * width + (east + 1)) * 4)) {
            east++;
        }

        let reachUp = false;
        let reachDown = false;
        for (let i = west; i <= east; i++) {
            setColor((ny * width + i) * 4);

            if (ny > 0 && matchesStartColor(((ny - 1) * width + i) * 4)) {
                if (!reachUp) {
                    pixelStack.push([i, ny - 1]);
                    reachUp = true;
                }
            } else {
                reachUp = false;
            }

            if (ny < height - 1 && matchesStartColor(((ny + 1) * width + i) * 4)) {
                if (!reachDown) {
                    pixelStack.push([i, ny + 1]);
                    reachDown = true;
                }
            } else {
                reachDown = false;
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
