import Tool from "./Tool";
import canvasState from "../store/canvasState";
import selectionState from "../store/selectionState";
import {
  combineMasks,
  createMask,
  extractImageDataFromMask,
  fillPathMask,
  getMaskBounds,
  getSelectionMode,
} from "../utils/selectionUtils";
import {
  createTransformSessionHandlers,
  enterTransformSession,
} from "../utils/selectionSession";

export default class Lasso extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.points = [];
    this.transformSession = createTransformSessionHandlers(this);
  }

  listen() {
    if (!this.pointerDownHandlerBound) {
      this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
      this.pointerMoveHandlerBound = this.pointerMoveHandler.bind(this);
      this.pointerUpHandlerBound = this.pointerUpHandler.bind(this);
      this.lostPointerCaptureHandlerBound = this.lostPointerCaptureHandler.bind(this);
    }

    this.bindCanvasDragPointerEvents({
      onDown: this.pointerDownHandlerBound,
      onMove: this.pointerMoveHandlerBound,
      onUp: this.pointerUpHandlerBound,
    });

    this.canvas.addEventListener("lostpointercapture", this.lostPointerCaptureHandlerBound);
  }

  destroyEvents() {
    this.unbindCanvasDragPointerEvents();
    this.canvas.removeEventListener("lostpointercapture", this.lostPointerCaptureHandlerBound);
    this.transformSession.destroy();
    this.points = [];
    selectionState.clearDraft();
  }

  lostPointerCaptureHandler(e) {
    if (!this.mouseDown) return;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
  }

  isPrimaryPointer(e) {
    return e.isPrimary !== false;
  }

  pointerDownHandler(e) {
    if (!this.isPrimaryPointer(e)) return;
    if (this.isPinchingActive()) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    if (selectionState.transformSessionActive) {
      if (this.transformSession.pointerDown(e)) return;
    }

    e.preventDefault?.();
    this.canvas.setPointerCapture?.(e.pointerId);
    this.mouseDown = true;
    const { x, y } = this.getCanvasCoordinates(e);
    this.points = [{ x, y }];
    selectionState.setDraftPath([...this.points]);
  }

  pointerMoveHandler(e) {
    if (selectionState.transformSessionActive && this.mouseDown) {
      this.transformSession.pointerMove(e);
      return;
    }

    if (!this.mouseDown) return;

    e.preventDefault?.();
    const { x, y } = this.getCanvasCoordinates(e);
    const last = this.points[this.points.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > 2) {
      this.points.push({ x, y });
      selectionState.setDraftPath([...this.points]);
    }
  }

  pointerUpHandler(e) {
    if (selectionState.transformSessionActive && this.mouseDown) {
      this.transformSession.pointerUp();
      this.releaseCapture(e);
      return;
    }

    if (!this.mouseDown) return;
    this.mouseDown = false;
    this.releaseCapture(e);

    const path = [...this.points];
    this.points = [];
    selectionState.clearDraft();

    if (path.length < 3) return;

    this.finalizeSelection(path, getSelectionMode(e));
    enterTransformSession(this.canvas);
  }

  releaseCapture(e) {
    if (this.canvas.hasPointerCapture?.(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
  }

  finalizeSelection(path, mode) {
    const bufferCtx = canvasState.bufferCtx;
    if (!bufferCtx) return;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const newMask = createMask(canvasWidth, canvasHeight);
    fillPathMask(newMask, canvasWidth, canvasHeight, path);

    const mask = combineMasks(
      mode === "new" ? null : selectionState.mask,
      newMask,
      mode,
      canvasWidth,
      canvasHeight
    );

    const bounds = getMaskBounds(mask, canvasWidth, canvasHeight);
    if (!bounds) {
      if (mode !== "add") selectionState.clear();
      return;
    }

    const imageData = extractImageDataFromMask(bufferCtx, mask, canvasWidth, bounds);

    selectionState.applySelection({
      type: "lasso",
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      path,
      mask,
      imageData,
    });
  }
}
