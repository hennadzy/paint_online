import Tool from "./Tool";
import canvasState from "../store/canvasState";

export default class Circle extends Tool {
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
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.startX = e.pageX - this.canvas.offsetLeft;
    this.startY = e.pageY - this.canvas.offsetTop;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.saved = this.canvas.toDataURL();
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    this.currentX = e.pageX - this.canvas.offsetLeft;
    this.currentY = e.pageY - this.canvas.offsetTop;
    this.drawPreview();
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    const touch = e.touches[0];
    this.startX = touch.pageX - this.canvas.offsetLeft;
    this.startY = touch.pageY - this.canvas.offsetTop;
    this.currentX = this.startX;
    this.currentY = this.startY;
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
    if (!this.saved) return;

    const radius = Math.sqrt(
      Math.pow(this.currentX - this.startX, 2) + Math.pow(this.currentY - this.startY, 2)
    );

    const img = new Image();
    img.src = this.saved;
    img.onload = () => {
      const ctx = this.canvas.getContext("2d");
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

      ctx.beginPath();
      ctx.strokeStyle = this.strokeStyle;
      ctx.lineWidth = this.lineWidth;
      ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    };
  }

  commitStroke() {
    if (this._hasCommitted || !this.saved) return;
    this._hasCommitted = true;

    const radius = Math.sqrt(
      Math.pow(this.currentX - this.startX, 2) + Math.pow(this.currentY - this.startY, 2)
    );

    const stroke = {
      type: "circle",
      x: this.startX,
      y: this.startY,
      radius,
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
