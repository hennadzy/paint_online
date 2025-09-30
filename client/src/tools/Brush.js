import Tool from "./Tool";
import { makeAutoObservable } from "mobx";

export default class Brush extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeColor = "#000000";
    this.lineWidth = 1;
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
    this.canvas.ontouchstart = this.touchStartHandler.bind(this);
    this.canvas.ontouchmove = this.touchMoveHandler.bind(this);
    this.canvas.ontouchend = this.touchEndHandler.bind(this);
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmousemove = null;
    this.canvas.onmouseup = null;
    this.canvas.ontouchstart = null;
    this.canvas.ontouchmove = null;
    this.canvas.ontouchend = null;
  }

  mouseDownHandler(e) {
    this.mouseDown = true;
    this.ctx.beginPath();
    this.ctx.moveTo(e.clientX - this.canvas.getBoundingClientRect().left, e.clientY - this.canvas.getBoundingClientRect().top);
  }

  mouseMoveHandler(e) {
    if (!this.mouseDown) return;
    const x = e.clientX - this.canvas.getBoundingClientRect().left;
    const y = e.clientY - this.canvas.getBoundingClientRect().top;
    this.draw(x, y);
  }

  mouseUpHandler() {
    this.mouseDown = false;
  }

  touchStartHandler(e) {
    e.preventDefault();
    this.mouseDown = true;
    const x = e.touches[0].clientX - this.canvas.getBoundingClientRect().left;
    const y = e.touches[0].clientY - this.canvas.getBoundingClientRect().top;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  touchMoveHandler(e) {
    e.preventDefault();
    if (!this.mouseDown) return;
    const x = e.touches[0].clientX - this.canvas.getBoundingClientRect().left;
    const y = e.touches[0].clientY - this.canvas.getBoundingClientRect().top;
    this.draw(x, y);
  }

  touchEndHandler() {
    this.mouseDown = false;
  }

  draw(x, y) {
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }
}
