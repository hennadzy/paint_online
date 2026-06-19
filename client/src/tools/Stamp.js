import Tool from './Tool';
import canvasState from '../store/canvasState';
import toolState from '../store/toolState';
import { getStampPresets } from '../utils/stampPresets';

export default class Stamp extends Tool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeStyle = '#000000';
    this.strokeOpacity = 1;
  }

  setStrokeColor(color) {
    this.strokeStyle = color;
  }

  setStrokeOpacity(opacity) {
    this.strokeOpacity = opacity;
  }

  setLineWidth(width) {
    this.lineWidth = width;
  }

  applyStampParams() {
    const params = toolState.getToolParams('stamp');
    this.selectedStamp = params.selectedStamp ?? '😊';
  }

  listen() {
    if (!this.pointerDownHandlerBound) {
      this.pointerDownHandlerBound = this.pointerDownHandler.bind(this);
      this.wheelHandlerBound = this.wheelHandler.bind(this);
    }

    this.applyStampParams();
    this.lineWidth = toolState.lineWidths.stamp ?? 48;
    this.canvas.addEventListener('pointerdown', this.pointerDownHandlerBound);
    this.canvas.addEventListener('wheel', this.wheelHandlerBound, { passive: false });
  }

  destroyEvents() {
    this.canvas.removeEventListener('pointerdown', this.pointerDownHandlerBound);
    this.canvas.removeEventListener('wheel', this.wheelHandlerBound);
  }

  wheelHandler(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -4 : 4;
    const current = toolState.lineWidths.stamp ?? this.lineWidth ?? 48;
    const newSize = Math.max(16, Math.min(200, current + delta));
    toolState.setLineWidth(newSize);
    this.lineWidth = newSize;
  }

  pointerDownHandler(e) {
    if (this.isPinchingActive()) return;

    e.preventDefault();
    this.applyStampParams();
    this.lineWidth = toolState.lineWidths.stamp ?? this.lineWidth;
    const { x, y } = this.getCanvasCoordinates(e);
    this.placeStamp(x, y);
  }

  placeStamp(x, y) {
    const preset = getStampPresets().find((s) => s.id === this.selectedStamp)
      || getStampPresets()[0];

    const size = toolState.lineWidths.stamp ?? this.lineWidth ?? 48;
    const stroke = {
      type: 'stamp',
      x: x - size / 2,
      y: y - size / 2,
      width: size,
      height: size,
      stampId: preset.id,
      stampKind: preset.kind,
      ...(preset.kind === 'emoji' ? { stampContent: preset.content } : {}),
      strokeStyle: this.strokeStyle,
      strokeOpacity: this.strokeOpacity,
      username: this.username,
    };

    canvasState.pushStroke(stroke);
    this.saveImage();

    this.send(JSON.stringify({
      method: 'draw',
      id: this.id,
      username: this.username,
      figure: stroke,
    }));

    canvasState.redrawCanvas();
  }
}
