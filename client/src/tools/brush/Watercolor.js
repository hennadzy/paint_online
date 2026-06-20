import BaseStrokeTool from './BaseStrokeTool';
import { renderWatercolorStroke } from '../../utils/brushEffects';

export default class Watercolor extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'watercolor';
    this.strokeOpacity = 0.45;
    this.saturation = 50;
    this.texture = true;
  }

  drawLive() {
    this.drawLiveFull(renderWatercolorStroke);
  }
}
