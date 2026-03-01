import Rect from "../tools/Rect";
import Circle from "../tools/Circle";
import Line from "../tools/Line";
import Text from "../tools/Text";
import Fill from "../tools/Fill";
import Polygon from "../tools/Polygon";
import Arrow from "../tools/Arrow";

class CanvasService {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.bufferCanvas = null;
    this.bufferCtx = null;
    this.showGrid = false;
    this.zoom = 1;
    this.listeners = new Set();
  }

  initialize(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    
    this.bufferCanvas = document.createElement('canvas');
    this.bufferCanvas.width = canvas.width;
    this.bufferCanvas.height = canvas.height;
    this.bufferCtx = this.bufferCanvas.getContext('2d', { willReadFrequently: true });
    this.bufferCtx.fillStyle = "white";
    this.bufferCtx.fillRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    
    this.emit('initialized', { canvas });
  }

  drawStroke(ctx, stroke) {
  if (!stroke) return Promise.resolve();
  
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.lineWidth = stroke.lineWidth || 1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  switch (stroke.type) {
    case "image_placeholder":
    case "fill_image":

      return this.drawImagePlaceholder(ctx, stroke);
    case "brush":
    case "eraser":

      this.renderBrushStroke(ctx, stroke, stroke.type === "eraser");
      break;
    case "rect":
      this.drawRectStroke(ctx, stroke);
      break;
    case "circle":
      this.drawCircleStroke(ctx, stroke);
      break;
    case "line":
      this.drawLineStroke(ctx, stroke);
      break;
    case "arrow":
      this.drawArrowStroke(ctx, stroke);
      break;
    case "polygon":
      this.drawPolygonStroke(ctx, stroke);
      break;
    case "text":
      this.drawTextStroke(ctx, stroke);
      break;
    case "fill":
      this.drawFillStroke(ctx, stroke);
      break;
  }
  
  ctx.restore();
  return Promise.resolve();
}

drawImagePlaceholder(ctx, stroke) {
  const { x, y, width, height, imageData } = stroke;
  
  if (!imageData) return Promise.resolve();
  

  if (typeof imageData === 'string' && imageData.startsWith('data:')) {

    return this.loadImageForStroke(stroke, ctx);
  }
  
  
  if (imageData && imageData.data) {
    const data = imageData.data instanceof Uint8ClampedArray 
      ? imageData.data 
      : new Uint8ClampedArray(imageData.data);
    
    const imgData = new ImageData(data, imageData.width, imageData.height);
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCanvas.getContext('2d').putImageData(imgData, 0, 0);
    
    ctx.drawImage(tempCanvas, 0, 0, imageData.width, imageData.height, x, y, width, height);
  }
  
  return Promise.resolve();
}

imageCache = new Map();

loadImageForStroke(stroke, ctx) {
  const { x, y, width, height, imageData } = stroke;
  const dataUrl = imageData;

  if (this.imageCache.has(dataUrl)) {
    const img = this.imageCache.get(dataUrl);
    if (img.complete && img.naturalWidth !== 0) {
      ctx.drawImage(img, x, y, width, height);
      this.redraw(); 
      return Promise.resolve();
    } else {
      return new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, x, y, width, height);
          this.redraw(); 
          resolve();
        };
        img.onerror = () => resolve();
      });
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      this.imageCache.set(dataUrl, img);
      ctx.drawImage(img, x, y, width, height);
      this.redraw(); 
      resolve();
    };
    img.onerror = () => {
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#999999';
      ctx.strokeRect(x, y, width, height);
      this.redraw(); 
      resolve();
    };
    img.src = dataUrl;
  });
}

