export default class Tool {
    constructor(canvas, socket, id) {
        this.canvas = canvas;
        this.socket = socket;
        this.id = id;
        this.ctx = canvas.getContext('2d');
        this.removeAllEventListeners(); // <-- очищаем обработчики при смене любого инструмента
    }

    set fillColor(color) { this.ctx.fillStyle = color; }
    set strokeColor(color) { this.ctx.strokeStyle = color; }
    set lineWidth(width) { this.ctx.lineWidth = width; }

    removeAllEventListeners() {
        const clone = this.canvas.cloneNode(true);
        this.canvas.parentNode.replaceChild(clone, this.canvas);

        // ВАЖНО: обновляем ссылку в глобальном состоянии
        if (window.toolState) {
            window.toolState.setCanvas(clone);
        }

        this.canvas = clone;
        this.ctx = this.canvas.getContext('2d');
    }
}