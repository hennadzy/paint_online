import {makeAutoObservable} from "mobx";

class CanvasState {
    canvas = null
    socket = null
    sessionid = null
    undoList = []
    redoList = []
    username = ""

    constructor() {
        makeAutoObservable(this)
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

    pushToUndo(data) {
        this.undoList.push(data)
    }

    pushToRedo(data) {
        this.redoList.push(data)
    }

    undo() {
        let ctx = this.canvas.getContext('2d');
        if (this.undoList.length > 0) {
            const lastAction = this.undoList.pop();
            if (lastAction.username === this.username) {
                this.redoList.push({
                    username: this.username,
                    data: this.canvas.toDataURL()
                });
                let img = new Image();
                img.src = lastAction.data;
                img.onload = () => {
                    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
    
                    // Отправка изменений через WebSocket
                    if (this.socket) {
                        this.socket.send(JSON.stringify({
                            method: "undo",
                            id: this.sessionid,
                            username: this.username,
                            data: lastAction.data,
                        }));
                    }
                };
            }
        }
    }
    

    redo() {
        let ctx = this.canvas.getContext('2d')
        if (this.redoList.length > 0) {
            let dataUrl = this.redoList.pop()
            this.undoList.push(this.canvas.toDataURL())
            let img = new Image()
            img.src = dataUrl
            img.onload =  () => {
                ctx.clearRect(0,0, this.canvas.width, this.canvas.height)
                ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height)
            }
        }
    }

}

export default new CanvasState()
