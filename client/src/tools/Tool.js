export default class Tool {
    constructor(canvas, socket, id) {
        this.canvas = canvas;
        this.socket = socket;
        this.id = id;
        this.ctx = canvas.getContext('2d');
        this.destroyEvents();
    }

    set fillColor(color) {
        this.ctx.fillStyle = color;
    }

    set strokeColor(color) {
        this.ctx.strokeStyle = color;
    }

    set lineWidth(width) {
        this.ctx.lineWidth = width;
    }
    draw(x, y) {}

    destroyEvents() {

        this.canvas.onmousemove = null;
        this.canvas.onmousedown = null;
        this.canvas.onmouseup = null;
        this.canvas.removeEventListener("touchstart", this._touchStartHandler);
        this.canvas.removeEventListener("touchmove", this._touchMoveHandler);
        this.canvas.removeEventListener("touchend", this._touchEndHandler);
    }
    


}