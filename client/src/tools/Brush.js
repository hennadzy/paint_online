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
    const { x, y } = this.getCoords(e);
    this.ctx = canvasState.currentLayer.getContext("2d");
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.points.push({ x, y });
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;
    const { x, y } = this.getCoords(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.points.push({ x, y });
  }

  mouseUpHandler() {
    this.mouseDown = false;
    this.sendStroke();
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    this.points = [];
    const { x, y } = this.getCoords(e.touches[0]);
    this.ctx = canvasState.currentLayer.getContext("2d");
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.points.push({ x, y });
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const { x, y } = this.getCoords(e.touches[0]);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.points.push({ x, y });
  }

  touchEndHandler() {
    this.mouseDown = false;
    this.sendStroke();
  }

  getCoords(e) {
    const rect = canvasState.currentLayer.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  sendStroke() {
    if (!this.socket || this.points.length === 0) return;
    const stroke = {
      type: "brush",
      points: this.points,
      color: this.strokeColor,
      width: this.lineWidth
    };
    this.socket.send(JSON.stringify({
      method: "draw",
      id: this.id,
      username: this.username,
      stroke
    }));
  }
}
