import Tool from "./Tool";
import toolState from "../store/toolState"; // если у вас есть глобальное состояние для цвета

export default class Rect extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    // Если у вас отдельно задают цвет заливки, его можно сохранить сюда:
    this.fillColor = toolState.fillColor || this.ctx.strokeStyle; 
    this.mouseDown = false;
    // Привяжем функции для сенсорных событий, чтобы потом корректно их удалить
    this._touchStartHandler = this.touchStartHandler.bind(this);
    this._touchMoveHandler = this.touchMoveHandler.bind(this);
    this._touchEndHandler = this.touchEndHandler.bind(this);
    this.destroyEvents();
    this.listen();
  }

  destroyEvents() {
    // Убираем обычные обработчики
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.onmouseup = null;
    // Убираем обработчики сенсорных событий (используем сохранённые ссылки)
    this.canvas.removeEventListener("touchstart", this._touchStartHandler);
    this.canvas.removeEventListener("touchmove", this._touchMoveHandler);
    this.canvas.removeEventListener("touchend", this._touchEndHandler);
  }

  listen() {
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
    this.canvas.addEventListener("touchstart", this._touchStartHandler, { passive: false });
    this.canvas.addEventListener("touchmove", this._touchMoveHandler, { passive: false });
    this.canvas.addEventListener("touchend", this._touchEndHandler, { passive: false });
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
      // Выполняем предварительную отрисовку прямоугольника
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

  // Предварительный просмотр: восстанавливаем сохранённое изображение и рисуем прямоугольник
  previewRect(x, y, width, height) {
    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      // Очищаем холст полностью и восстанавливаем сохранённое изображение
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
      // Отрисовываем прямоугольник
      this.ctx.beginPath();
      this.ctx.rect(x, y, width, height);
      // Используем выбранный цвет заливки (если он установлен)
      const fillColor = this.fillColor || this.ctx.strokeStyle;
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
      this.ctx.stroke();
    };
  }

  // Отправка окончательных данных прямоугольника
  sendRect() {
    // Финальные отрисовка локально – ставим окончательный прямоугольник и сбрасываем путь
    Rect.staticDraw(
      this.ctx,
      this.startX,
      this.startY,
      this.width,
      this.height,
      // this.fillColor, // именно выбранный цвет заливки
      this.ctx.lineWidth,
      this.ctx.strokeStyle
    );
    // Немедленно сбрасываем текущий путь, чтобы не осталось предыдущей линии кисти
    this.ctx.beginPath();

    // Отправляем данные через WebSocket
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
          // fillStyle: this.fillColor,
          lineWidth: this.ctx.lineWidth,
          strokeStyle: this.ctx.strokeStyle,
        },
      }));
      // Сообщение о завершении отрисовки
      this.socket.send(JSON.stringify({ method: "draw", id: this.id, figure: { type: "finish" } }));
    }
  }

  // Статическая функция для финальной отрисовки прямоугольника
  static staticDraw(ctx, x, y, width, height, fillStyle, lineWidth, strokeStyle) {
    ctx.fillStyle = fillStyle || strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.fill();
    ctx.stroke();
  }
}
