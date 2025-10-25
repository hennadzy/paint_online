import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Eraser extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.lineWidth = 10;
    this.mouseDown = false;

    this.boundTouchStart = this.touchStartHandler.bind(this);
    this.boundTouchMove = this.touchMoveHandler.bind(this);
    this.boundTouchEnd = this.touchEndHandler.bind(this);

    makeAutoObservable(this);
  }

  setLineWidth(width) {
    this.lineWidth = width;
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
    canvasState.isDrawing = true;
    this.eraseAt(e.pageX - this.canvas.offsetLeft, e.pageY - this.canvas.offsetTop);
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;
    this.eraseAt(e.pageX - this.canvas.offsetLeft, e.pageY - this.canvas.offsetTop);
  }

  mouseUpHandler(e) {
    this.mouseDown = false;
    canvasState.isDrawing = false;
    this.commitStroke(e.pageX - this.canvas.offsetLeft, e.pageY - this.canvas.offsetTop);
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    canvasState.isDrawing = true;
    const touch = e.touches[0];
    this.eraseAt(touch.pageX - this.canvas.offsetLeft, touch.pageY - this.canvas.offsetTop);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const touch = e.touches[0];
    this.eraseAt(touch.pageX - this.canvas.offsetLeft, touch.pageY - this.canvas.offsetTop);
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    canvasState.isDrawing = false;
    const touch = e.changedTouches[0];
    this.commitStroke(touch.pageX - this.canvas.offsetLeft, touch.pageY - this.canvas.offsetTop);
  }

  eraseAt(x, y) {
    const ctx = this.canvas.getContext("2d");
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    ctx.restore();
  }

  commitStroke(x, y) {
    const stroke = {
      type: "eraser",
      x,
      y,
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
}
