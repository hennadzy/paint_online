import { makeAutoObservable, observable } from "mobx";


class CanvasState {
    canvas = null
    socket = null
    sessionid = null
    undoList = []
    redoList = []
    username = ""
    layers = new Map() // username -> canvas element
    currentLayer = null

    constructor() {
  makeAutoObservable(this, {
    canvas: observable, // ← теперь canvas реактивен
  });
}

    setSessionId(id) {
        this.sessionid = id
    }
    setSocket(socket) {
        this.socket = socket
    } 

    setUsername(username) {
        this.username = username
    }

    setCanvas(canvas) {
        this.canvas = canvas
    }

    createLayer(username) {
        if (!this.layers.has(username)) {
            const layer = document.createElement('canvas');
            layer.width = this.canvas.width;
            layer.height = this.canvas.height;
            layer.style.position = 'absolute';
            layer.style.top = '80px'; // совпадает с margin-top основного холста
            layer.style.left = '0';
            layer.style.pointerEvents = 'none'; // слой не перехватывает события мыши
            layer.style.zIndex = '1'; // слой поверх основного холста
            this.layers.set(username, layer);
        }
        return this.layers.get(username);
    }

    setCurrentLayer(layer) {
        this.currentLayer = layer;
    }

    getLayer(username) {
        return this.layers.get(username);
    }

    pushToUndo(data) {
        this.undoList.push(data)
    }

    pushToRedo(data) {
        this.redoList.push(data)
    }

    undo() {
        if (this.undoList.length > 0) {
            let dataUrl = this.undoList.pop()
            this.redoList.push(this.currentLayer.toDataURL())
            let img = new Image()
            img.src = dataUrl
            img.onload =  () => {
                const ctx = this.currentLayer.getContext('2d')
                ctx.clearRect(0,0, this.currentLayer.width, this.currentLayer.height)
                ctx.drawImage(img, 0, 0, this.currentLayer.width, this.currentLayer.height)
            }
            // Send undo to other users via draw message
            if (this.socket) {
                this.socket.send(JSON.stringify({
                    method: "draw",
                    id: this.sessionid,
                    username: this.username,
                    figure: {
                        type: "undo",
                        dataURL: dataUrl,
                        username: this.username
                    }
                }));
            }
        } else {
            const ctx = this.currentLayer.getContext('2d')
            ctx.clearRect(0, 0, this.currentLayer.width, this.currentLayer.height)
        }
    }

    redo() {
        if (this.redoList.length > 0) {
            let dataUrl = this.redoList.pop()
            this.undoList.push(this.currentLayer.toDataURL())
            let img = new Image()
            img.src = dataUrl
            img.onload =  () => {
                const ctx = this.currentLayer.getContext('2d')
                ctx.clearRect(0,0, this.currentLayer.width, this.currentLayer.height)
                ctx.drawImage(img, 0, 0, this.currentLayer.width, this.currentLayer.height)
            }
            // Send redo to other users via draw message
            if (this.socket) {
                this.socket.send(JSON.stringify({
                    method: "draw",
                    id: this.sessionid,
                    username: this.username,
                    figure: {
                        type: "redo",
                        dataURL: dataUrl,
                        username: this.username
                    }
                }));
            }
        }
    }

}

export default new CanvasState()
