import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Circle extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeColor = "#000000";
    this.lineWidth = 1;
    this.startX = 0;
    this.startY = 0;
    this.radius = 0;
    this.mouseDown = false;

    this.boundTouchStart = this.touchStartHandler.bind(this);
    this.boundTouchMove = this.touchMoveHandler.bind(this);
    this.boundTouchEnd = this.touchEndHandler.bind(this);

    makeAutoObservable(this);
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  setStrokeColor(color) {
    this.strokeColor = color;
  }

  listen() {
    this.canvas.onmousedown = this.mouseDownHandler.bind(this);
    this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
    this.canvas.onmouseup = this.mouseUpHandler.bind(this);

    this.canvas.addEventListener("touchstart", this.boundTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.boundTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this.boundTouchEnd, { passive: false });
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.onmouseup = null;

    this.canvas.removeEventListener("touchstart", this.boundTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundTouchMove);
    this.canvas.removeEventListener("touchend", this.boundTouchEnd);
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this.startX = e.pageX - this.canvas.offsetLeft;
    this.startY = e.pageY - this.canvas.offsetTop;
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;
    const x = e.pageX - this.canvas.offsetLeft;
    const y = e.pageY - this.canvas.offsetTop;
    this.radius = Math.sqrt((x - this.startX) ** 2 + (y - this.startY) ** 2);

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.arc(this.startX, this.startY, this.radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  mouseUpHandler() {
    this.mouseDown = false;
    this.commitStroke();
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    const touch = e.touches[0];
    this.startX = touch.pageX - this.canvas.offsetLeft;
    this.startY = touch.pageY - this.canvas.offsetTop;
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const touch = e.touches[0];
    const x = touch.pageX - this.canvas.offsetLeft;
    const y = touch.pageY - this.canvas.offsetTop;
    this.radius = Math.sqrt((x - this.startX) ** 2 + (y - this.startY) ** 2);

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.arc(this.startX, this.startY, this.radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;

    if (this.radius === 0) {
      const touch = e.changedTouches[0];
      const x = touch.pageX - this.canvas.offsetLeft;
      const y = touch.pageY - this.canvas.offsetTop;
      this.radius = Math.sqrt((x - this.startX) ** 2 + (y - this.startY) ** 2);
    }

    this.commitStroke();
  }

  commitStroke() {
    const stroke = {
      type: "circle",
      x: this.startX,
      y: this.startY,
      radius: this.radius,
      strokeStyle: this.strokeColor,
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
  }

  static staticDraw(ctx, x, y, radius, strokeStyle, lineWidth) {
    ctx.save();
    ctx.strokeStyle = strokeStyle || "#000000";
    ctx.lineWidth = lineWidth || 1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }
}
