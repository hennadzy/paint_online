import BaseStrokeTool from './BaseStrokeTool';
import { renderOilStroke } from '../../utils/brushEffects';

export default class Oil extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'oil';
    this.edgeHardness = 70;
  }

  drawLive() {
    this.drawLiveFull(renderOilStroke);
  }
}
