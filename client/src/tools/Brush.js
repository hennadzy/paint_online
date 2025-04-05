import Tool from "./Tool";

export default class Brush extends Tool {
    constructor(canvas, socket, id) {
        super(canvas, socket, id);
        this.mouseDown = false;
        this.listen();
    }

    listen() {
        this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
        this.canvas.onmousedown = this.mouseDownHandler.bind(this);
        this.canvas.onmouseup = this.mouseUpHandler.bind(this);
    }

    mouseDownHandler(e) {
        this.mouseDown = true;
        const x = e.pageX - e.target.offsetLeft;
        const y = e.pageY - e.target.offsetTop;

        // Локальная отрисовка
        this.localDraw(x, y, true);

        // Отправка данных через WebSocket
        this.sendDrawData(x, y, true);
    }

    mouseMoveHandler(e) {
        if (this.mouseDown) {
            const x = e.pageX - e.target.offsetLeft;
            const y = e.pageY - e.target.offsetTop;

            // Локальная отрисовка
            this.localDraw(x, y);

            // Отправка данных через WebSocket
            this.sendDrawData(x, y);
        }
    }

    mouseUpHandler() {
        this.mouseDown = false;

        // Завершение рисования для синхронизации
        this.sendFinish();
    }

    localDraw(x, y, isStart = false) {
        Brush.staticDraw(this.ctx, x, y, this.ctx.lineWidth, this.ctx.strokeStyle, isStart);
    }

    sendDrawData(x, y, isStart = false) {
        if (this.socket) {
            this.socket.send(JSON.stringify({
                method: 'draw',
                id: this.id,
                figure: {
                    type: 'brush',
                    x,
                    y,
                    lineWidth: this.ctx.lineWidth,
                    strokeStyle: this.ctx.strokeStyle,
                    isStart,
                }
            }));
        }
    }

    sendFinish() {
        if (this.socket) {
            this.socket.send(JSON.stringify({
                method: 'draw',
                id: this.id,
                figure: { type: 'finish' }
            }));
        }
    }

    static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart = false) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        if (isStart) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }
}
