import Tool from "./Tool";

export default class Eraser extends Tool {
    constructor(canvas, socket, id) {
        super(canvas, socket, id);
        this.mouseDown = false;
        this.destroyEvents();
        this.listen();
    }

    listen() {
        // обработка мыши
        this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
        this.canvas.onmousedown = this.mouseDownHandler.bind(this);
        this.canvas.onmouseup = this.mouseUpHandler.bind(this);

        // обработка сенсорных устройств
        this.canvas.addEventListener('touchstart', this.touchStartHandler.bind(this), {passive: false});
        this.canvas.addEventListener('touchmove', this.touchMoveHandler.bind(this), {passive: false});
        this.canvas.addEventListener('touchend', this.touchEndHandler.bind(this), {passive: false});
    }

    mouseDownHandler(e) {
        this.mouseDown = true;
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.strokeStyle = "white";
        this.ctx.beginPath();
        this.ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
        this.sendEraseData(e.clientX - rect.left, e.clientY - rect.top, true);
    }

    mouseMoveHandler(e) {
        if (this.mouseDown) {
            const rect = this.canvas.getBoundingClientRect();
            this.sendEraseData(e.clientX - rect.left, e.clientY - rect.top);
        }
    }

    mouseUpHandler() {
        this.mouseDown = false;
        if (this.socket) {
            this.socket.send(JSON.stringify({
                method: 'draw', id: this.id, figure: { type: 'finish' }
            }));
        }
    }

    touchStartHandler(e) {
        e.preventDefault();
        this.mouseDown = true;
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.strokeStyle = "white";
        this.ctx.beginPath();
        this.ctx.moveTo(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
        this.sendEraseData(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top, true);
    }

    touchMoveHandler(e) {
        e.preventDefault();
        if (this.mouseDown) {
            const rect = this.canvas.getBoundingClientRect();
            this.sendEraseData(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
        }
    }

    touchEndHandler(e) {
        e.preventDefault();
        this.mouseDown = false;
        if (this.socket) {
            this.socket.send(JSON.stringify({
                method: 'draw', id: this.id, figure: { type: 'finish' }
            }));
        }
    }

    sendEraseData(x, y, isStart = false) {
        const lineWidth = this.ctx.lineWidth;
        const strokeStyle = "#FFFFFF"; // Белый цвет для ластика

        if (this.socket) {
            this.socket.send(JSON.stringify({
                method: 'draw',
                id: this.id,
                figure: {
                    type: 'eraser',
                    x,
                    y,
                    isStart,
                    lineWidth,
                    strokeStyle
                }
            }));
        }

        Eraser.staticDraw(this.ctx, x, y, lineWidth, strokeStyle, isStart);
    }

    static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart) {
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';

        if (isStart) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }
}