import Tool from "./Tool";
import canvasState from "../store/canvasState";
import selectionState from "../store/selectionState";
import {
  eraseMaskFromBuffer,
  imageDataToCanvas,
  pointInMask,
  pointInRect,
} from "../utils/selectionUtils";

export default class Move extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialPreviewX = 0;
    this.initialPreviewY = 0;
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
    selectionState.setDragging(false);
  }

  isPointInSelection(x, y) {
    if (!selectionState.hasSelection) return false;
    if (selectionState.mask) {
      return pointInMask(x, y, selectionState.mask, this.canvas.width);
    }
    return pointInRect(x, y, {
      x: selectionState.previewX,
      y: selectionState.previewY,
      width: selectionState.width,
      height: selectionState.height,
    });
  }

  pointerDownHandler(e) {
    if (this.isPinchingActive()) return;
    if (!selectionState.hasSelection) return;
    if (e.button !== 0) return;

    const { x, y } = this.getCanvasCoordinates(e);
    if (!this.isPointInSelection(x, y)) return;

    e.preventDefault();
    this.mouseDown = true;
    this.dragStartX = x;
    this.dragStartY = y;
    this.initialPreviewX = selectionState.previewX;
    this.initialPreviewY = selectionState.previewY;
    selectionState.setDragging(true);
    this.cutSelectionFromBuffer();
    e.target.setPointerCapture?.(e.pointerId);
  }

  cutSelectionFromBuffer() {
    const { mask } = selectionState;
    const bufferCtx = canvasState.bufferCtx;
    if (!mask || !bufferCtx) return;
    eraseMaskFromBuffer(bufferCtx, mask, this.canvas.width, this.canvas.height);
    canvasState.redrawCanvas();
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown) return;

    const { x, y } = this.getCanvasCoordinates(e);
    const dx = x - this.dragStartX;
    const dy = y - this.dragStartY;
    selectionState.setPreviewPosition(this.initialPreviewX + dx, this.initialPreviewY + dy);
  }

  pointerUpHandler() {
    if (!this.mouseDown) return;
    this.mouseDown = false;
    selectionState.setDragging(false);

    if (
      selectionState.previewX !== selectionState.x ||
      selectionState.previewY !== selectionState.y
    ) {
      this.commitMove();
    }
  }

  commitMove() {
    const { mask, imageData, width, height, previewX, previewY } = selectionState;
    if (!mask || !imageData) return;

    const bufferCtx = canvasState.bufferCtx;
    if (!bufferCtx) return;

    const srcCanvas = imageDataToCanvas(imageData);
    bufferCtx.drawImage(srcCanvas, previewX, previewY);

    canvasState.pushStroke({
      type: "image_placeholder",
      x: previewX,
      y: previewY,
      width,
      height,
      imageData: {
        width: imageData.width,
        height: imageData.height,
        data: Array.from(imageData.data),
      },
    });

    selectionState.applySelection({
      type: selectionState.type,
      x: previewX,
      y: previewY,
      width,
      height,
      path: selectionState.path,
      mask,
      imageData,
    });
    canvasState.redrawCanvas();
  }
}
