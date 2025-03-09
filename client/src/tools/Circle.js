import Tool from "./Tool";

export default class Circle extends Tool {
    constructor(canvas, socket, id) {
        super(canvas, socket, id);
        this.mouseDown = false;
        this.startX = 0;
        this.startY = 0;
        this.r = 0;
        this.saved = "";
        this.destroyEvents();
        this.listen();
    }


    listen() {
        // Мышь
        this.canvas.onmousemove = this.mouseMoveHandler.bind(this);
        this.canvas.onmousedown = this.mouseDownHandler.bind(this);
        this.canvas.onmouseup = this.mouseUpHandler.bind(this);

        // Сенсор
        this.canvas.addEventListener('touchstart', this.touchStartHandler.bind(this));
        this.canvas.addEventListener('touchmove', this.touchMoveHandler.bind(this));
        this.canvas.addEventListener('touchend', this.touchEndHandler.bind(this));
        this.canvas.addEventListener('touchcancel', this.touchEndHandler.bind(this)); // На всякий случай
    }

    // --- Обработчики событий мыши ---
    mouseUpHandler(e) {
        this.mouseDown = false;
        this.sendCircleData();
        if (this.socket) {
            this.socket.send(JSON.stringify({
                method: 'draw',
                id: this.id,
                figure: { type: 'finish' }
            }));
        }
    }
    mouseDownHandler(e) {
        this.mouseDown = true;
        this.ctx.beginPath();
        this.startX = e.pageX - e.target.offsetLeft;
        this.startY = e.pageY - e.target.offsetTop;
        this.saved = this.canvas.toDataURL();
        this.sendStartData();
    }

    mouseMoveHandler(e) {
        if (this.mouseDown) {
            let currentX = e.pageX - e.target.offsetLeft;
            let currentY = e.pageY - e.target.offsetTop;
            this.calculateRadiusAndDraw(currentX, currentY)
        }
    }

    // --- Обработчики сенсорных событий ---
    touchStartHandler(e) {
        this.mouseDown = true;
        this.ctx.beginPath();
        this.startX = e.touches[0].pageX - e.target.offsetLeft;
        this.startY = e.touches[0].pageY - e.target.offsetTop;
        this.saved = this.canvas.toDataURL();
        this.sendStartData();
    }

    touchMoveHandler(e) {
        e.preventDefault();
        if (this.mouseDown) {
            let currentX = e.touches[0].pageX - e.target.offsetLeft;
            let currentY = e.touches[0].pageY - e.target.offsetTop;
            this.calculateRadiusAndDraw(currentX, currentY)
        }
    }


    touchEndHandler() {
        this.mouseDown = false;
        this.sendCircleData();
        this.socket.send(JSON.stringify({
            method: 'draw',
            id: this.id,
            figure: {
                type: 'finish',
            }
        }))
    }

    // Общая функция для отправки данных об окружности
    sendCircleData() {
        if (this.socket) {
            this.socket.send(JSON.stringify({
                method: 'draw',
                id: this.id,
                figure: {
                    type: 'circle',
                    x: this.startX,
                    y: this.startY,
                    r: this.r,
                    color: this.ctx.fillStyle,
                    lineWidth: this.ctx.lineWidth,
                    strokeStyle: this.ctx.strokeStyle
                }
            }));
            this.socket.send(JSON.stringify({
                method: 'draw',
                id: this.id,
                figure: { type: 'finish' }
            }));
        }

        Circle.staticDraw(
            this.ctx,
            this.startX,
            this.startY,
            this.r,
            this.ctx.fillStyle,
            this.ctx.lineWidth,
            this.ctx.strokeStyle
        );
    }
    // Общая функция для отправки данных о начале рисования
    sendStartData() {
        if (this.socket) {
            const lineWidth = this.ctx.lineWidth;
            const strokeStyle = this.ctx.strokeStyle;
            this.socket.send(JSON.stringify({
                method: 'draw',
                id: this.id,
                figure: {
                    type: 'circle',
                    lineWidth,
                    strokeStyle,
                }
            }));
        }
    }

    // Общая функция для расчета радиуса и отрисовки
    calculateRadiusAndDraw(currentX, currentY) {
        let width = currentX - this.startX;
        let height = currentY - this.startY;
        this.r = Math.sqrt(width ** 2 + height ** 2)
        this.draw(this.startX, this.startY, this.r)
    }

    draw(x, y, r) {
        const img = new Image()
        img.src = this.saved
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height)
            this.ctx.beginPath()
            this.ctx.arc(x, y, r, 0, 2 * Math.PI)
            this.ctx.fill()
            this.ctx.stroke()
        }
    }


    static staticDraw(ctx, x, y, r, lineWidth, strokeStyle, color) {
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.beginPath()
        ctx.arc(x, y, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    }
}