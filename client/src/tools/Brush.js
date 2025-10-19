import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { makeAutoObservable } from "mobx";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeColor = "#000000";
    this.lineWidth = 1;
    this.mouseDown = false;
    this.currentStroke = null;
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

    // ✅ Генерируем уникальный ID для действия сразу
    const actionId = Date.now() + Math.random() + (this.username || 'local');

    // Начинаем новый мазок
    this.currentStroke = {
      type: "brush",
      strokeStyle: this.strokeColor,
      lineWidth: this.lineWidth,
      points: [{x, y}],
      author: this.username || 'local',
      id: actionId
    };

    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;

    this.drawLocally(x, y, true);
    this.sendDrawData(x, y, true);
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown || !this.currentStroke) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.currentStroke.points.push({x, y});

    this.drawLocally(x, y, false);
    this.sendDrawData(x, y, false);
  }

  mouseUpHandler() {
    this.mouseDown = false;

    // ✅ Сохраняем завершенный мазок в истории
    if (this.currentStroke && this.currentStroke.points.length > 0) {
      canvasState.addUserAction(this.currentStroke);
    }

    this.currentStroke = null;

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: { type: "finish" }
      }));
    }

    if (window._localUserState) {
      delete window._localUserState[this.username || 'local'];
    }
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    // ✅ Генерируем уникальный ID для действия сразу
    const actionId = Date.now() + Math.random() + (this.username || 'local');

    this.currentStroke = {
      type: "brush",
      strokeStyle: this.strokeColor,
      lineWidth: this.lineWidth,
      points: [{x, y}],
      author: this.username || 'local',
      id: actionId
    };

    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;

    this.drawLocally(x, y, true);
    this.sendDrawData(x, y, true);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown || !this.currentStroke) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const y = e.touches[0].clientY - rect.top;

    this.currentStroke.points.push({x, y});

    this.drawLocally(x, y, false);
    this.sendDrawData(x, y, false);
  }

  touchEndHandler(e) {
    e.preventDefault();
    this.mouseDown = false;

    // ✅ Сохраняем завершенный мазок в истории
    if (this.currentStroke && this.currentStroke.points.length > 0) {
      canvasState.addUserAction(this.currentStroke);
    }

    this.currentStroke = null;

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        method: "draw",
        id: this.id,
        username: this.username,
        figure: { type: "finish" }
      }));
    }

    if (window._localUserState) {
      delete window._localUserState[this.username || 'local'];
    }
  }

  sendDrawData(x, y, isStart = false) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
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
          isStart,
          username: this.username
        }
      }));
    }
  }

  drawLocally(x, y, isStart = false) {
    const ctx = this.ctx;
    const username = this.username || 'local';

    ctx.save();
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.lineWidth;
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
