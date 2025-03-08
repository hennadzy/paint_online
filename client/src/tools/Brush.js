import Tool from "./Tool";

export default class Brush extends Tool {
    constructor(canvas, socket, id) {
        super(canvas, socket, id);
        this.mouseDown = false;
        this.listen();
        this.name = 'brush';
    }

    listen() {
        this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
        this.canvas.onmousedown = this.mouseDownHandler.bind(this);
        this.canvas.onmouseup = this.mouseUpHandler.bind(this);

        this.canvas.addEventListener('touchstart', this.touchStartHandler.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.touchMoveHandler.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.touchEndHandler.bind(this));
        this.canvas.addEventListener('touchcancel', this.touchEndHandler.bind(this));
    }

    mouseUpHandler(e) {
        this.mouseDown = false;
        this.sendSocketDraw({type: 'finish'});
    }

    mouseDownHandler(e) {
        this.mouseDown = true;
        this.ctx.beginPath();
        const { x, y } = this.getMousePosition(e);
        this.ctx.moveTo(x, y);
        this.draw(x, y); // Рисуем локально
        this.sendSocketDraw({
            type: 'moveTo',
            x: x,
            y: y
        });
    }

    mouseMoveHandler(e) {
        if (this.mouseDown) {
            const { x, y } = this.getMousePosition(e);
            this.draw(x, y); // Рисуем локально
            this.sendSocketDraw({
                type: 'lineTo',
                x: x,
                y: y
            });
        }
    }

    touchStartHandler(e) {
        e.preventDefault();
        this.mouseDown = true;
        this.ctx.beginPath();
        const { x, y } = this.getTouchPosition(e);
        this.ctx.moveTo(x, y);
        this.draw(x, y); // Рисуем локально
        this.sendSocketDraw({
            type: 'moveTo',
            x: x,
            y: y
        });
    }


    touchMoveHandler(e) {
        e.preventDefault();
        if (this.mouseDown) {
            const { x, y } = this.getTouchPosition(e);
            this.draw(x, y); // Рисуем локально
            this.sendSocketDraw({
                type: 'lineTo',
                x: x,
                y: y
            });
        }
    }

    touchEndHandler() {
        this.mouseDown = false;
        this.sendSocketDraw({type: 'finish'});
    }

    draw(x, y) {
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    sendSocketDraw(figure) {
        this.socket.send(JSON.stringify({
            method: 'draw',
            id: this.id,
            figure: {
                ...figure,
                type: this.name,
                color: this.ctx.strokeStyle,
                lineWidth: this.ctx.lineWidth,
            }
        }));
    }

    static draw(ctx, x, y, color, lineWidth) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineTo(x, y);
        ctx.stroke();
    }

    static moveTo(ctx, x, y, color, lineWidth) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x, y);
    }

    static finish(ctx) {
        ctx.beginPath();
    }

    getMousePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    getTouchPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = event.touches[0];
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }
}