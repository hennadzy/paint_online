import toolState from "../store/toolState";

export default class Tool {
  constructor(canvas, socket, id, username) {
    this.canvas = canvas;
    this.socket = socket;
    this.id = id;
    this.username = username;
    this.ctx = canvas.getContext("2d");

    // ✅ Устанавливаем настройки по умолчанию
    this.color = toolState.color;
    this.strokeColor = toolState.color;
    this.fillColor = toolState.color;
    this.lineWidth = toolState.lineWidth || 1;

    this.mouseDown = false;
  }

  // ✅ Очищаем события, включая addEventListener
  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmouseup = null;
    this.canvas.onmousemove = null;
    this.canvas.ontouchstart = null;
    this.canvas.ontouchmove = null;
    this.canvas.ontouchend = null;

    if (typeof this.removeTouchEvents === "function") {
      this.removeTouchEvents();
    }
  }
}
