export default class Brush extends Tool {
    constructor(canvas, socket, id) {
        super(canvas, socket, id);
        this.mouseDown = false;
        this.destroyEvents();
        this.listen();
    }

    // ... (тут без изменений ваш существующий код listen(), mouseUpHandler и пр.)

    draw(x, y) {
        this.sendDrawData(x, y, false);
    }

    sendDrawData(x, y, isStart = false) {
        const lineWidth = this.ctx.lineWidth;
        const strokeStyle = this.ctx.strokeStyle;

        if (this.socket) {
            this.socket.send(JSON.stringify({
                method: 'draw',
                id: this.id,
                figure: {
                    type: 'brush',
                    x,
                    y,
                    lineWidth,
                    strokeStyle,
                    isStart
                }
            }));
        }

        Brush.staticDraw(this.ctx, x, y, lineWidth, strokeStyle, isStart);
    }

    static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart = false) {
        if (isStart) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
        ctx.lineTo(x, y);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    }
}