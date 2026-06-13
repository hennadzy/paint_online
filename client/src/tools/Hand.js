import Tool from "./Tool";
import canvasState from "../store/canvasState";
import { isMobileCanvasView } from "../utils/pinchPanGestures";
import { clampPanToMetrics, getMobileCanvasViewMetrics } from "../utils/canvasViewMetrics";

export default class Hand extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.container = null;
    this.lastClientX = 0;
    this.lastClientY = 0;
    this.isPanning = false;
  }

  listen() {
    this.container = this.canvas.closest(".canvas-container");
    this.wrapper = this.canvas.closest(".canvas-wrapper");

    if (!this.pointerDownHandlerBound) {
      this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
      this.pointerMoveHandlerBound = this.pointerMoveHandler.bind(this);
      this.pointerUpHandlerBound = this.pointerUpHandler.bind(this);
    }

    this.canvas.addEventListener("pointerdown", this.pointerDownHandlerBound);
    document.addEventListener("pointermove", this.pointerMoveHandlerBound);
    document.addEventListener("pointerup", this.pointerUpHandlerBound);
  }

  destroyEvents() {
    this.canvas.removeEventListener("pointerdown", this.pointerDownHandlerBound);
    document.removeEventListener("pointermove", this.pointerMoveHandlerBound);
    document.removeEventListener("pointerup", this.pointerUpHandlerBound);
    this.isPanning = false;
    this.canvas.classList.remove("hand-grabbing");
  }

  pointerDownHandler(e) {
    if (this.isPinchingActive()) return;
    if (e.button !== 0) return;

    e.preventDefault();
    this.isPanning = true;
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;
    this.canvas.classList.add("hand-grabbing");
    e.target.setPointerCapture?.(e.pointerId);
  }

  pointerMoveHandler(e) {
    if (!this.isPanning) return;

    const dx = e.clientX - this.lastClientX;
    const dy = e.clientY - this.lastClientY;
    this.lastClientX = e.clientX;
    this.lastClientY = e.clientY;

    this.pan(dx, dy);
  }

  pointerUpHandler() {
    if (!this.isPanning) return;
    this.isPanning = false;
    this.canvas.classList.remove("hand-grabbing");
  }

  pan(dx, dy) {
    if (isMobileCanvasView()) {
      const metrics = getMobileCanvasViewMetrics(this.container, this.wrapper, canvasState.viewZoom);
      const clamped = clampPanToMetrics(
        canvasState.viewPanX + dx,
        canvasState.viewPanY + dy,
        metrics
      );
      canvasState.setViewPan(clamped.x, clamped.y);
    } else if (this.container) {
      this.container.scrollLeft -= dx;
      this.container.scrollTop -= dy;
    }
  }
}
