import BaseStrokeTool from './BaseStrokeTool';
import canvasState from '../../store/canvasState';
import { applySmudgeAt } from '../../utils/brushEffects';

export default class Smudge extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'smudge';
    this.strength = 50;
  }

  drawSegment() {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    const len = this.points.length;
    if (len < 2) return;

    const p0 = this.points[len - 2];
    const p1 = this.points[len - 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    canvasState.redrawCanvas();
    applySmudgeAt(ctx, this.canvas, p1.x, p1.y, this.lineWidth / 2, this.strength, dx / dist, dy / dist);
  }
}
