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
    canvasState.pushToUndo(this.layer.toDataURL());

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.layerCtx.strokeStyle = this.strokeColor;
    this.layerCtx.lineWidth = this.lineWidth;

    this.drawLocally(x, y, true);
    this.sendDrawData(x, y, true);
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.drawLocally(x, y, false);
    this.sendDrawData(x, y, false);
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
    canvasState.pushToUndo(this.layer.toDataURL());

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    this.layerCtx.strokeStyle = this.strokeColor;
    this.layerCtx.lineWidth = this.lineWidth;

    this.drawLocally(x, y, true);
    this.sendDrawData(x, y, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    this.drawLocally(x, y, false);
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

    if (window._localUserState) {
      delete window._localUserState[this.username];
    }
  }

  sendDrawData(x, y, isStart = false) {
    const strokeStyle = this.strokeColor;
    const lineWidth = this.lineWidth;

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

  drawLocally(x, y, isStart = false) {
    const ctx = this.layerCtx;
    const username = this.username;
    const strokeStyle = this.strokeColor;
    const lineWidth = this.lineWidth;

    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (!window._localUserState) window._localUserState = {};

    if (isStart || !window._localUserState[username]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      window._localUserState[username] = { isDrawing: true, lastX: x, lastY: y };
    } else {
      const userState = window._localUserState[username];
      ctx.beginPath();
      ctx.moveTo(userState.lastX, userState.lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      window._localUserState[username] = { isDrawing: true, lastX: x, lastY: y };
    }

    ctx.restore();
  }
}
