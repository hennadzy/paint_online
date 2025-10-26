import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Rect extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.startX = 0;
    this.startY = 0;
    this.width = 0;
    this.height = 0;
    this.mouseDown = false;
    this.boundTouchStart = this.touchStartHandler.bind(this);
    this.boundTouchMove = this.touchMoveHandler.bind(this);
    this.boundTouchEnd = this.touchEndHandler.bind(this);
    makeAutoObservable(this);
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
    super.destroyEvents();
    this.canvas.removeEventListener("touchstart", this.boundTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundTouchMove);
    this.canvas.removeEventListener("touchend", this.boundTouchEnd);
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.width = x - this.startX;
    this.height = y - this.startY;
    const ctx = this.ctx;
    canvasState.redrawCanvas();
    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.strokeRect(this.startX, this.startY, this.width, this.height);
    ctx.restore();
  }

  mouseUpHandler() {
    this.mouseDown = false;
    this.commitStroke();
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    canvasState.pushToUndo(this.canvas.toDataURL());
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.startX = touch.clientX - rect.left;
    this.startY = touch.clientY - rect.top;
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.width = x - this.startX;
    this.height = y - this.startY;
    const ctx = this.ctx;
    canvasState.redrawCanvas();
    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.strokeRect(this.startX, this.startY, this.width, this.height);
    ctx.restore();
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    if (this.width === 0 && this.height === 0) {
      const touch = e.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      this.width = x - this.startX;
      this.height = y - this.startY;
    }
    this.commitStroke();
  }

  commitStroke() {
    const stroke = {
      type: "rect",
      x: this.startX,
      y: this.startY,
      width: this.width,
      height: this.height,
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

  static staticDraw(ctx, x, y, width, height, strokeStyle, lineWidth) {
    ctx.save();
    ctx.strokeStyle = strokeStyle || "#000000";
    ctx.lineWidth = lineWidth || 1;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }
}

