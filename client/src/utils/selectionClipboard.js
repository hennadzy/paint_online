import canvasState from "../store/canvasState";
import toolState from "../store/toolState";
import selectionState from "../store/selectionState";
import RectSelect from "../tools/RectSelect";
import {
  applyTransformToImageData,
  buildSelectionEraseStroke,
  cloneImageData,
  imageDataToCanvas,
} from "./selectionUtils";
import {
  commitSelectionSession,
  cutSelectionFromBuffer,
  enterTransformSession,
} from "./selectionSession";

let clipboard = null;

async function writeImageToSystemClipboard(imageData) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    return;
  }

  try {
    const canvas = imageDataToCanvas(imageData);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
  } catch {
    // Системный буфер недоступен — внутренний clipboard всё равно работает.
  }
}

export function hasClipboardContent() {
  return Boolean(clipboard?.imageData);
}

export function copySelection() {
  if (!selectionState.hasSelection) return false;

  const transformed = applyTransformToImageData(
    selectionState.imageData,
    selectionState.transform
  );

  clipboard = {
    imageData: cloneImageData(transformed),
    pasteCount: 0,
  };

  void writeImageToSystemClipboard(transformed);
  return true;
}

export function cutSelection(canvas) {
  if (!selectionState.hasSelection || !canvas) return false;
  if (!copySelection()) return false;

  const {
    type: selectionType,
    x: originX,
    y: originY,
    width: selectionWidth,
    height: selectionHeight,
    mask,
    hasCut,
  } = selectionState;

  if (!hasCut) {
    cutSelectionFromBuffer(canvas);

    const payload = {
      canvasWidth: canvas.width,
      selectionType,
      originX,
      originY,
      selectionWidth,
      selectionHeight,
      mask,
    };

    selectionState.clear();

    void (async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const stroke = buildSelectionEraseStroke(payload);
      await canvasState.pushStroke(stroke);
    })();
  } else {
    selectionState.clear();
    canvasState.redrawCanvas();
  }

  return true;
}

export function pasteSelection(canvas) {
  if (!clipboard?.imageData || !canvas) return false;

  if (selectionState.transformSessionActive) {
    commitSelectionSession(canvas);
  }

  const { socket, sessionId, username } = canvasState;
  const safeUsername = username || "local";
  toolState.setTool(
    new RectSelect(canvas, socket, sessionId, safeUsername),
    "select"
  );

  const imageData = cloneImageData(clipboard.imageData);
  const w = imageData.width;
  const h = imageData.height;
  const offset = clipboard.pasteCount * 15;
  clipboard.pasteCount += 1;

  const x = Math.max(
    0,
    Math.min(canvas.width - w, Math.round((canvas.width - w) / 2) + offset)
  );
  const y = Math.max(
    0,
    Math.min(canvas.height - h, Math.round((canvas.height - h) / 2) + offset)
  );

  selectionState.applySelection({
    type: "paste",
    x,
    y,
    width: w,
    height: h,
    path: [],
    mask: null,
    imageData,
    floatingOnly: true,
  });
  enterTransformSession(canvas);
  return true;
}
