import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeColor = "#000000";
    this.lineWidth = 1;
    this.points = [];
    this._skipNextSegment = false;
    this.isOutOfBounds = false;

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
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchend", this.touchEndHandler.bind(this), { passive: false });

    this.listenGlobalEndEvents(); // из Tool.js
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.onmouseup = null;
    this.canvas.removeEventListener("touchstart", this.touchStartHandler);
    this.canvas.removeEventListener("touchmove", this.touchMoveHandler);
    this.canvas.removeEventListener("touchend", this.touchEndHandler);

    this.removeGlobalEndEvents(); // из Tool.js
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.points.push({ x, y });
  }

  mouseMoveHandler(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const outOfBounds = x < 0 || y < 0 || x > this.canvas.width || y > this.canvas.height;

    if (outOfBounds) {
      this.isOutOfBounds = true;
      return;
    }

    if (this.isOutOfBounds && this.mouseDown) {
      this.isOutOfBounds = false;
      this.points = [];
      this.points.push({ x, y });
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

  mouseUpHandler() {
    this.mouseDown = false;
    this.commitStroke();
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];

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

    const outOfBounds = x < 0 || y < 0 || x > this.canvas.width || y > this.canvas.height;

    if (outOfBounds) {
      this.isOutOfBounds = true;
      return;
    }

    if (this.isOutOfBounds && this.mouseDown) {
      this.isOutOfBounds = false;
      this.points = [];
      this.points.push({ x, y });
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
    this.mouseDown = false;
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
    canvasState.isDrawing = false;
  }
}
