import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Circle extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeColor = "#000000";
    this.lineWidth = 1;
    this.startX = 0;
    this.startY = 0;
    this.radius = 0;
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
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.radius = Math.sqrt((x - this.startX) ** 2 + (y - this.startY) ** 2);

    const ctx = this.canvas.getContext("2d");
    canvasState.redrawCanvas();
    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
    ctx.beginPath();
    ctx.arc(this.startX, this.startY, this.radius, 0, 2 * Math.PI);
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
      type: "circle",
      x: this.startX,
      y: this.startY,
      radius: this.radius,
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

  static staticDraw(ctx, x, y, radius, strokeStyle, lineWidth) {
    ctx.save();
    ctx.strokeStyle = strokeStyle || "#000000";
    ctx.lineWidth = lineWidth || 1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }
}

