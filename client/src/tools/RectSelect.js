import Tool from "./Tool";
import canvasState from "../store/canvasState";
import selectionState from "../store/selectionState";
import {
  combineMasks,
  createMask,
  extractImageDataFromMask,
  fillRectMask,
  getMaskBounds,
  getSelectionMode,
  normalizeRect,
} from "../utils/selectionUtils";
import {
  createTransformSessionHandlers,
  enterTransformSession,
} from "../utils/selectionSession";

export default class RectSelect extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.startX = 0;
    this.startY = 0;
    this.transformSession = createTransformSessionHandlers(this);
  }

  listen() {
    if (!this.pointerDownHandlerBound) {
      this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
      this.pointerMoveHandlerBound = this.pointerMoveHandler.bind(this);
      this.pointerUpHandlerBound = this.pointerUpHandler.bind(this);
      this.pointerCancelHandlerBound = this.pointerUpHandlerBound;
      this.lostPointerCaptureHandlerBound = this.lostPointerCaptureHandler.bind(this);
    }

    this.canvas.addEventListener("pointerdown", this.pointerDownHandlerBound);
    this.canvas.addEventListener("pointermove", this.pointerMoveHandlerBound);
    this.canvas.addEventListener("pointerup", this.pointerUpHandlerBound);
    this.canvas.addEventListener("pointercancel", this.pointerCancelHandlerBound);
    this.canvas.addEventListener("lostpointercapture", this.lostPointerCaptureHandlerBound);
  }

  destroyEvents() {
    this.canvas.removeEventListener("pointerdown", this.pointerDownHandlerBound);
    this.canvas.removeEventListener("pointermove", this.pointerMoveHandlerBound);
    this.canvas.removeEventListener("pointerup", this.pointerUpHandlerBound);
    this.canvas.removeEventListener("pointercancel", this.pointerCancelHandlerBound);
    this.canvas.removeEventListener("lostpointercapture", this.lostPointerCaptureHandlerBound);
    this.transformSession.destroy();
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

    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.mouseDown = true;
    const { x, y } = this.getCanvasCoordinates(e);
    this.startX = x;
    this.startY = y;
    selectionState.setDraftRect({ x, y, width: 0, height: 0 });
  }

  pointerMoveHandler(e) {
    if (selectionState.transformSessionActive && this.mouseDown) {
      this.transformSession.pointerMove(e);
      return;
    }

    if (!this.mouseDown) return;

    const { x, y } = this.getCanvasCoordinates(e);
    selectionState.setDraftRect(normalizeRect(this.startX, this.startY, x, y));
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

    const { x, y } = this.getCanvasCoordinates(e);
    const rect = normalizeRect(this.startX, this.startY, x, y);
    selectionState.clearDraft();

    const minSize = e.pointerType === "touch" ? 4 : 2;
    if (rect.width < minSize || rect.height < minSize) return;

    this.finalizeSelection(rect, getSelectionMode(e));
    enterTransformSession();
  }

  releaseCapture(e) {
    if (this.canvas.hasPointerCapture?.(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
  }

  finalizeSelection(rect, mode) {
    const bufferCtx = canvasState.bufferCtx;
    if (!bufferCtx) return;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const newMask = createMask(canvasWidth, canvasHeight);
    fillRectMask(newMask, canvasWidth, rect.x, rect.y, rect.width, rect.height);

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
      type: "rect",
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      path: [],
      mask,
      imageData,
    });
  }
}
