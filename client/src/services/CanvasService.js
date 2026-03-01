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
      // Для изображений используем асинхронную загрузку
      return this.drawImagePlaceholder(ctx, stroke);
  }
  
  ctx.restore();
  return Promise.resolve();
}

drawImagePlaceholder(ctx, stroke) {
  const { x, y, width, height, imageData } = stroke;
  
  if (!imageData) return Promise.resolve();
  
  // Check if imageData is a data URL (new format) or old raw pixel format
  if (typeof imageData === 'string' && imageData.startsWith('data:')) {
    // New format: data URL - use async loading with cached image
    return this.loadImageForStroke(stroke, ctx);
  }
  
  // Old format: raw pixel data (for backward compatibility)
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

// Cache for loaded images to avoid reloading
imageCache = new Map();

loadImageForStroke(stroke, ctx) {
  const { x, y, width, height, imageData } = stroke;
  const dataUrl = imageData;
  
  // Check cache first
  if (this.imageCache.has(dataUrl)) {
    const img = this.imageCache.get(dataUrl);
    if (img.complete && img.naturalWidth !== 0) {
      ctx.drawImage(img, x, y, width, height);
      return Promise.resolve(); // Image already loaded
    } else {
      // Image in cache but still loading - wait for it
      return new Promise((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, x, y, width, height);
          resolve();
        };
        img.onerror = () => resolve(); // Resolve anyway to continue
      });
    }
  }
  
  // Load image asynchronously
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      this.imageCache.set(dataUrl, img);
      ctx.drawImage(img, x, y, width, height);
      resolve();
    };
    img.onerror = () => {
      // If image fails to load, draw a placeholder rectangle
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(x, y, width, height);
      ctx.strokeStyle = '#999999';
      ctx.strokeRect(x, y, width, height);
      resolve(); // Resolve anyway to continue
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

  rebuildBuffer(strokes, callback) {
    if (!this.bufferCtx) return;
    
    this.bufferCtx.clearRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    this.bufferCtx.fillStyle = "white";
    this.bufferCtx.fillRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
    this.bufferCtx.globalCompositeOperation = "source-over";
    
    // Separate image strokes from other strokes
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
    
    // Draw all non-image strokes synchronously
    otherStrokes.forEach(stroke => this.drawStroke(this.bufferCtx, stroke));
    
    // If no image strokes, we're done
    if (imageStrokes.length === 0) {
      this.redraw();
      if (callback) callback();
      return;
    }
    
    // Load images and draw when ready
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
      
      // Check cache first
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
