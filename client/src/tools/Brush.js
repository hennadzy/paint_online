import Tool from "./Tool";

export default class Brush extends Tool {
    constructor(canvas, socket, id) {
        super(canvas, socket, id);
        this.mouseDown = false;
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

     // Общая функция рисования
     sendDrawData(x, y, isStart = false) {
        const lineWidth = this.ctx.lineWidth;
        const strokeStyle = this.ctx.strokeStyle;
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
        }))
    }

    // --- Обработчики событий мыши ---
    mouseUpHandler(e) {
        this.mouseDown = false;
        this.socket.send(JSON.stringify({
            method: 'draw',
            id: this.id,
            figure: {
                type: 'finish',
            }
        }))
    }

    mouseDownHandler(e) {
        this.mouseDown = true;
        this.ctx.beginPath();
        this.ctx.moveTo(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop);
       this.sendDrawData(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop, true);
    }

    mouseMoveHandler(e) {
        if (this.mouseDown) {
             this.sendDrawData(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop)
        }
    }

    // --- Обработчики сенсорных событий ---

    touchStartHandler(e) {
        this.mouseDown = true;
        this.ctx.beginPath();
        this.ctx.moveTo(e.touches[0].pageX - e.target.offsetLeft, e.touches[0].pageY - e.target.offsetTop);
         this.sendDrawData(e.touches[0].pageX - e.target.offsetLeft, e.touches[0].pageY - e.target.offsetTop, true)
    }


    touchMoveHandler(e) {
        e.preventDefault(); // Предотвращаем прокрутку
        if (this.mouseDown) {
         this.sendDrawData(e.touches[0].pageX - e.target.offsetLeft, e.touches[0].pageY - e.target.offsetTop)
        }
    }


    touchEndHandler() {
      this.mouseDown = false;
        this.socket.send(JSON.stringify({
            method: 'draw',
            id: this.id,
            figure: {
                type: 'finish',
            }
        }))
    }

    // Статический метод для отрисовки
    static staticDraw(ctx, x, y, lineWidth, strokeStyle, isStart = false) {
        if(isStart){
            ctx.beginPath();
            ctx.moveTo(x,y);
        }
         ctx.lineTo(x, y);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.stroke();
    }
}