export default class Tool {
  constructor(canvas, socket, id) {
    this.canvas = canvas;
    this.socket = socket;
    this.id = id;
    this.ctx = canvas.getContext("2d");

    this.destroyEvents();
    this.listen();
    this.lineWidth = 1; // ✅ Толщина по умолчанию — локальная
  }

  set lineWidth(value) {
    this._lineWidth = value;
    this.ctx.lineWidth = value;
  }

  get lineWidth() {
    return this._lineWidth || 1;
  }

  set strokeStyle(color) {
    this.ctx.strokeStyle = color;
  }

  get strokeStyle() {
    return this.ctx.strokeStyle;
  }

  listen() {
    // Переопределяется в наследниках
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmouseup = null;
    this.canvas.onmousemove = null;
  }
}
