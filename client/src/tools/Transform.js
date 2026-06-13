import Tool from "./Tool";
import canvasState from "../store/canvasState";
import selectionState from "../store/selectionState";
import {
  applyTransformToImageData,
  eraseMaskFromBuffer,
  imageDataToCanvas,
  pointInRect,
} from "../utils/selectionUtils";

const HANDLE_SIZE = 8;
const ROTATE_HANDLE_OFFSET = 24;

const HANDLES = [
  { id: "nw", cursor: "nw-resize", anchor: "se" },
  { id: "ne", cursor: "ne-resize", anchor: "sw" },
  { id: "sw", cursor: "sw-resize", anchor: "ne" },
  { id: "se", cursor: "se-resize", anchor: "nw" },
  { id: "n", cursor: "n-resize", anchor: "s" },
  { id: "s", cursor: "s-resize", anchor: "n" },
  { id: "e", cursor: "e-resize", anchor: "w" },
  { id: "w", cursor: "w-resize", anchor: "e" },
  { id: "rotate", cursor: "grab", anchor: null },
];

export default class Transform extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.activeHandle = null;
    this.startX = 0;
    this.startY = 0;
    this.initialTransform = null;
    this.initialBounds = null;
    this.hasCut = false;
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
    selectionState.setTransforming(true);
  }

  destroyEvents() {
    this.canvas.removeEventListener("pointerdown", this.pointerDownHandlerBound);
    document.removeEventListener("pointermove", this.pointerMoveHandlerBound);
    document.removeEventListener("pointerup", this.pointerUpHandlerBound);
    selectionState.setTransforming(false);
    this.activeHandle = null;
    this.hasCut = false;
  }

  getBounds() {
    return {
      x: selectionState.previewX,
      y: selectionState.previewY,
      width: selectionState.width,
      height: selectionState.height,
    };
  }

  getHandlePositions(bounds) {
    const { x, y, width, height } = bounds;
    const cx = x + width / 2;
    const cy = y + height / 2;
    return {
      nw: { x, y },
      ne: { x: x + width, y },
      sw: { x, y: y + height },
      se: { x: x + width, y: y + height },
      n: { x: cx, y },
      s: { x: cx, y: y + height },
      e: { x: x + width, y: cy },
      w: { x, y: cy },
      rotate: { x: cx, y: y - ROTATE_HANDLE_OFFSET },
    };
  }

  hitTestHandle(px, py) {
    if (!selectionState.hasSelection) return null;
    const positions = this.getHandlePositions(this.getBounds());

    for (const handle of HANDLES) {
      const pos = positions[handle.id];
      const half = HANDLE_SIZE / 2;
      if (
        px >= pos.x - half &&
        px <= pos.x + half &&
        py >= pos.y - half &&
        py <= pos.y + half
      ) {
        return handle;
      }
    }

    const bounds = this.getBounds();
    if (pointInRect(px, py, bounds)) {
      return { id: "move", cursor: "move", anchor: null };
    }

    return null;
  }

  pointerDownHandler(e) {
    if (this.isPinchingActive()) return;
    if (!selectionState.hasSelection) return;
    if (e.button !== 0) return;

    const { x, y } = this.getCanvasCoordinates(e);
    const handle = this.hitTestHandle(x, y);
    if (!handle) return;

    e.preventDefault();
    this.mouseDown = true;
    this.activeHandle = handle;
    this.startX = x;
    this.startY = y;
    this.initialTransform = { ...selectionState.transform };
    this.initialBounds = { ...this.getBounds() };
    selectionState.setDragging(handle.id === "move");
    this.cutSelectionFromBuffer();
    e.target.setPointerCapture?.(e.pointerId);
  }

  cutSelectionFromBuffer() {
    const { mask } = selectionState;
    const bufferCtx = canvasState.bufferCtx;
    if (!mask || !bufferCtx || this.hasCut) return;
    eraseMaskFromBuffer(bufferCtx, mask, this.canvas.width, this.canvas.height);
    this.hasCut = true;
    canvasState.redrawCanvas();
  }

  pointerMoveHandler(e) {
    if (!this.mouseDown || !this.activeHandle) return;

    const { x, y } = this.getCanvasCoordinates(e);
    const dx = x - this.startX;
    const dy = y - this.startY;
    const bounds = this.initialBounds;
    const transform = { ...this.initialTransform };

    if (this.activeHandle.id === "move") {
      selectionState.setPreviewPosition(bounds.x + dx, bounds.y + dy);
      return;
    }

    if (this.activeHandle.id === "rotate") {
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const startAngle = Math.atan2(this.startY - cy, this.startX - cx);
      const currentAngle = Math.atan2(y - cy, x - cx);
      transform.angle = this.initialTransform.angle + (currentAngle - startAngle) * (180 / Math.PI);
    } else if (e.altKey) {
      const skewFactor = 0.005;
      if (this.activeHandle.id === "n" || this.activeHandle.id === "s") {
        transform.skewX = this.initialTransform.skewX + dx * skewFactor;
      } else if (this.activeHandle.id === "e" || this.activeHandle.id === "w") {
        transform.skewY = this.initialTransform.skewY + dy * skewFactor;
      } else {
        transform.scaleX = Math.max(0.1, this.initialTransform.scaleX + dx / bounds.width);
        transform.scaleY = Math.max(0.1, this.initialTransform.scaleY + dy / bounds.height);
      }
    } else {
      const scaleFromHandle = (handleId) => {
        if (handleId === "e" || handleId === "ne" || handleId === "se") {
          transform.scaleX = Math.max(0.1, this.initialTransform.scaleX + dx / bounds.width);
        }
        if (handleId === "w" || handleId === "nw" || handleId === "sw") {
          transform.scaleX = Math.max(0.1, this.initialTransform.scaleX - dx / bounds.width);
        }
        if (handleId === "s" || handleId === "se" || handleId === "sw") {
          transform.scaleY = Math.max(0.1, this.initialTransform.scaleY + dy / bounds.height);
        }
        if (handleId === "n" || handleId === "ne" || handleId === "nw") {
          transform.scaleY = Math.max(0.1, this.initialTransform.scaleY - dy / bounds.height);
        }
      };
      scaleFromHandle(this.activeHandle.id);
    }

    selectionState.setTransform(transform);
  }

  pointerUpHandler() {
    if (!this.mouseDown) return;
    this.mouseDown = false;
    selectionState.setDragging(false);

    if (this.activeHandle?.id === "move") {
      if (
        selectionState.previewX !== selectionState.x ||
        selectionState.previewY !== selectionState.y
      ) {
        this.commitTransform();
      }
    } else if (this.activeHandle) {
      this.commitTransform();
    }

    this.activeHandle = null;
  }

  commitTransform() {
    const { mask, width, height, previewX, previewY, transform } = selectionState;
    let { imageData } = selectionState;
    if (!mask || !imageData) return;

    const bufferCtx = canvasState.bufferCtx;
    if (!bufferCtx) return;

    const transformedImage = applyTransformToImageData(imageData, transform);

    if (!this.hasCut) {
      eraseMaskFromBuffer(bufferCtx, mask, this.canvas.width, this.canvas.height);
    }

    const srcCanvas = imageDataToCanvas(transformedImage);
    bufferCtx.drawImage(srcCanvas, previewX, previewY);

    canvasState.pushStroke({
      type: "image_placeholder",
      x: previewX,
      y: previewY,
      width,
      height,
      imageData: {
        width: transformedImage.width,
        height: transformedImage.height,
        data: Array.from(transformedImage.data),
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
      imageData: transformedImage,
    });
    selectionState.resetTransform();
    this.hasCut = false;
    canvasState.redrawCanvas();
  }
}

export { HANDLE_SIZE, ROTATE_HANDLE_OFFSET, HANDLES };
