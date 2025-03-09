import Tool from "./Tool";

export default class Rect extends Tool {
    constructor(canvas, socket, id) {
        super(canvas, socket, id);
        this.mouseDown = false;

        this.mouseDownHandlerRef = this.mouseDownHandler.bind(this);
        this.mouseMoveHandlerRef = this.mouseMoveHandler.bind(this);
        this.mouseUpHandlerRef = this.mouseUpHandler.bind(this);
        this.touchStartHandlerRef = this.touchStartHandler.bind(this);
        this.touchMoveHandlerRef = this.touchMoveHandler.bind(this);
        this.touchEndHandlerRef = this.touchEndHandler.bind(this);

        this.listen();
    }

    listen() {
        this.canvas.addEventListener('mousedown', this.mouseDownHandlerRef);
        this.canvas.addEventListener('mousemove', this.mouseMoveHandlerRef);
        this.canvas.addEventListener('mouseup', this.mouseUpHandlerRef);

        this.canvas.addEventListener('touchstart', this.touchStartHandlerRef, {passive:false});
        this.canvas.addEventListener('touchmove', this.touchMoveHandlerRef, {passive:false});
        this.canvas.addEventListener('touchend', this.touchEndHandlerRef, {passive:false});
    }

    destroyEvents() {
        this.canvas.removeEventListener('mousedown', this.mouseDownHandlerRef);
        this.canvas.removeEventListener('mousemove', this.mouseMoveHandlerRef);
        this.canvas.removeEventListener('mouseup', this.mouseUpHandlerRef);

        this.canvas.removeEventListener('touchstart', this.touchStartHandlerRef);
        this.canvas.removeEventListener('touchmove', this.touchMoveHandlerRef);
        this.canvas.removeEventListener('touchend', this.touchEndHandlerRef);
    }

    mouseDownHandler(e) {
        this.mouseDown = true;
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;
        this.saved = this.canvas.toDataURL();
    }

    mouseMoveHandler(e) {
        if (this.mouseDown) {
            const rect = this.canvas.getBoundingClientRect();
            this.currentX = e.clientX - rect.left;
            this.currentY = e.clientY - rect.top;
            this.draw(this.startX, this.startY, this.currentX - this.startX, this.currentY - this.startY);
        }
    }

    mouseUpHandler(e) {
        this.mouseDown = false;
        this.sendRect();
    }

    touchStartHandler(e) {
        e.preventDefault();
        this.mouseDown = true;
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.touches[0].clientX - rect.left;
        this.startY = e.touches[0].clientY - rect.top;
        this.saved = this.canvas.toDataURL();
    }

    touchMoveHandler(e) {
        e.preventDefault();
        if (this.mouseDown) {
            const rect = this.canvas.getBoundingClientRect();
            this.currentX = e.touches[0].clientX - rect.left;
            this.currentY = e.touches[0].clientY - rect.top;
            this.draw(this.startX, this.startY, this.currentX - this.startX, this.currentY - this.startY);
        }
    }

    touchEndHandler(e) {
        e.preventDefault();
        this.mouseDown = false;
        this.sendRect();
    }

    sendRect() {
        this.socket.send(JSON.stringify({
            method: 'draw',
            id: this.id,
            figure: {
                type: 'rect',
                x: this.startX,
                y: this.startY,
                width: this.currentX - this.startX,
                height: this.currentY - this.startY,
                lineWidth: this.ctx.lineWidth,
                strokeStyle: this.ctx.strokeStyle,
                fillStyle: this.ctx.fillStyle
            }
        }));
        this.socket.send(JSON.stringify({ method: 'draw', id: this.id, figure: { type: 'finish' } }));
    }

    draw(x, y, w, h) {
        const img = new Image();
        img.src = this.saved;
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            this.ctx.beginPath();
            this.ctx.rect(x, y, w, h);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    static staticDraw(ctx, x, y, w, h, lineWidth, strokeStyle, fillStyle) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.stroke();
    }
}