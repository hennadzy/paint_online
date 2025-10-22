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

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;

    this.drawLocally(x, y, true);
    this.sendDrawData(x, y, true);

    canvasState.addAction({
      type: "brush",
      x,
      y,
      color: this.strokeColor,
      lineWidth: this.lineWidth,
      isStart: true,
    });
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.drawLocally(x, y, false);
    this.sendDrawData(x, y, false);

    canvasState.addAction({
      type: "brush",
      x,
      y,
      color: this.strokeColor,
      lineWidth: this.lineWidth,
      isStart: false,
    });
  }

  mouseUpHandler() {
    this.mouseDown = false;

    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        figure: { type: "finish" }
      }));
    }

    if (window._localUserState) {
      delete window._localUserState[this.username];
    }
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;

    this.drawLocally(x, y, true);
    this.sendDrawData(x, y, true);

    canvasState.addAction({
      type: "brush",
      x,
      y,
      color: this.strokeColor,
      lineWidth: this.lineWidth,
      isStart: true,
    });
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    this.drawLocally(x, y, false);
    this.sendDrawData(x, y, false);

    canvasState.addAction({
      type: "brush",
      x,
      y,
      color: this.strokeColor,
      lineWidth: this.lineWidth,
      isStart: false,
    });
  }

  touchEndHandler() {
    this.mouseDown = false;

    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        figure: { type: "finish" }
      }));
    }
  }

  drawLocally(x, y, isStart) {
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    if (isStart) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    } else {
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
    }
  }

  sendDrawData(x, y, isStart) {
    if (!this.socket) return;

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
      }
    }));
  }
}
