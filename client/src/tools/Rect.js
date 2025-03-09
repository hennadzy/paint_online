import Tool from "./Tool";

export default class Rect extends Tool {
    constructor(canvas, socket, id) {
        super(canvas, socket, id);
        this.mouseDown = false;

        this.listen();
    }

    listen() {
        this.canvas.addEventListener('mousedown', this.mouseDownHandler.bind(this));
        this.canvas.addEventListener('mousemove', this.mouseMoveHandler.bind(this));
        this.canvas.addEventListener('mouseup', this.mouseUpHandler.bind(this));

        this.canvas.addEventListener('touchstart', this.touchStartHandler.bind(this),{passive:false});
        this.canvas.addEventListener('touchmove', this.touchMoveHandler.bind(this),{passive:false});
        this.canvas.addEventListener('touchend', this.touchEndHandler.bind(this),{passive:false});
    }

    mouseDownHandler(e) {
        this.mouseDown = true;
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;
        this.saved = this.canvas.toDataURL();
    }

    mouseMoveHandler(e) {
        if(this.mouseDown) {
            const rect = this.canvas.getBoundingClientRect();
            this.currentX = e.clientX - rect.left;
            this.currentY = e.clientY - rect.top;
            this.draw(this.startX, this.startY, this.currentX - this.startX, this.currentY - this.startY);
        }
    }
    mouseUpHandler() {
        this.mouseDown = false;
        this.sendRect();
    }

    touchStartHandler(e){
        e.preventDefault();
        this.mouseDown = true;
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.touches[0].clientX - rect.left;
        this.startY = e.touches[0].clientY - rect.top;
        this.saved = this.canvas.toDataURL();
    }

    touchMoveHandler(e){
        e.preventDefault();
        if(this.mouseDown){
            const rect = this.canvas.getBoundingClientRect();
            this.currentX = e.touches[0].clientX - rect.left;
            this.currentY = e.touches[0].clientY - rect.top;
            this.draw(this.startX, this.startY, this.currentX - this.startX, this.currentY - this.startY);
        }
    }

    touchEndHandler(e){
        e.preventDefault();
        this.mouseDown = false;
        this.sendRect();
    }

    sendRect(){
        this.socket.send(JSON.stringify({
            method: 'draw',
            id: this.id,
            figure:{
                type: 'rect',
                x: this.startX,
                y: this.startY,
                width: this.currentX - this.startX,
                height: this.currentY - this.startY,
                fillStyle: this.ctx.fillStyle,
                strokeStyle: this.ctx.strokeStyle,
                lineWidth: this.ctx.lineWidth,
            }
        }));
        this.socket.send(JSON.stringify({method: 'draw', id: this.id, figure: {type: 'finish'}}));
    }

    draw(x,y,w,h){
        const img = new Image();
        img.src = this.saved;
        img.onload = ()=>{
            this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
            this.ctx.drawImage(img,0,0,this.canvas.width,this.canvas.height);
            this.ctx.beginPath();
            this.ctx.rect(x,y,w,h);
            this.ctx.fill();
            this.ctx.stroke();
        }
    }

    static staticDraw(ctx, x, y, w, h, lineWidth, strokeStyle, fillStyle){
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = strokeStyle;
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.rect(x,y,w,h);
        ctx.fill();
        ctx.stroke();
    }
}