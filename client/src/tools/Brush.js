import Tool from "./Tool";

export default class Brush extends Tool {
  constructor(canvas, socket, id) {
    super(canvas, socket, id);
    this.mouseDown = false;
    // Для хранения предыдущей точки
    this.lastX = 0;
    this.lastY = 0;
    this.destroyEvents();
    this.listen();
  }

  listen() {
    // Навешиваем обработчики для мыши
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);
    // Навешиваем сенсорные обработчики
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchend", this.touchEndHandler.bind(this), { passive: false });
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    // Сохраняем стартовую точку
    this.lastX = e.clientX - rect.left;
    this.lastY = e.clientY - rect.top;
    // Отправляем точку старта
    this.sendDrawData(this.lastX, this.lastY, true);
  }

  mouseMoveHandler(e) {
    if (this.mouseDown) {
      const rect = this.canvas.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      this.drawSegment(this.lastX, this.lastY, currentX, currentY);
      // Обновляем сохранённые координаты
      this.lastX = currentX;
      this.lastY = currentY;
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
    const touchX = e.touches[0].clientX - rect.left;
    const touchY = e.touches[0].clientY - rect.top;
    this.lastX = touchX;
    this.lastY = touchY;
    this.sendDrawData(touchX, touchY, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    const currentX = e.touches[0].clientX - rect.left;
    const currentY = e.touches[0].clientY - rect.top;
    this.drawSegment(this.lastX, this.lastY, currentX, currentY);
    this.lastX = currentX;
    this.lastY = currentY;
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

  // Рисуем отрезок от (x1, y1) до (x2, y2)
  drawSegment(x1, y1, x2, y2) {
    // Отправляем координаты отрезка
    this.sendDrawData(x1, y1, false, x2, y2);
    // Локальное рисование: начинаем с предыдущей точки, рисуем линию до актуальной
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  // Изменим sendDrawData так, чтобы можно было передавать координаты начала и конца отрезка
  // Если переданы x2, y2 – значит рисуем отрезок, иначе (при старте) только точку
  sendDrawData(x, y, isStart = false, x2 = null, y2 = null) {
    const lineWidth = this.ctx.lineWidth;
    const strokeStyle = this.ctx.strokeStyle;
    const data = {
      method: "draw",
      id: this.id,
      figure: {
        type: "brush",
        lineWidth,
        strokeStyle,
        isStart, // true только при нажатии (фиксируем старт)
        username: this.username,
      },
    };

    if (isStart) {
      // Отправляем только стартовую точку
      data.figure.x = x;
      data.figure.y = y;
    } else {
      // Передаём отрезок от [x,y] до [x2,y2]
      data.figure.x = x;
      data.figure.y = y;
      data.figure.x2 = x2;
      data.figure.y2 = y2;
    }

    if (this.socket) {
      this.socket.send(JSON.stringify(data));
    }
  }

  // Статический метод для отрисовки на стороне других клиентов.
  // Здесь тоже стоит различать два случая: если получаем
  // отрезок от одной точки до другой (для кисти)
  static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart = false, x2 = null, y2 = null) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    if (isStart) {
      // Начало пути, сохраняем стартовую точку
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (x2 != null && y2 != null) {
      // Если получаем координаты отрезка – начинаем новый путь от x,y до x2,y2
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
}