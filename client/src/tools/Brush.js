import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeColor = "#000000";
    this.lineWidth = 1;
    this.mouseDown = false;
    this.firstMoveSent = false;

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
    this.firstMoveSent = false;
    canvasState.pushToUndo(this.canvas.toDataURL());

    const { x, y } = this._getCoords(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this._send(x, y, true);
    this.firstMoveSent = true;
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;
    const { x, y } = this._getCoords(e);
    this.ctx.lineTo(x, y);
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = "round";
    this.ctx.stroke();
    this._send(x, y, false);
  }

  mouseUpHandler() {
    this.mouseDown = false;
    this.firstMoveSent = false;
    this._sendFinish();
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    this.firstMoveSent = false;
    canvasState.pushToUndo(this.canvas.toDataURL());

    const { x, y } = this._getCoords(e.touches[0]);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this._send(x, y, true);
    this.firstMoveSent = true;
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const { x, y } = this._getCoords(e.touches[0]);
    this.ctx.lineTo(x, y);
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = "round";
    this.ctx.stroke();
    this._send(x, y, false);
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;
    this.firstMoveSent = false;
    this._sendFinish();
  }

  _getCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  _send(x, y, isStart) {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: {
          type: "brush",
          x,
          y,
          lineWidth: this.lineWidth,
          strokeStyle: this.strokeColor,
          isStart
        }
      }));
    }
  }

  _sendFinish() {
    if (this.socket) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: { type: "finish" }
      }));
    }
  }
}
