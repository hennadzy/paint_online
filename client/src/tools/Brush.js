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
    this._touchStartHandler = this.touchStartHandler.bind(this);
    this._touchMoveHandler = this.touchMoveHandler.bind(this);
    this._touchEndHandler = this.touchEndHandler.bind(this);
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

    this.canvas.addEventListener("touchstart", this._touchStartHandler, { passive: false });
    this.canvas.addEventListener("touchmove", this._touchMoveHandler, { passive: false });
    this.canvas.addEventListener("touchend", this._touchEndHandler, { passive: false });
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.onmouseup = null;

    this.canvas.removeEventListener("touchstart", this._touchStartHandler);
    this.canvas.removeEventListener("touchmove", this._touchMoveHandler);
    this.canvas.removeEventListener("touchend", this._touchEndHandler);
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this.points = [];

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.drawLocally(x, y);
    this.points.push({ x, y });

    this.sendDrawData(x, y, true);
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.drawLocally(x, y);
    this.points.push({ x, y });

    this.sendDrawData(x, y, false);
  }

  mouseUpHandler() {
    this.mouseDown = false;

    if (this.points.length > 0) {
      canvasState.addUserAction({
        type: "brush",
        strokeStyle: this.strokeColor,
        lineWidth: this.lineWidth,
        points: [...this.points],
        author: this.username,
      });
    }

    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        figure: { type: "finish" },
        username: this.username,
      }));
    }

    this.points = [];
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    this.points = [];

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    this.drawLocally(x, y);
    this.points.push({ x, y });

    this.sendDrawData(x, y, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    this.drawLocally(x, y);
    this.points.push({ x, y });

    this.sendDrawData(x, y, false);
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;

    if (this.points.length > 0) {
      canvasState.addUserAction({
        type: "brush",
        strokeStyle: this.strokeColor,
        lineWidth: this.lineWidth,
        points: [...this.points],
        author: this.username,
      });
    }

    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        figure: { type: "finish" },
        username: this.username,
      }));
    }

    this.points = [];
  }

  sendDrawData(x, y, isStart = false) {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: {
          type: "brush",
          x,
          y,
          strokeStyle: this.strokeColor,
          lineWidth: this.lineWidth,
          isStart,
        },
      }));
    }
  }

  drawLocally(x, y) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    if (this.points.length === 0) {
      ctx.moveTo(x, y);
      ctx.lineTo(x + 0.01, y + 0.01);
    } else {
      const last = this.points[this.points.length - 1];
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}
