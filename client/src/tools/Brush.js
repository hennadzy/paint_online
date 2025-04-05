import Tool from "./Tool";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;
    this.lastTouchMove = Date.now();
    this.websocketReady = false;

    // Настройка WebSocket
    if (this.socket) {
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.websocketReady = true;
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.localDraw(x, y, true);
    this.sendDrawData(x, y, true);
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.localDraw(x, y);
      this.sendDrawData(x, y);
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
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    this.localDraw(x, y, true);
    this.sendDrawData(x, y, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const now = Date.now();
    if (now - this.lastTouchMove < 16) {
      return;
    }
    this.lastTouchMove = now;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;
    this.localDraw(x, y);
    this.sendDrawData(x, y);
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

  localDraw(x, y, isStart = false) {
    const { lineWidth, strokeStyle } = this.ctx;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeStyle = strokeStyle;
    if (isStart) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    } else {
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    }
  }

  sendDrawData(x, y, isStart = false) {
    if (this.websocketReady) {
      const { lineWidth, strokeStyle } = this.ctx;
      const drawData = {
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
        }
      };
      
      console.log("Отправка данных: ", drawData);
      this.socket.send(JSON.stringify(drawData));
    } else {
      console.warn("WebSocket не готов. Данные не отправлены.");
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