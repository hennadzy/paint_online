import BaseStrokeTool from './BaseStrokeTool';
import { renderSmudgeStroke } from '../../utils/brushEffects';

export default class Smudge extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'smudge';
    this.strength = 50;
  }

  drawLive() {
    this.drawLiveFull(renderSmudgeStroke, true);
  }
}
