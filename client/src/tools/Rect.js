import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Rect extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.startX = 0;
    this.startY = 0;
    this.saved = null;
    this.strokeStyle = "#000000";
    this.lineWidth = 1;
  }

  setStrokeColor(color) {
    this.strokeStyle = color;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });

    this.listenGlobalEndEvents();
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.removeEventListener("touchstart", this.touchStartHandler);
    this.canvas.removeEventListener("touchmove", this.touchMoveHandler);

    this.removeGlobalEndEvents();
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    canvasState.isDrawing = true;
    this.startX = e.pageX - this.canvas.offsetLeft;
    this.startY = e.pageY - this.canvas.offsetTop;
    this.saved = this.canvas.toDataURL();
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    const x = e.pageX - this.canvas.offsetLeft;
    const y = e.pageY - this.canvas.offsetTop;
    const width = x - this.startX;
    const height = y - this.startY;

    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      const ctx = this.canvas.getContext("2d");
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

      ctx.beginPath();
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineWidth = this.lineWidth;
      ctx.rect(this.startX, this.startY, width, height);
      ctx.stroke();
    };
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    canvasState.isDrawing = true;
    const touch = e.touches[0];
    this.startX = touch.pageX - this.canvas.offsetLeft;
    this.startY = touch.pageY - this.canvas.offsetTop;
    this.saved = this.canvas.toDataURL();
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const touch = e.touches[0];
    const x = touch.pageX - this.canvas.offsetLeft;
    const y = touch.pageY - this.canvas.offsetTop;
    const width = x - this.startX;
    const height = y - this.startY;

    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      const ctx = this.canvas.getContext("2d");
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

      ctx.beginPath();
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineWidth = this.lineWidth;
      ctx.rect(this.startX, this.startY, width, height);
      ctx.stroke();
    };
  }

  commitStroke() {
    canvasState.isDrawing = false;

    const x = this.startX;
    const y = this.startY;
    const width = this.lastX - this.startX;
    const height = this.lastY - this.startY;

    const stroke = {
      type: "rect",
      x,
      y,
      width,
      height,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      username: this.username
    };

    canvasState.pushStroke(stroke);

    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: stroke
      }));
    }

    this.mouseDown = false;
  }

  get lastX() {
    return this.canvas.width; // fallback if not set
  }

  get lastY() {
    return this.canvas.height;
  }
}
