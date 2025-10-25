import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Rect extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
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
    window.addEventListener("mousemove", this.mouseMoveHandler.bind(this));
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });

    this.listenGlobalEndEvents();
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    window.removeEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.removeEventListener("touchstart", this.touchStartHandler);
    this.canvas.removeEventListener("touchmove", this.touchMoveHandler);

    this.removeGlobalEndEvents();
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    canvasState.isDrawing = true;
    if (e.type === 'mousedown') {
      const rect = this.canvas.getBoundingClientRect();
      this.startX = e.clientX - rect.left;
      this.startY = e.clientY - rect.top;
    } else {
      this.startX = e.pageX - this.canvas.offsetLeft;
      this.startY = e.pageY - this.canvas.offsetTop;
    }
    this.saved = this.canvas.toDataURL();
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    let x, y;
    if (e.type === 'mousemove') {
      const rect = this.canvas.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    } else {
      x = e.pageX - this.canvas.offsetLeft;
      y = e.pageY - this.canvas.offsetTop;
    }
    this.currentX = x;
    this.currentY = y;

    this.drawPreview();
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
    this.currentX = touch.pageX - this.canvas.offsetLeft;
    this.currentY = touch.pageY - this.canvas.offsetTop;

    this.drawPreview();
  }

  drawPreview() {
    const width = this.currentX - this.startX;
    const height = this.currentY - this.startY;

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
    if (!this.saved) return;

    const width = this.currentX - this.startX;
    const height = this.currentY - this.startY;

    const stroke = {
      type: "rect",
      x: this.startX,
      y: this.startY,
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
    canvasState.isDrawing = false;
    this.saved = null;
  }
}
