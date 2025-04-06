import Tool from "./Tool";

export default class Rect extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.mouseDown = false;
    // Удаляем старые обработчики (важно при переключении инструментов)
    this.destroyEvents();
    this.listen();
  }

  destroyEvents() {
    // Удаляем обработчики мыши
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.onmouseup = null;
    // Удаляем обработчики сенсорных событий
    this.canvas.removeEventListener("touchstart", this.touchStartHandler);
    this.canvas.removeEventListener("touchmove", this.touchMoveHandler);
    this.canvas.removeEventListener("touchend", this.touchEndHandler);
  }

  listen() {
    // Назначение обработчиков мыши
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
    // Назначение обработчиков для сенсорных событий
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchend", this.touchEndHandler.bind(this), { passive: false });
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    const rectArea = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rectArea.left;
    this.startY = e.clientY - rectArea.top;
    // Сохраняем текущее состояние холста для предварительного просмотра
    this.saved = this.canvas.toDataURL();
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rectArea = this.canvas.getBoundingClientRect();
      const currentX = e.clientX - rectArea.left;
      const currentY = e.clientY - rectArea.top;
      this.width = currentX - this.startX;
      this.height = currentY - this.startY;
      // Отрисовываем превью прямоугольника без остаточной линии кисти
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

  previewRect(x, y, width, height) {
    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      // Очищаем холст и восстанавливаем сохранённое изображение для полного контроля над отрисовкой
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      // Отрисовываем прямоугольное превью
      this.ctx.beginPath();
      this.ctx.rect(x, y, width, height);
      // Если выбранный цвет заливки не установлен, используем цвет обводки
      const fillColor = this.ctx.fillStyle || this.ctx.strokeStyle;
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
      this.ctx.stroke();
    };
  }

  sendRect() {
    // Финальная отрисовка прямоугольника на локальном холсте
    Rect.staticDraw(
      this.ctx,
      this.startX,
      this.startY,
      this.width,
      this.height,
      this.ctx.fillStyle, // используем выбранный цвет заливки
      this.ctx.lineWidth,
      this.ctx.strokeStyle
    );
    if (this.socket) {
      this.socket.send(JSON.stringify({
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
      }));
      // Отправляем сообщение о завершении отрисовки
      this.socket.send(JSON.stringify({ method: "draw", id: this.id, figure: { type: "finish" } }));
    }
  }

  static staticDraw(ctx, x, y, width, height, fillStyle, lineWidth, strokeStyle) {
    // Если цвет заливки не указан, подставляем цвет обводки
    ctx.fillStyle = fillStyle || strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fill();
    ctx.stroke();
  }
}
