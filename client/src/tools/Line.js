import Tool from "./Tool";

export default class Line extends Tool {
    constructor(canvas, socket, id) {
        super(canvas, socket, id);
        this.mouseDown = false;
        this.destroyEvents();
        this.listen();
    }

    listen() {
        this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
        this.canvas.onmousedown = this.mouseDownHandler.bind(this);
        this.canvas.onmouseup = this.mouseUpHandler.bind(this);

        // сенсорные события
        this.canvas.addEventListener('touchstart', this.touchStartHandler.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.touchMoveHandler.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.touchEndHandler.bind(this), { passive: false });
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
            this.draw(this.startX, this.startY, this.currentX, this.currentY);
        }
    }

    mouseUpHandler(e) {
        this.mouseDown = false;
        this.sendLine();
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
            this.draw(this.startX, this.startY, this.currentX, this.currentY);
        }
    }

    touchEndHandler(e) {
        e.preventDefault();
        this.mouseDown = false;
        this.sendLine();
    }

    sendLine() {
        this.socket.send(JSON.stringify({
            method: 'draw',
            id: this.id,
            figure: {
                type: 'line',
                x: this.startX,
                y: this.startY,
                x2: this.currentX,
                y2: this.currentY,
                lineWidth: this.ctx.lineWidth,
                strokeStyle: this.ctx.strokeStyle,
            }
        }));
        this.socket.send(JSON.stringify({ method: 'draw', id: this.id, figure: { type: 'finish' } }));
    }

    draw(x, y, x2, y2) {
        const img = new Image();
        img.src = this.saved;
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        };
    }

    static staticDraw(ctx, x, y, x2, y2, lineWidth, strokeStyle) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}