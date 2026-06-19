import Brush from '../Brush';
import canvasState from '../../store/canvasState';

export default class Marker extends Brush {
  constructor(canvas, socket, id, username) {
    super(canvas, socket, id, username);
    this.strokeOpacity = 0.5;
    this.angle = 0;
  }

  commitStroke() {
    if (this.points.length === 0) {
      canvasState.isDrawing = false;
      return;
    }

    const stroke = {
      type: 'marker',
      points: [...this.points],
      strokeStyle: this.strokeStyle,
      strokeOpacity: this.strokeOpacity,
      lineWidth: this.lineWidth,
      username: this.username,
    };

    this.points = [];
    canvasState.pushStroke(stroke);
    this.saveImage();

    this.send(JSON.stringify({
      method: 'draw',
      id: this.id,
      username: this.username,
      figure: stroke,
    }));

    canvasState.redrawCanvas();
    canvasState.isDrawing = false;
  }
}
