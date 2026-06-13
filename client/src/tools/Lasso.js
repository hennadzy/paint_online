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

const CLOSE_DISTANCE = 12;

export default class Lasso extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.points = [];
  }

  listen() {
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
    this.points = [];
    selectionState.clearDraft();
  }

  pointerDownHandler(e) {
    if (this.isPinchingActive()) return;
    if (e.button !== 0) return;

    e.preventDefault();
    const { x, y } = this.getCanvasCoordinates(e);

    if (!this.mouseDown) {
      this.mouseDown = true;
      this.points = [{ x, y }];
      selectionState.setDraftPath([...this.points]);
      e.target.setPointerCapture?.(e.pointerId);
      return;
    }

    const start = this.points[0];
    const dist = Math.hypot(x - start.x, y - start.y);
    if (this.points.length > 2 && dist < CLOSE_DISTANCE) {
      this.closeSelection(e);
    }
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown) return;

    const { x, y } = this.getCanvasCoordinates(e);
    const last = this.points[this.points.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > 2) {
      this.points.push({ x, y });
      selectionState.setDraftPath([...this.points]);
    }
  }

  pointerUpHandler(e) {
    if (!this.mouseDown) return;

    if (this.points.length > 10) {
      const { x, y } = this.getCanvasCoordinates(e);
      const start = this.points[0];
      if (Math.hypot(x - start.x, y - start.y) < CLOSE_DISTANCE * 2) {
        this.closeSelection(e);
        return;
      }
    }
  }

  closeSelection(e) {
    this.mouseDown = false;
    const path = [...this.points];
    this.points = [];
    selectionState.clearDraft();

    if (path.length < 3) return;
    this.finalizeSelection(path, getSelectionMode(e));
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
