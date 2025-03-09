import Tool from "./Tool";

export default class Rect extends Tool {
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

    mouseUpHandler(e) {
        this.mouseDown = false;
        this.sendRect();
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
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            this.width = currentX - this.startX;
            this.height = currentY - this.startY;
            this.draw(this.startX, this.startY, this.width, this.height);
        }
    }

    // Сенсорные события
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
            const currentX = e.touches[0].clientX - rect.left;
            const currentY = e.touches[0].clientY - rect.top;
            this.width = currentX - this.startX;
            this.height = currentY - this.startY;
            this.draw(this.startX, this.startY, this.width, this.height);
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
                width: this.width,
                height: this.height,
                color: this.ctx.fillStyle,
                lineWidth: this.ctx.lineWidth,
                strokeStyle: this.ctx.strokeStyle,
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
        };
    }

    static staticDraw(ctx, x, y, w, h, lineWidth, strokeStyle, color) {
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fill();
        ctx.stroke();
    }
}