clearImageCache() {
  this.imageCache.clear();
}

  renderBrushStroke(ctx, stroke, isEraser = false) {
    const { points, lineWidth = 1, strokeStyle = '#000000', strokeOpacity = 1 } = stroke;
    if (!points || points.length === 0) return;
    
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (!isEraser && strokeStyle) {
      const r = parseInt(strokeStyle.slice(1, 3), 16);
      const g = parseInt(strokeStyle.slice(3, 5), 16);
      const b = parseInt(strokeStyle.slice(5, 7), 16);
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${strokeOpacity})`;
    } else {
      ctx.strokeStyle = strokeStyle;
    }

    ctx.globalCompositeOperation = isEraser ? "destination-out" : "source-over";
    ctx.beginPath();
    
    if (points.length === 1) {
      ctx.arc(points[0].x, points[0].y, lineWidth / 2, 0, 2 * Math.PI);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.fill();
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }
    
    ctx.restore();
  }

  drawRectStroke(ctx, stroke) {
    const { x, y, width, height, strokeStyle = '#000000', strokeOpacity = 1, lineWidth = 1 } = stroke;
    const color = this.hexToRgba(strokeStyle, strokeOpacity);
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "square";
    ctx.lineJoin = "miter";
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.rect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(width), Math.round(height));
    ctx.stroke();
    ctx.restore();
  }

  drawCircleStroke(ctx, stroke) {
    const { x, y, radius, strokeStyle = '#000000', strokeOpacity = 1, lineWidth = 1 } = stroke;
    const color = this.hexToRgba(strokeStyle, strokeOpacity);
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.arc(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(radius), 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  drawLineStroke(ctx, stroke) {
    const { x1, y1, x2, y2, strokeStyle = '#000000', strokeOpacity = 1, lineWidth = 1 } = stroke;
    const color = this.hexToRgba(strokeStyle, strokeOpacity);
    
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
    ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
    ctx.stroke();
    ctx.restore();
  }

  drawArrowStroke(ctx, stroke) {
    const { x1, y1, x2, y2, strokeStyle = '#000000', lineWidth = 2, opacity = 1 } = stroke;
    const headlen = Math.max(10, lineWidth * 3);
    const angle = Math.atan2(y2 - y1, x2 - x1);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = strokeStyle;
    ctx.fillStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headlen * Math.cos(angle - Math.PI / 6),
      y2 - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - headlen * Math.cos(angle + Math.PI / 6),
      y2 - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawPolygonStroke(ctx, stroke) {
    const { points, strokeStyle = '#000000', lineWidth = 1, opacity = 1 } = stroke;
    if (!points || points.length < 3) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = opacity;
    ctx.stroke();
    ctx.restore();
  }

  drawTextStroke(ctx, stroke) {
    const { x, y, text, fontSize = 16, fontFamily = 'Arial', strokeStyle = '#000000', width = 200, opacity = 1 } = stroke;
    if (!text) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = strokeStyle;
    
    const lines = this.wrapText(text, width, ctx);
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i * fontSize);
    }
    ctx.restore();
  }

  drawFillStroke(ctx, stroke) {
    const { x, y, fillColor } = stroke;
    if (fillColor === undefined || fillColor === null) return;
    
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const fillR = parseInt(fillColor.slice(1, 3), 16);
    const fillG = parseInt(fillColor.slice(3, 5), 16);
    const fillB = parseInt(fillColor.slice(5, 7), 16);

    const startPos = (y * width + x) * 4;
    if (startPos < 0 || startPos >= data.length) return;
    
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

  wrapText(text, maxWidth, ctx) {
    if (!text) return [];
    if (maxWidth <= 0) return [text];
    
    const paragraphs = text.split('\n');
    const allLines = [];
    
    for (let para of paragraphs) {
      if (para === '') {
        allLines.push('');
        continue;
      }
      
      const words = para.split(/(\s+)/);
      let currentLine = '';
      
      for (let i = 0; i < words.length; i++) {
        const segment = words[i];
        if (!segment) continue;

        if (/^\s+$/.test(segment)) {
          const testLine = currentLine + segment;
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && currentLine !== '') {
            allLines.push(currentLine);
            currentLine = '';
          } else {
            currentLine = testLine;
          }
          continue;
        }

        const testLine = currentLine + segment;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth) {
          if (currentLine !== '') {
            allLines.push(currentLine.trimEnd());
            currentLine = '';
          }
          
          const wordMetrics = ctx.measureText(segment);
          if (wordMetrics.width <= maxWidth) {
            currentLine = segment;
          } else {
            let charLine = '';
            for (let char of segment) {
              const testCharLine = charLine + char;
              const charMetrics = ctx.measureText(testCharLine);
              if (charMetrics.width > maxWidth && charLine !== '') {
                allLines.push(charLine);
                charLine = '';
              } else {
                charLine = testCharLine;
              }
            }
            if (charLine) {
              currentLine = charLine;
            }
          }
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        allLines.push(currentLine);
      }
    }
    
    return allLines;
  }

  hexToRgba(hex, alpha) {
    if (!hex) return `rgba(0, 0, 0, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  rebuildBuffer(strokes, callback) {
    if (!this.bufferCtx) return;
    
    this.bufferCtx.clearRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    this.bufferCtx.fillStyle = "white";
    this.bufferCtx.fillRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    this.bufferCtx.globalCompositeOperation = "source-over";
    
    const imageStrokes = [];
    const otherStrokes = [];
    
    for (const stroke of strokes) {
      if (stroke.type === 'image_placeholder' || stroke.type === 'fill_image') {
        const isDataUrl = stroke.imageData && typeof stroke.imageData === 'string' && stroke.imageData.startsWith('data:');
        if (isDataUrl) {
          imageStrokes.push(stroke);
        } else {
          otherStrokes.push(stroke);
        }
      } else {
        otherStrokes.push(stroke);
      }
    }
    
    otherStrokes.forEach(stroke => this.drawStroke(this.bufferCtx, stroke));
    
    if (imageStrokes.length === 0) {
      this.redraw();
      if (callback) callback();
      return;
    }
    
    let loadedCount = 0;
    const totalImages = imageStrokes.length;
    
    const checkComplete = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        this.redraw();
        if (callback) callback();
      }
    };
    
    for (const stroke of imageStrokes) {
      const { x, y, width, height, imageData } = stroke;
      const dataUrl = imageData;
      
      if (this.imageCache.has(dataUrl)) {
        const img = this.imageCache.get(dataUrl);
        if (img.complete) {
          this.bufferCtx.drawImage(img, x, y, width, height);
          checkComplete();
        } else {
          img.onload = () => {
            this.bufferCtx.drawImage(img, x, y, width, height);
            checkComplete();
          };
          img.onerror = checkComplete;
        }
        continue;
      }
      
      // Load image
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(dataUrl, img);
        this.bufferCtx.drawImage(img, x, y, width, height);
        checkComplete();
      };
      img.onerror = () => {
        // Draw placeholder on error
        this.bufferCtx.fillStyle = '#cccccc';
        this.bufferCtx.fillRect(x, y, width, height);
        this.bufferCtx.strokeStyle = '#999999';
        this.bufferCtx.strokeRect(x, y, width, height);
        checkComplete();
      };
      img.src = dataUrl;
    }
  }

  redraw() {
    if (!this.ctx || !this.bufferCanvas) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.drawImage(this.bufferCanvas, 0, 0);
    
    if (this.showGrid) {
      this.drawGrid();
    }
  }

  drawGrid() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    const gridSize = 20;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    
    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.redraw();
    this.emit('gridToggled', { showGrid: this.showGrid });
  }

  setZoom(zoom) {
    this.zoom = Math.max(0.5, Math.min(3, zoom));
    
    if (this.canvas) {
      const aspectRatio = 720 / 480;
      let baseWidth, baseHeight;
      
      if (window.innerWidth < 768) {
        baseWidth = window.innerWidth;
        baseHeight = baseWidth / aspectRatio;
      } else {
        baseWidth = 720;
        baseHeight = 480;
      }
      
      const newWidth = baseWidth * this.zoom;
      const newHeight = baseHeight * this.zoom;
      
      this.canvas.style.width = `${newWidth}px`;
      this.canvas.style.height = `${newHeight}px`;
      
      const cursorOverlay = document.querySelector('.cursor-overlay');
      if (cursorOverlay) {
        cursorOverlay.style.width = `${newWidth}px`;
        cursorOverlay.style.height = `${newHeight}px`;
      }
    }
    
    this.emit('zoomChanged', { zoom: this.zoom });
  }

  on(event, callback) {
    this.listeners.add({ event, callback });
  }

  off(event, callback) {
    this.listeners.forEach(listener => {
      if (listener.event === event && listener.callback === callback) {
        this.listeners.delete(listener);
      }
    });
  }

  emit(event, data) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        try {
          listener.callback(data);
        } catch (error) {
          this.emit('error', { error });
        }
      }
    });
  }
}

export default new CanvasService();
