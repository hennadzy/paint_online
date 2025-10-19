import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeColor = "#000000";
    this.lineWidth = 1;
    this.mouseDown = false;
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
  console.log("Brush.listen called"); // ← проверка, что метод вызван

  this.canvas.onmousedown = (e) => {
    console.log("mousedown attached"); // ← проверка, что событие привязано
    this.mouseDownHandler(e);
  };

  this.canvas.onmousemove = (e) => {
    console.log("mousemove attached"); // ← проверка, что событие привязан
    this.mouseMoveHandler(e);
  };

  this.canvas.onmouseup = (e) => {
    console.log("mouseup attached"); // ← проверка, что событие привязан
    this.mouseUpHandler(e);
  };

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
      console.log("mouseDownHandler triggered"); // ← должен появиться при клике
    this.mouseDown = true;
    canvasState.pushToUndo(this.canvas.toDataURL());

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);

    this.sendDrawData(x, y, true);
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.sendDrawData(x, y, false);
  }

  mouseUpHandler() {
  console.log("mouseUpHandler triggered"); // ← должен появиться при отпускании мыши
    this.mouseDown = false;

    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        figure: { type: "finish" }
      }));
    }
      this.ctx.beginPath();

  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    canvasState.pushToUndo(this.canvas.toDataURL());

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);

    this.sendDrawData(x, y, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    this.sendDrawData(x, y, false);
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;

    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        figure: { type: "finish" }
      }));
    }
      this.ctx.beginPath();
  }

  sendDrawData(x, y, isStart = false, isLocal = true) {
    const strokeStyle = this.strokeColor;
    const lineWidth = this.lineWidth;

    if (isLocal) {
      Brush.staticDraw(this.ctx, x, y, lineWidth, strokeStyle, isStart);
    }

    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: {
          type: "brush",
          x,
          y,
          lineWidth,
          strokeStyle,
          isStart,
          username: this.username
        }
      }));
    }
  }

static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart = false) {
  console.log("staticDraw", { isStart, x, y }); // ← проверка, что рисование происходит

  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = strokeStyle;
  ctx.lineCap = "round";

  if (isStart) {
    ctx.beginPath();
    ctx.moveTo(x, y);
  } else {
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}
  
}
