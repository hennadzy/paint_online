import Tool from "./Tool";
import canvasState from "../store/canvasState";
import toolState from "../store/toolState";

export default class Text extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.text = "";
    this.fontSize = 16;
    this.fontFamily = "Arial";
    this.opacity = 1;
    this.borderWidth = 1;
    this.input = null;
    this.isResizing = false;
    this.resizeHandle = null;
    this.handles = [];
    this.startResizeX = 0;
    this.startResizeY = 0;
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.isMoving = false;
    this.startMoveX = 0;
    this.startMoveY = 0;
    this.originalLeft = 0;
    this.originalTop = 0;
    this._isCommitted = false; 
  }

  setLineWidth(width) {
    super.setLineWidth(width);
    this.fontSize = width;
    this.borderWidth = Math.min(5, width);
    if (this.input) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = rect.width / this.canvas.width;
      const displayFontSize = this.fontSize * scaleX;
      this.input.style.fontSize = `${displayFontSize}px`;
      this.input.style.minHeight = `${displayFontSize + 4}px`;
      this.updateHandlePositions();
    }
  }

  setStrokeOpacity(opacity) {
    this.opacity = opacity;
    if (this.input) {
      this.input.style.opacity = this.opacity;
    }
  }

  listen() {
    const ctx = this.canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";

    this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
    this.documentMouseDownBound = this.documentMouseDown.bind(this);

    this.canvas.addEventListener('pointerdown', this.pointerDownHandlerBound);
    document.addEventListener('pointerdown', this.documentMouseDownBound);
  }

  destroyEvents() {
    if (this.input && !this._isCommitted) {
      this.confirmText();
    }
    if (this.pointerDownHandlerBound) {
      this.canvas.removeEventListener('pointerdown', this.pointerDownHandlerBound);
      this.pointerDownHandlerBound = null;
    }
    if (this.documentMouseDownBound) {
      document.removeEventListener('pointerdown', this.documentMouseDownBound);
      this.documentMouseDownBound = null;
    }
    this.removeInput();
    super.destroyEvents();
    for (let handle of this.handles) {
      if (handle.parentElement) {
        handle.parentElement.removeChild(handle);
      }
    }
    this.handles = [];
  }

  pointerDownHandler(e) {
    e.preventDefault();

    if (this.input && this.input.parentElement) {
      this.confirmText();
      return;
    }

    e.stopPropagation();

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this.startX = Math.floor((e.clientX - rect.left) * scaleX);
    this.startY = Math.floor((e.clientY - rect.top) * scaleY);

    this.createInput(e.clientX, e.clientY);
  }

  createInput(clientX, clientY) {
    this.removeInput();
    this._isCommitted = false; 
    toolState.textInputActive = true;
    const rect = this.canvas.getBoundingClientRect();
    const container = this.canvas.parentElement;
    const containerRect = container.getBoundingClientRect();
    const isMobile = window.innerWidth < 768;

    const scaleX = rect.width / this.canvas.width;
    const scaleY = rect.height / this.canvas.height;
    const displayFontSize = this.fontSize * scaleX; 

    this.input = document.createElement('textarea');
    const textBaselineOffset = displayFontSize * 0.8;

    this.input.style.position = 'absolute';
    this.input.style.left = `${clientX - containerRect.left}px`;
    this.input.style.top = `${clientY - containerRect.top - textBaselineOffset}px`;

    this.input.style.fontSize = `${displayFontSize}px`;
    this.input.style.fontFamily = this.fontFamily;
    this.input.style.lineHeight = '1';
    this.input.style.color = this.strokeColor;
    this.input.style.opacity = this.opacity;
    this.input.style.background = 'transparent';
    this.input.style.border = '1px dashed black';
    this.input.style.outline = '1px dashed white';
    this.input.style.outlineOffset = '-2px';
    this.input.style.zIndex = '1000';
    this.input.style.padding = '2px 4px';
    this.input.style.width = `${200 * scaleX}px`; 
    this.input.style.minHeight = `${displayFontSize + 4}px`;
    this.input.style.resize = 'none';
    this.input.style.overflow = 'hidden';
    this.input.style.whiteSpace = 'pre-wrap';
    this.input.style.wordWrap = 'break-word';
    this.input.style.boxSizing = 'border-box';
    this.input.style.cursor = 'crosshair';

    if (container) {
      container.appendChild(this.input);
      this.input.focus();
      this.autoResize();
    }

    this.input.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.input.addEventListener('blur', (e) => {
      if (!this._isResizing && !this.isResizing) {
        this.confirmText();
      }
    });
    this.input.addEventListener('input', this.autoResize.bind(this));
    this.input.addEventListener('mousedown', this.handleMoveDown.bind(this));
    if (isMobile) {
      this.input.addEventListener('touchstart', this.handleMoveDown.bind(this));
    }

    this.handles = [];
    const handleConfigs = [
      { pos: 'nw', cursor: 'nw-resize' },
      { pos: 'ne', cursor: 'ne-resize' },
      { pos: 'sw', cursor: 'sw-resize' },
      { pos: 'se', cursor: 'se-resize' }
    ];
    for (let config of handleConfigs) {
      const handle = document.createElement('div');
      handle.className = 'resize-handle';
      handle.style.position = 'absolute';
      handle.style.width = '6px';
      handle.style.height = '6px';
      handle.style.background = 'white';
      handle.style.border = '1px solid black';
      handle.style.zIndex = '1001';
      handle.style.cursor = config.cursor;
      handle.dataset.pos = config.pos;
      container.appendChild(handle);
      this.handles.push(handle);
      handle.addEventListener('mousedown', this.handleMouseDown.bind(this));
      if (isMobile) {
        handle.addEventListener('touchstart', this.handleMouseDown.bind(this));
      }
    }

    this.updateHandlePositions();
  }

  removeInput() {
    if (this.input) {
      try {
        if (this.input.parentElement) {
          this.input.parentElement.removeChild(this.input);
        }
      } catch (e) {
      }
      this.input = null;
    }
    toolState.textInputActive = false;
    for (let handle of this.handles) {
      if (handle.parentElement) {
        handle.parentElement.removeChild(handle);
      }
    }
    this.handles = [];
  }

  autoResize() {
    if (!this.input) return;
    if (this.isResizing) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / this.canvas.width;
    const displayFontSize = this.fontSize * scaleX;
    this.input.style.height = '0px';
    this.input.style.height = Math.max(this.input.scrollHeight, displayFontSize + 4) + 'px';
    this.updateHandlePositions();
  }

  handleKeyDown(e) {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      this.confirmText();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.removeInput();
    }
  }

  confirmText() {
    if (this.input && !this._isCommitted) { 
      this._isCommitted = true;
      this.text = this.input.value;
      const computedStyle = window.getComputedStyle(this.input);
      const paddingLeft = parseFloat(computedStyle.paddingLeft) || 4;
      const paddingRight = parseFloat(computedStyle.paddingRight) || 4;
      const inputWidth = this.input.clientWidth - paddingLeft - paddingRight;
      
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = rect.width / this.canvas.width;
      const logicalWidth = inputWidth / scaleX;
      
      this.removeInput();
        if (this.text) {
          const stroke = {
            type: "text",
            x: this.startX,
            y: this.startY,
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            strokeStyle: this.strokeColor,
            width: logicalWidth,
            opacity: this.opacity,
            username: this.username
          };
          canvasState.pushStroke(stroke);
          this.saveImage();
          this.sendTextData(this.startX, this.startY, this.text, logicalWidth);
          requestAnimationFrame(() => canvasState.redrawCanvas());
        }
    }
  }

  updateHandlePositions() {
    if (!this.input || !this.handles.length) return;
    const rect = this.input.getBoundingClientRect();
    const containerRect = this.canvas.parentElement.getBoundingClientRect();
    for (let handle of this.handles) {
      const pos = handle.dataset.pos;
      let left, top;
      switch (pos) {
        case 'nw':
          left = rect.left - containerRect.left - 3;
          top = rect.top - containerRect.top - 3;
          break;
        case 'ne':
          left = rect.right - containerRect.left - 3;
          top = rect.top - containerRect.top - 3;
          break;
        case 'sw':
          left = rect.left - containerRect.left - 3;
          top = rect.bottom - containerRect.top - 3;
          break;
        case 'se':
          left = rect.right - containerRect.left - 3;
          top = rect.bottom - containerRect.top - 3;
          break;
      }
      handle.style.left = left + 'px';
      handle.style.top = top + 'px';
    }
  }

  handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.input && !this._isCommitted) {
      this._isResizing = true;
    }
    this.isResizing = true;
    this.resizeHandle = e.target.dataset.pos;
    this.startResizeX = e.clientX || e.touches[0].clientX;
    this.startResizeY = e.clientY || e.touches[0].clientY;
    this.originalWidth = parseFloat(this.input.style.width);
    this.originalHeight = parseFloat(this.input.style.height) || this.input.scrollHeight;
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('touchmove', this.handleMouseMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleMouseUp.bind(this));
  }

  handleMouseMove(e) {
    if (!this.isResizing) return;
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    const dx = clientX - this.startResizeX;
    const dy = clientY - this.startResizeY;
    let newWidth = this.originalWidth;
    let newHeight = this.originalHeight;
    const pos = this.resizeHandle;
    if (pos.includes('e')) newWidth += dx;
    if (pos.includes('w')) newWidth -= dx;
    if (pos.includes('s')) newHeight += dy;
    if (pos.includes('n')) newHeight -= dy;
    
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / this.canvas.width;
    const displayFontSize = this.fontSize * scaleX;
    
    newWidth = Math.max(newWidth, 50 * scaleX);
    newHeight = Math.max(newHeight, displayFontSize + 4);
    this.input.style.width = newWidth + 'px';
    this.input.style.height = newHeight + 'px';
    this.updateHandlePositions();
  }

  handleMouseUp() {
    this.isResizing = false;
    this._isResizing = false;
    this.resizeHandle = null;
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('touchmove', this.handleMouseMove);
    document.removeEventListener('touchend', this.handleMouseUp);
  }

  handleMoveDown(e) {
    if (e.target.classList && e.target.classList.contains('resize-handle')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this.isMoving = true;
    this.startMoveX = e.clientX || e.touches[0].clientX;
    this.startMoveY = e.clientY || e.touches[0].clientY;
    this.originalLeft = parseFloat(this.input.style.left);
    this.originalTop = parseFloat(this.input.style.top);
    document.addEventListener('mousemove', this.handleMoveMove.bind(this));
    document.addEventListener('mouseup', this.handleMoveUp.bind(this));
    document.addEventListener('touchmove', this.handleMoveMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleMoveUp.bind(this));
  }

  handleMoveMove(e) {
    if (!this.isMoving) return;
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    const dx = clientX - this.startMoveX;
    const dy = clientY - this.startMoveY;
    this.input.style.left = (this.originalLeft + dx) + 'px';
    this.input.style.top = (this.originalTop + dy) + 'px';
    this.updateHandlePositions();
    const newLeft = parseFloat(this.input.style.left);
    const newTop = parseFloat(this.input.style.top);
    const canvasRect = this.canvas.getBoundingClientRect();
    const containerRect = this.canvas.parentElement.getBoundingClientRect();
    const scaleX = this.canvas.width / canvasRect.width;
    const scaleY = this.canvas.height / canvasRect.height;
    this.startX = Math.floor((newLeft + containerRect.left - canvasRect.left) * scaleX);
    this.startY = Math.floor((newTop + containerRect.top - canvasRect.top) * scaleY);
  }

  handleMoveUp() {
    this.isMoving = false;
    document.removeEventListener('mousemove', this.handleMoveMove);
    document.removeEventListener('mouseup', this.handleMoveUp);
    document.removeEventListener('touchmove', this.handleMoveMove);
    document.removeEventListener('touchend', this.handleMoveUp);
  }

  drawText(x, y, width = 200) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.fillStyle = this.strokeColor;
    const lines = Text.wrapText(this.text, width, ctx);
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i * this.fontSize);
    }
    ctx.restore();
  }

  sendTextData(x, y, text, width) {
    this.send(JSON.stringify({
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
        strokeStyle: this.strokeColor,
        width: width,
        opacity: this.opacity
      }
    }));
  }

  documentMouseDown(e) {
    if (this.input && this.input.parentElement) {
      const target = e.target;
      const isInputClick = target === this.input || this.input.contains(target);
      const isResizeHandle = target.classList && target.classList.contains('resize-handle');
      const isHandleClick = this.handles.some(handle => handle === target || handle.contains(target));
      
      if (!isInputClick && !isResizeHandle && !isHandleClick) {
        this.confirmText();
      }
    }
  }

  static wrapText(text, maxWidth, ctx) {
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
                charLine = char;
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

  static staticDraw(ctx, x, y, text, fontSize, fontFamily, strokeStyle, width = 200, opacity = 1) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = strokeStyle;
    const lines = Text.wrapText(text, width, ctx);
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + i * fontSize);
    }
    ctx.restore();
  }
}
