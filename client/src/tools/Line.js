
import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Line extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
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
    canvasState.pushToUndo(this.canvas.toDataURL());
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    this.endX = e.clientX - rect.left;
    this.endY = e.clientY - rect.top;
    const ctx = this.ctx;
    canvasState.redrawCanvas();
    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.lineTo(this.endX, this.endY);
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
    const rect = this.canvas.getBoundingClientRect();
    this.startX = touch.clientX - rect.left;
    this.startY = touch.clientY - rect.top;
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    this.endX = touch.clientX - rect.left;
    this.endY = touch.clientY - rect.top;
    const ctx = this.ctx;
    canvasState.redrawCanvas();
    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.lineTo(this.endX, this.endY);
    ctx.stroke();
    ctx.restore();
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    if (this.endX === 0 && this.endY === 0) {
      const touch = e.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.endX = touch.clientX - rect.left;
      this.endY = touch.clientY - rect.top;
    }
    this.commitStroke();
  }

  commitStroke() {
    const stroke = {
      type: "line",
      x1: this.startX,
      y1: this.startY,
      x2: this.endX,
      y2: this.endY,
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

  static staticDraw(ctx, x1, y1, x2, y2, strokeStyle, lineWidth) {
    ctx.save();
    ctx.strokeStyle = strokeStyle || "#000000";
    ctx.lineWidth = lineWidth || 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }
}


