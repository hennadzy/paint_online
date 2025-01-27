import Tool from "./Tool";

export default class Eraser extends Tool {
    constructor(canvas, socket, id) {
        super(canvas, socket, id);
        this.listen()
    }

    listen() {
        this.canvas.onmousemove = this.mouseMoveHandler.bind(this)
        this.canvas.onmousedown = this.mouseDownHandler.bind(this)
        this.canvas.onmouseup = this.mouseUpHandler.bind(this)
    }

    mouseUpHandler(e) {
        this.mouseDown = false
        this.socket.send(JSON.stringify({
            method: 'draw',
            id: this.id,
            figure: {
                type: 'finish',
            }
        }))
    }

    mouseDownHandler(e) {
        this.ctx.strokeStyle = "white";
        this.mouseDown = true
        this.ctx.beginPath()
        this.ctx.moveTo(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop)
        const lineWidth = this.ctx.lineWidth;
        const strokeStyle = this.ctx.strokeStyle;
        this.socket.send(JSON.stringify({
            method: 'draw',
            id: this.id,
            figure: {
                type: 'eraser',
                x: e.pageX - e.target.offsetLeft,
                y: e.pageY - e.target.offsetTop,
                lineWidth,
                strokeStyle
            }
        }))
    }

    mouseMoveHandler(e) {
        if (this.mouseDown) {
            this.socket.send(JSON.stringify({
                method: 'draw',
                id: this.id,
                figure: {
                    type: 'eraser',
                    x: e.pageX - e.target.offsetLeft,
                    y: e.pageY - e.target.offsetTop,
                }
            }))
        }
    }

    static staticDraw(ctx, x, y, lineWidth, strokeStyle) {
        ctx.lineTo(x, y)
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke()
    }
}