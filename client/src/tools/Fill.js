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

    const fillR = parseInt(fillColor.slice(1, 3), 16);
    const fillG = parseInt(fillColor.slice(3, 5), 16);
    const fillB = parseInt(fillColor.slice(5, 7), 16);

    const startPos = (y * width + x) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    // Don't fill if the target color is the same as the fill color
    if (startR === fillR && startG === fillG && startB === fillB) {
        return;
    }

    // Color similarity threshold (0-255)
    const threshold = 5;

    // Check if a pixel matches the start color within the threshold
    const matchesStartColor = (pos) => {
        const r = data[pos];
        const g = data[pos + 1];
        const b = data[pos + 2];
        const a = data[pos + 3];
        
        // Check alpha separately - we only want to fill fully opaque or transparent areas
        if (Math.abs(a - startA) > threshold) {
            return false;
        }
        
        // Calculate color distance using a simple Euclidean distance
        const colorDist = Math.sqrt(
            Math.pow(r - startR, 2) + 
            Math.pow(g - startG, 2) + 
            Math.pow(b - startB, 2)
        );
        
        return colorDist <= threshold;
    };

    // Set the color with anti-aliasing at edges
    const setColor = (pos, strength = 1) => {
        // Full strength fill
        if (strength >= 0.99) {
            data[pos] = fillR;
            data[pos + 1] = fillG;
            data[pos + 2] = fillB;
            data[pos + 3] = 255;
            return;
        }
        
        // Blend with existing color for anti-aliasing
        data[pos] = Math.round(data[pos] * (1 - strength) + fillR * strength);
        data[pos + 1] = Math.round(data[pos + 1] * (1 - strength) + fillG * strength);
        data[pos + 2] = Math.round(data[pos + 2] * (1 - strength) + fillB * strength);
        data[pos + 3] = Math.max(data[pos + 3], Math.round(255 * strength));
    };

    // Use a queue for breadth-first fill (more efficient for large areas)
    const pixelStack = [[x, y]];
    // Keep track of visited pixels to avoid revisiting
    const visited = new Set();
    const getKey = (nx, ny) => `${nx},${ny}`;

    while (pixelStack.length) {
        const [nx, ny] = pixelStack.shift();
        const key = getKey(nx, ny);
        
        if (visited.has(key)) {
            continue;
        }
        
        let currentPos = (ny * width + nx) * 4;

        if (ny < 0 || ny >= height || nx < 0 || nx >= width || !matchesStartColor(currentPos)) {
            continue;
        }

        visited.add(key);
        
        // Fill current pixel
        setColor(currentPos);

        // Scan west and east to fill and find boundaries
        let west = nx;
        while (west > 0 && matchesStartColor((ny * width + (west - 1)) * 4)) {
            west--;
            const westPos = (ny * width + west) * 4;
            setColor(westPos);
            visited.add(getKey(west, ny));
        }

        let east = nx;
        while (east < width - 1 && matchesStartColor((ny * width + (east + 1)) * 4)) {
            east++;
            const eastPos = (ny * width + east) * 4;
            setColor(eastPos);
            visited.add(getKey(east, ny));
        }

        // Check pixels above and below the filled line
        for (let i = west; i <= east; i++) {
            // Check pixel above
            if (ny > 0) {
                const upPos = ((ny - 1) * width + i) * 4;
                if (matchesStartColor(upPos) && !visited.has(getKey(i, ny - 1))) {
                    pixelStack.push([i, ny - 1]);
                } else if (!visited.has(getKey(i, ny - 1))) {
                    // Add anti-aliasing at the edge
                    setColor(upPos, 0.5);
                }
            }
            
            // Check pixel below
            if (ny < height - 1) {
                const downPos = ((ny + 1) * width + i) * 4;
                if (matchesStartColor(downPos) && !visited.has(getKey(i, ny + 1))) {
                    pixelStack.push([i, ny + 1]);
                } else if (!visited.has(getKey(i, ny + 1))) {
                    // Add anti-aliasing at the edge
                    setColor(downPos, 0.5);
                }
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
