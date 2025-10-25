import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeColor = "#000000";
    this.lineWidth = 1;
    this.mouseDown = false;
    this.points = [];

    this.boundTouchStart = this.touchStartHandler.bind(this);
    this.boundTouchMove = this.touchMoveHandler.bind(this);
    this.boundTouchEnd = this.touchEndHandler.bind(this);
    this.boundMouseUp = this.mouseUpHandler.bind(this);
    this.boundMouseLeave = this.handleExit.bind(this);
    this.boundTouchCancel = this.handleExit.bind(this);

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

    this.canvas.addEventListener("touchstart", this.boundTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this.boundTouchMove, { passive: false });

    window.addEventListener("mouseup", this.boundMouseUp);
    window.addEventListener("touchend", this.boundTouchEnd, { passive: false });

    this.canvas.addEventListener("mouseleave", this.boundMouseLeave);
    this.canvas.addEventListener("touchcancel", this.boundTouchCancel, { passive: false });
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;

    this.canvas.removeEventListener("touchstart", this.boundTouchStart);
    this.canvas.removeEventListener("touchmove", this.boundTouchMove);

    window.removeEventListener("mouseup", this.boundMouseUp);
    window.removeEventListener("touchend", this.boundTouchEnd);

    this.canvas.removeEventListener("mouseleave", this.boundMouseLeave);
    this.canvas.removeEventListener("touchcancel", this.boundTouchCancel);
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this.points = [];
    canvasState.isDrawing = true;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.points.push({ x, y });
  }

  mouseMoveHandler(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || y < 0 || x > this.canvas.width || y > this.canvas.height) {
      if (this.mouseDown) this.mouseUpHandler();
      return;
    }

    // Если мышь удерживается, но stroke завершён — начать новый
    if (e.buttons === 1 && !this.mouseDown) {
      this.mouseDownHandler(e);
    }

    if (!this.mouseDown) return;

    this.points.push({ x, y });

    const ctx = this.canvas.getContext("2d");
    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const len = this.points.length;
    if (len >= 2) {
      ctx.moveTo(this.points[len - 2].x, this.points[len - 2].y);
      ctx.lineTo(this.points[len - 1].x, this.points[len - 1].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  mouseUpHandler() {
    if (!this.mouseDown) return;
    this.mouseDown = false;
    canvasState.isDrawing = false;
    this.commitStroke();
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    this.points = [];
    canvasState.isDrawing = true;

    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.points.push({ x, y });
  }

  touchMoveHandler(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (x < 0 || y < 0 || x > this.canvas.width || y > this.canvas.height) {
      if (this.mouseDown) this.touchEndHandler(e);
      return;
    }

    // Если палец удерживается, но stroke завершён — начать новый
    if (e.touches.length > 0 && !this.mouseDown) {
      this.touchStartHandler(e);
      return;
    }

    if (!this.mouseDown) return;

    this.points.push({ x, y });

    const ctx = this.canvas.getContext("2d");
    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const len = this.points.length;
    if (len >= 2) {
      ctx.moveTo(this.points[len - 2].x, this.points[len - 2].y);
      ctx.lineTo(this.points[len - 1].x, this.points[len - 1].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  touchEndHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    this.mouseDown = false;
    canvasState.isDrawing = false;
    this.commitStroke();
  }

  handleExit() {
    if (!this.mouseDown) return;
    this.mouseDown = false;
    canvasState.isDrawing = false;
    this.commitStroke();
  }

  commitStroke() {
    if (this.points.length === 0) return;

    const stroke = {
      type: "brush",
      points: this.points,
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

    this.points = [];
  }
}
