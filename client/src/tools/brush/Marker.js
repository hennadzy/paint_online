import BaseStrokeTool from './BaseStrokeTool';
import { renderMarkerStroke } from '../../utils/brushEffects';

export default class Marker extends BaseStrokeTool {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeType = 'marker';
    this.strokeOpacity = 0.5;
    this.angle = 0;
  }

  drawLive() {
    this.drawLiveFull(renderMarkerStroke);
  }
}
