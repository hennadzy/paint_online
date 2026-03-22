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
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Парсим цвет заливки (поддержка hex и rgb)
    let fillR, fillG, fillB;
    if (fillColor.startsWith('#')) {
      const hex = fillColor.replace('#', '');
      if (hex.length === 3) {
        fillR = parseInt(hex[0] + hex[0], 16);
        fillG = parseInt(hex[1] + hex[1], 16);
        fillB = parseInt(hex[2] + hex[2], 16);
      } else {
        fillR = parseInt(hex.slice(0, 2), 16);
        fillG = parseInt(hex.slice(2, 4), 16);
        fillB = parseInt(hex.slice(4, 6), 16);
      }
    } else {
      // Fallback: чёрный
      fillR = 0; fillG = 0; fillB = 0;
    }

    const startPos = (y * width + x) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    // Не заливаем, если цвет уже совпадает
    if (startR === fillR && startG === fillG && startB === fillB && startA === 255) {
      return;
    }

    // Порог схожести цветов — для захвата антиалиасированных пикселей на границах
    const threshold = 32;

    // Быстрая проверка совпадения цвета с начальным (без sqrt для скорости)
    const matchesStartColor = (pos) => {
      const dr = data[pos]     - startR;
      const dg = data[pos + 1] - startG;
      const db = data[pos + 2] - startB;
      const da = data[pos + 3] - startA;
      return (dr * dr + dg * dg + db * db + da * da) <= threshold * threshold * 4;
    };

    // Установка цвета пикселя (без блендинга — чистая заливка как в Paint)
    const setColor = (pos) => {
      data[pos]     = fillR;
      data[pos + 1] = fillG;
      data[pos + 2] = fillB;
      data[pos + 3] = 255;
    };

    // Используем Uint8Array для отслеживания посещённых пикселей — O(1) доступ
    const visited = new Uint8Array(width * height);

    // Scanline flood fill (стек вместо очереди — pop() O(1), не shift() O(n))
    // Каждый элемент стека: [x, y]
    const stack = [[x, y]];

    while (stack.length > 0) {
      const [nx, ny] = stack.pop();

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (visited[ny * width + nx]) continue;

      const pos = (ny * width + nx) * 4;
      if (!matchesStartColor(pos)) continue;

      // Сканируем влево до границы
      let west = nx;
      while (west > 0 && !visited[ny * width + (west - 1)] && matchesStartColor((ny * width + (west - 1)) * 4)) {
        west--;
      }

      // Сканируем вправо до границы
      let east = nx;
      while (east < width - 1 && !visited[ny * width + (east + 1)] && matchesStartColor((ny * width + (east + 1)) * 4)) {
        east++;
      }

      // Заливаем всю горизонтальную линию от west до east
      for (let i = west; i <= east; i++) {
        const idx = ny * width + i;
        if (!visited[idx]) {
          visited[idx] = 1;
          setColor(idx * 4);
        }
      }

      // Добавляем строки выше и ниже в стек
      for (let i = west; i <= east; i++) {
        if (ny > 0 && !visited[(ny - 1) * width + i]) {
          const upPos = ((ny - 1) * width + i) * 4;
          if (matchesStartColor(upPos)) {
            stack.push([i, ny - 1]);
          }
        }
        if (ny < height - 1 && !visited[(ny + 1) * width + i]) {
          const downPos = ((ny + 1) * width + i) * 4;
          if (matchesStartColor(downPos)) {
            stack.push([i, ny + 1]);
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
