import toolState from "../store/toolState";
import { API_URL } from "../store/canvasState";
import axios from "axios";

export default class Tool {
  constructor(canvas, socket, id, username) {
    this.canvas = canvas;
    this.socket = socket;
    this.id = id;
    this.username = username;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.strokeColor = toolState.strokeColor;
    this.fillColor = toolState.fillColor;
    const toolName = this.constructor.name.toLowerCase();
    this.lineWidth = toolState.lineWidths[toolName] ?? 1;
    this.mouseDown = false;
    this._hasCommitted = false;
    this._penPressureSmoothed = null;
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

  /** Сброс сглаживания давления в начале штриха (перо). */
  resetPenPressureState() {
    this._penPressureSmoothed = null;
  }

  /**
   * Кривая давления в духе Procreate: тонкие штрихи при лёгком касании,
   * плавный набор к полной толщине, сглаживание джиттера планшета.
   * Только pointerType "pen"; мышь / touch / тачпад — без изменений.
   */
  getPressureAdjustedLineWidth(e) {
    const isPenLike = e.pointerType === 'pen'
      || (typeof e.pressure === 'number' && e.pressure > 0 && e.pointerType !== 'touch');
    if (!isPenLike) {
      return this.lineWidth;
    }
    if (!toolState.pressureSensitivity) {
      return this.lineWidth;
    }
    const p = e.pressure;
    if (typeof p !== "number" || !Number.isFinite(p) || p <= 0) {
      return Math.max(0.5, this.lineWidth * (this._penPressureSmoothed ?? 1));
    }

    const t = Math.min(1, Math.max(0, p));
    const curved = 1 - Math.pow(1 - t, 3.15);
    const minRatio = 0.04;
    let ratio = minRatio + (1 - minRatio) * curved;

    const alpha = 0.38;
    if (this._penPressureSmoothed == null) {
      this._penPressureSmoothed = ratio;
    } else {
      this._penPressureSmoothed += alpha * (ratio - this._penPressureSmoothed);
    }
    ratio = this._penPressureSmoothed;

    return Math.max(0.5, this.lineWidth * ratio);
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
      const roomToken = localStorage.getItem(`room_token_${this.id}`);
      if (!roomToken) return;
      axios.post(
        `${API_URL}/api/image?id=${this.id}`,
        { img: this.canvas.toDataURL() },
        { headers: { Authorization: `Bearer ${roomToken}` } }
      );
    }
  }
}
