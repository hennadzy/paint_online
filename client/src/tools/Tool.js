export default class Tool {
    constructor(canvas, socket, id) {
        this.canvas = canvas;
        this.socket = socket;
        this.id = id;
        this.ctx = canvas.getContext('2d');

        // Уничтожаем все текущие обработчики событий на канвасе перед созданием нового инструмента
        this.clearAllCanvasEvents();
    }

    set fillColor(color) { this.ctx.fillStyle = color; }
    set strokeColor(color) { this.ctx.strokeStyle = color; }
    set lineWidth(width) { this.ctx.lineWidth = width; }

    clearAllCanvasEvents() {
        // Клонируем канвас, чтобы гарантированно удалить все события разом
        const newCanvas = this.canvas.cloneNode(true);
        this.canvas.parentNode.replaceChild(newCanvas, this.canvas);
        this.canvas = newCanvas;
        this.ctx = newCanvas.getContext('2d');
    }
}