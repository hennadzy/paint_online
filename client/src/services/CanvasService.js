import Rect from "../tools/Rect";
import Circle from "../tools/Circle";
import Line from "../tools/Line";
import Text from "../tools/Text";
import Fill from "../tools/Fill";
import Polygon from "../tools/Polygon";
import Arrow from "../tools/Arrow";

/**
 * CanvasService - manages canvas rendering and drawing operations
 * Responsibilities: canvas setup, drawing strokes, grid, zoom
 */
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

  /**
   * Initialize canvas and buffer
   */
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

  /**
   * Draw a single stroke on context
   */
  drawStroke(ctx, stroke) {
    if (!stroke) return;
    
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.lineWidth = stroke.lineWidth || 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    
    switch (stroke.type) {
      case "brush":
      case "eraser":
        this.renderBrushStroke(ctx, stroke, stroke.type === "eraser");
        break;
      case "rect":
        Rect.staticDraw(ctx, stroke.x, stroke.y, stroke.width, stroke.height, stroke.strokeStyle, stroke.lineWidth);
        break;
      case "circle":
        Circle.staticDraw(ctx, stroke.x, stroke.y, stroke.radius, stroke.strokeStyle, stroke.lineWidth);
        break;
      case "line":
        Line.staticDraw(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.strokeStyle, stroke.lineWidth);
        break;
      case "arrow":
        Arrow.staticDraw(ctx, stroke.x1, stroke.y1, stroke.x2, stroke.y2, stroke.strokeStyle, stroke.lineWidth, stroke.opacity);
        break;
      case "polygon":
        Polygon.staticDraw(ctx, stroke.points, stroke.strokeStyle, stroke.lineWidth, stroke.opacity);
        break;
      case "text":
        Text.staticDraw(ctx, stroke.x, stroke.y, stroke.text, stroke.fontSize, stroke.fontFamily, stroke.strokeStyle, stroke.width || 200, stroke.opacity ?? 1);
        break;
      case "fill":
        Fill.staticDraw(ctx, stroke.x, stroke.y, stroke.fillColor);
        break;
      case "fill_image":
        ctx.putImageData(stroke.imageData, 0, 0);
        break;
      default:
        break;
    }
    
    ctx.restore();
  }

  /**
   * Render brush/eraser stroke
   */
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

  /**
   * Rebuild buffer from stroke list
   */
  rebuildBuffer(strokes) {
    if (!this.bufferCtx) return;
    
    this.bufferCtx.clearRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    this.bufferCtx.fillStyle = "white";
    this.bufferCtx.fillRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    this.bufferCtx.globalCompositeOperation = "source-over";
    
    strokes.forEach(stroke => this.drawStroke(this.bufferCtx, stroke));
  }

  /**
   * Redraw main canvas from buffer
   */
  redraw() {
    if (!this.ctx || !this.bufferCanvas) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.drawImage(this.bufferCanvas, 0, 0);
    
    if (this.showGrid) {
      this.drawGrid();
    }
  }

  /**
   * Draw grid overlay
   */
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

  /**
   * Toggle grid visibility
   */
  toggleGrid() {
    this.showGrid = !this.showGrid;
    this.redraw();
    this.emit('gridToggled', { showGrid: this.showGrid });
  }

  /**
   * Set zoom level
   */
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

  // Event system
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
          console.error(`Error in ${event} listener:`, error);
        }
      }
    });
  }
}

export default new CanvasService();
