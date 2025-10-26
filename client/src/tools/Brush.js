import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeColor = "#000000";
    this.lineWidth = 1;
    this.points = [];
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
    this.canvas.addEventListener("touchstart", this.touchStartHandler.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler.bind(this), { passive: false });

    this.listenGlobalEndEvents(); // ✅ из Tool.js
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.removeEventListener("touchstart", this.touchStartHandler);
    this.canvas.removeEventListener("touchmove", this.touchMoveHandler);

    this.removeGlobalEndEvents(); // ✅ из Tool.js
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];

    const x = e.pageX - this.canvas.offsetLeft;
    const y = e.pageY - this.canvas.offsetTop;
    this.points.push({ x, y });
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    const x = e.pageX - this.canvas.offsetLeft;
    const y = e.pageY - this.canvas.offsetTop;
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

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    this._hasCommitted = false;
    canvasState.isDrawing = true;
    this.points = [];

    const touch = e.touches[0];
    const x = touch.pageX - this.canvas.offsetLeft;
    const y = touch.pageY - this.canvas.offsetTop;
    this.points.push({ x, y });
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const touch = e.touches[0];
    const x = touch.pageX - this.canvas.offsetLeft;
    const y = touch.pageY - this.canvas.offsetTop;
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
