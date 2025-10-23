import { makeAutoObservable, observable } from "mobx";


class CanvasState {
    canvas = null
    socket = null
    sessionid = null
    undoList = []
    redoList = []
    username = ""

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

    pushToUndo(data) {
        this.undoList.push(data)
    }

    pushToRedo(data) {
        this.redoList.push(data)
    }

    undo() {
        let ctx = this.canvas.getContext('2d')
        if (this.undoList.length > 0) {
            let dataUrl = this.undoList.pop()
            this.redoList.push(this.canvas.toDataURL())
            let img = new Image()
            img.src = dataUrl
            img.onload =  () => {
                ctx.clearRect(0,0, this.canvas.width, this.canvas.height)
                ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height)
            }
            // Send undo to other users
            if (this.socket) {
                this.socket.send(JSON.stringify({
                    method: "undo",
                    id: this.sessionid,
                    username: this.username,
                    dataURL: dataUrl
                }));
            }
        } else {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
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
            // Send redo to other users
            if (this.socket) {
                this.socket.send(JSON.stringify({
                    method: "redo",
                    id: this.sessionid,
                    username: this.username,
                    dataURL: dataUrl
                }));
            }
        }
    }

}

export default new CanvasState()
