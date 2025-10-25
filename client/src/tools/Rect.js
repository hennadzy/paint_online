import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Rect extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeColor = "#000000";
    this.lineWidth = 1;
    this.startX = 0;
    this.startY = 0;
    this.width = 0;
    this.height = 0;
    this.mouseDown = false;
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
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.onmouseup = null;
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
    this.width = x - this.startX;
    this.height = y - this.startY;

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();

    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.strokeRect(this.startX, this.startY, this.width, this.height);
    ctx.restore();
  }

  mouseUpHandler() {
    this.mouseDown = false;

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
