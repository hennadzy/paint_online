import { makeAutoObservable } from "mobx";

class SelectionState {
  active = false;
  type = null;
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  path = [];
  mask = null;
  imageData = null;
  previewX = 0;
  previewY = 0;
  isDragging = false;
  transformSessionActive = false;
  hasCut = false;
  floatingOnly = false;
  transform = {
    angle: 0,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
  };
  draftRect = null;
  draftPath = null;
  marchingAntsOffset = 0;

  constructor() {
    makeAutoObservable(this);
  }

  get hasSelection() {
    return this.active && this.width > 0 && this.height > 0 && this.imageData;
  }

  get isTransforming() {
    return this.transformSessionActive;
  }

  clear() {
    this.active = false;
    this.type = null;
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.path = [];
    this.mask = null;
    this.imageData = null;
    this.previewX = 0;
    this.previewY = 0;
    this.isDragging = false;
    this.transformSessionActive = false;
    this.hasCut = false;
    this.floatingOnly = false;
    this.transform = { angle: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 };
    this.draftRect = null;
    this.draftPath = null;
  }

  setDraftRect(rect) {
    this.draftRect = rect;
  }

  setDraftPath(path) {
    this.draftPath = path;
  }

  clearDraft() {
    this.draftRect = null;
    this.draftPath = null;
  }

  applySelection({ type, x, y, width, height, path, mask, imageData, floatingOnly = false }) {
    this.active = true;
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.path = path || [];
    this.mask = mask;
    this.imageData = imageData;
    this.previewX = x;
    this.previewY = y;
    this.floatingOnly = floatingOnly;
    this.hasCut = floatingOnly;
    this.transform = { angle: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 };
    this.clearDraft();
  }

  enterTransformSession() {
    this.transformSessionActive = true;
    if (!this.floatingOnly) {
      this.hasCut = false;
    }
  }

  exitTransformSession() {
    this.transformSessionActive = false;
    this.isDragging = false;
    this.hasCut = false;
  }

  setPreviewPosition(x, y) {
    this.previewX = x;
    this.previewY = y;
  }

  setDragging(value) {
    this.isDragging = value;
  }

  setHasCut(value) {
    this.hasCut = value;
  }

  setTransform(transform) {
    this.transform = { ...this.transform, ...transform };
  }

  resetTransform() {
    this.transform = { angle: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 };
  }

  advanceMarchingAnts() {
    this.marchingAntsOffset = (this.marchingAntsOffset + 1) % 16;
  }
}

const selectionState = new SelectionState();
export default selectionState;
