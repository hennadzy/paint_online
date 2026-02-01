import toolState from "../store/toolState";
import axios from "axios";

export default class Tool {
  constructor(canvas, socket, id, username) {
    this.canvas = canvas;
    this.socket = socket;
    this.id = id;
    this.username = username;
    this.ctx = canvas.getContext("2d");
    this.strokeColor = toolState.strokeColor;
    this.fillColor = toolState.fillColor;
    const toolName = this.constructor.name.toLowerCase();
    this.lineWidth = toolState.lineWidths[toolName] ?? 1;
    this.mouseDown = false;
    this._hasCommitted = false;
  }

  destroyEvents() {
    this.canvas.onmousedown = null;
    this.canvas.onmouseup = null;
    this.canvas.onmousemove = null;
    this.canvas.ontouchstart = null;
    this.canvas.ontouchmove = null;
    this.canvas.ontouchend = null;
    this.removeGlobalEndEvents?.();
  }

  setStrokeColor(color) {
    this.strokeColor = color; 
  }

  setFillColor(color) {
    this.fillColor = color;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  listenGlobalEndEvents() {
    this._handleGlobalEnd = this.handleGlobalEnd.bind(this);
    document.addEventListener("pointerup", this._handleGlobalEnd);
  }

  removeGlobalEndEvents() {
    document.removeEventListener("pointerup", this._handleGlobalEnd);
  }

  handleGlobalEnd(e) {
    if (!this.mouseDown || this._hasCommitted) return;
    this.mouseDown = false;
    this._hasCommitted = true;

    if (typeof this.commitStroke === "function") {
      this.commitStroke();
    }
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  getCanvasCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    return { x, y };
  }

  isPinchingActive() {
    return window.isPinching && window.isPinching();
  }

  send(msg) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(msg);
    }
  }

  saveImage() {
    if (this.id) {
      axios.post(`https://paint-online-back.onrender.com/image?id=${this.id}`, { img: this.canvas.toDataURL() });
    }
  }
}
