import BaseStrokeTool from './BaseStrokeTool';
import { renderPastelStroke } from '../../utils/brushEffects';

export default class Pastel extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'pastel';
    this.strokeOpacity = 0.35;
    this.graininess = 60;
  }

  drawLive() {
    this.drawLiveStroke(renderPastelStroke);
  }
}
