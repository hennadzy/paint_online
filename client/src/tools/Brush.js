import Tool from "./Tool";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;
    this.lastTouchMove = Date.now();
    this.websocketReady = false;

    // Установим обработчики WebSocket
    if (this.socket) {
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.websocketReady = true;
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.websocketReady = false;
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
    this.sendDrawData(e.clientX - rect.left, e.clientY - rect.top, true, !this.websocketReady);
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      this.sendDrawData(e.clientX - rect.left, e.clientY - rect.top, false, !this.websocketReady);
    }
  }

  mouseUpHandler() {
    this.mouseDown = false;
    if (this.websocketReady) {
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
    this.sendDrawData(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, true, !this.websocketReady);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const now = Date.now();
    if (now - this.lastTouchMove < 16) { // Обработка не чаще, чем раз в 16 мс (~60 FPS)
      return;
    }
    this.lastTouchMove = now;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    this.sendDrawData(x, y, false, !this.websocketReady);
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    if (this.websocketReady) {
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

    if (this.websocketReady) {
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

    console.log('isLocal:', isLocal); // Для отладки

    if (isLocal) {
      Brush.staticDraw(this.ctx, x, y, lineWidth,strokeStyle, isStart);
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