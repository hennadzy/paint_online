class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;
    this.lastTouchMove = Date.now();
    this.websocketReady = false;
    this.messageQueue = [];

    if (this.socket) {
      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.websocketReady = true;

        // Отправляем все сообщения из очереди
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          this.socket.send(message);
        }
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.websocketReady = false;
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket Error: ', error);
      };

      this.socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === "draw" && msg.figure) {
          const { x, y, lineWidth, strokeStyle, isStart } = msg.figure;
          Brush.draw(this.ctx, x, y, lineWidth, strokeStyle, isStart);
        }
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
    const { lineWidth, strokeStyle } = this.ctx;
    const drawData = JSON.stringify({
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
    });
    
    if (this.websocketReady) {
      this.socket.send(drawData);
    } else {
      console.warn("WebSocket not ready. Queueing message.");
      this.messageQueue.push(drawData);
    }
  }

  static draw(ctx, x, y, lineWidth, strokeStyle, isStart = false) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
}