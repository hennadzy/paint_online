import Tool from "./Tool";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;

    this.lastTouchMove = Date.now();
    this.websocketReady = false;

// Очередь для событий рисования
this.drawingQueue = [];

// Новое событие при подключении
if (this.socket) {
  console.log('WebSocket существует');
  
  this.socket.onopen = () => {
    console.log('WebSocket connected');
    this.websocketReady = true;
    
    // Обработать все предыдущие действия
    while (this.drawingQueue.length > 0) {
      const drawArgs = this.drawingQueue.shift();
      this.sendDrawData(...drawArgs);
    }
  };

  this.socket.onclose = () => {
    console.log('WebSocket disconnected');
    this.websocketReady = false;
  };

  this.socket.onerror = (error) => {
    console.error('WebSocket Error: ', error);
  };
}




    this.destroyEvents();
    this.listen();
  }

  listen() {
    // Обработчики для мыши
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);

    // Обработчики для сенсорных событий
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchend", this.touchEndHandler.bind(this), { passive: false });
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    this.sendDrawData(e.clientX - rect.left, e.clientY - rect.top, true, true);
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      this.sendDrawData(e.clientX - rect.left, e.clientY - rect.top, false, true);
    }
  }

  mouseUpHandler() {
    this.mouseDown = false;
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          figure: { type: "finish" },
        })
      );
    }
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.beginPath();
    this.ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
    this.sendDrawData(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, true, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    this.sendDrawData(x, y, false, true);
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          figure: { type: "finish" },
        })
      );
    }
  }
  
  draw(x, y) {
    this.sendDrawData(x, y, false);
  }

  sendDrawData(x, y, isStart = false, isLocal = true) {
    const { lineWidth, strokeStyle } = this.ctx;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      isLocal = false;
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
    console.log('Socket:', this.socket ? 'Connected' : 'Not Connected');
    console.log('isLocal before send:', isLocal);
    if (isLocal) {
      Brush.staticDraw(this.ctx, x, y, lineWidth, strokeStyle, isStart);
    }
  }

  static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart = false) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;

    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}