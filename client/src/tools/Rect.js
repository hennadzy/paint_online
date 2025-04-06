import Tool from "./Tool";

export default class Rect extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;
    this.destroyEvents();
    this.listen();
  }

  listen() {
    // Обработчики событий для мыши
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);

    // Обработчики сенсорных событий
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchend", this.touchEndHandler.bind(this), { passive: false });
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    const rectArea = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rectArea.left;
    this.startY = e.clientY - rectArea.top;

    // Сохраняем текущее состояние холста для превью
    this.saved = this.canvas.toDataURL();
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rectArea = this.canvas.getBoundingClientRect();
      const currentX = e.clientX - rectArea.left;
      const currentY = e.clientY - rectArea.top;
      this.width = currentX - this.startX;
      this.height = currentY - this.startY;
      this.previewRect(this.startX, this.startY, this.width, this.height);
    }
  }

  mouseUpHandler() {
    this.mouseDown = false;
    this.sendRect();
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    const rectArea = this.canvas.getBoundingClientRect();
    this.startX = e.touches[0].clientX - rectArea.left;
    this.startY = e.touches[0].clientY - rectArea.top;
    this.saved = this.canvas.toDataURL();
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (this.mouseDown) {
      const rectArea = this.canvas.getBoundingClientRect();
      const currentX = e.touches[0].clientX - rectArea.left;
      const currentY = e.touches[0].clientY - rectArea.top;
      this.width = currentX - this.startX;
      this.height = currentY - this.startY;
      this.previewRect(this.startX, this.startY, this.width, this.height);
    }
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    this.sendRect();
  }

  // Отрисовка превью прямоугольника («портрет»)
  previewRect(x, y, width, height) {
    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      // Очищаем холст и восстанавливаем сохранённое изображение
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      // Отрисовываем прямоугольное превью
      this.ctx.beginPath();
      this.ctx.rect(x, y, width, height);
      this.ctx.fill();
      this.ctx.stroke();
    };
  }

  // Отправка данных окончательного прямоугольника через WebSocket
  sendRect() {
    // Финальная отрисовка на локальном холсте
    Rect.staticDraw(
      this.ctx,
      this.startX,
      this.startY,
      this.width,
      this.height,
      this.ctx.fillStyle,
      this.ctx.lineWidth,
      this.ctx.strokeStyle
    );
    if (this.socket) {
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          figure: {
            type: "rect",
            x: this.startX,
            y: this.startY,
            width: this.width,
            height: this.height,
            fillStyle: this.ctx.fillStyle,
            lineWidth: this.ctx.lineWidth,
            strokeStyle: this.ctx.strokeStyle,
          },
        })
      );
      // Отправляем сообщение о завершении рисования
      this.socket.send(
        JSON.stringify({
          method: "draw",
          id: this.id,
          figure: { type: "finish" },
        })
      );
    }
  }

  // Статический метод для окончательной отрисовки прямоугольника
  static staticDraw(ctx, x, y, width, height, fillStyle, lineWidth, strokeStyle) {
    ctx.fillStyle = fillStyle;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fill();
    ctx.stroke();
  }
}
