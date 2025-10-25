import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Line extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeColor = "#000000";
    this.lineWidth = 1;
    this.startX = 0;
    this.startY = 0;
    this.endX = 0;
    this.endY = 0;
    this.mouseDown = false;
    this.committed = false; // Флаг для предотвращения двойного commit



    makeAutoObservable(this);
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  setStrokeColor(color) {
    this.strokeColor = color;
  }

  listen() {
    this.canvas.onpointerdown = this.pointerDownHandler.bind(this);
    this.canvas.onpointermove = this.pointerMoveHandler.bind(this);
    this.canvas.onpointerup = this.pointerUpHandler.bind(this);
  }

  destroyEvents() {
    this.canvas.onpointerdown = null;
    this.canvas.onpointermove = null;
    this.canvas.onpointerup = null;
  }

  pointerDownHandler(e) {
    this.mouseDown = true;
    this.committed = false; // Сбрасываем флаг при начале рисования
    const rect = this.canvas.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown) return;
    const rect = this.canvas.getBoundingClientRect();
    this.endX = e.clientX - rect.left;
    this.endY = e.clientY - rect.top;

    const ctx = this.canvas.getContext("2d");
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

  pointerUpHandler() {
    this.mouseDown = false;
    this.commitStroke();
  }

  commitStroke() {
    if (this.committed) return; // Предотвращаем двойной commit
    this.committed = true;

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
