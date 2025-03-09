export default class Tool {
    constructor(canvas, socket, id) {
        this.canvas = canvas;
        this.socket = socket;
        this.id = id;
        this.ctx = canvas.getContext('2d');

        if (Tool.activeTool) {
            Tool.activeTool.destroyEvents(); // Очистить события предыдущего инструмента
        }
        Tool.activeTool = this; // Запоминаем активный инструмент
    }

    set fillColor(color) {
        this.ctx.fillStyle = color;
    }

    set strokeColor(color) {
        this.ctx.strokeStyle = color;
    }

    set lineWidth(width) {
        this.ctx.lineWidth = width;
    }

    destroyEvents() {
        // Пустой метод. Переопределяется в потомках.
    }
}