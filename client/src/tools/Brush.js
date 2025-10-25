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
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.onmouseup = null;

    this.canvas.removeEventListener("touchstart", this.touchStartHandler);
    this.canvas.removeEventListener("touchmove", this.touchMoveHandler);
    this.canvas.removeEventListener("touchend", this.touchEndHandler);
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this.points = [];
    const ctx = this.canvas.getContext("2d");
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const x = e.pageX - e.target.offsetLeft;
    const y = e.pageY - e.target.offsetTop;
    ctx.moveTo(x, y);
    this.points.push({ x, y });
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;
    const ctx = this.canvas.getContext("2d");
    const x = e.pageX - e.target.offsetLeft;
    const y = e.pageY - e.target.offsetTop;
    ctx.lineTo(x, y);
    ctx.stroke();
    this.points.push({ x, y });
  }

  mouseUpHandler() {
    this.mouseDown = false;
    const stroke = {
      type: "brush",
      points: this.points,
      strokeStyle: this.strokeColor,
      lineWidth: this.lineWidth
    };

    canvasState.pushStroke(stroke);

    if (this.socket && this.points.length > 0) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: stroke
      }));
    }
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    this.points = [];
    const touch = e.touches[0];
    const x = touch.clientX - this.canvas.offsetLeft;
    const y = touch.clientY - this.canvas.offsetTop;
    const ctx = this.canvas.getContext("2d");
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    this.points.push({ x, y });
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const touch = e.touches[0];
    const x = touch.clientX - this.canvas.offsetLeft;
    const y = touch.clientY - this.canvas.offsetTop;
    const ctx = this.canvas.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    this.points.push({ x, y });
  }

  touchEndHandler() {
    this.mouseDown = false;
    const stroke = {
      type: "brush",
      points: this.points,
      strokeStyle: this.strokeColor,
      lineWidth: this.lineWidth
    };

    canvasState.pushStroke(stroke);

    if (this.socket && this.points.length > 0) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: stroke
      }));
    }
  }
}
