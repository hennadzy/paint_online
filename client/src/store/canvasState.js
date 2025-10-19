import { makeAutoObservable, observable } from "mobx";

class CanvasState {
    canvas = null
    socket = null
    sessionid = null
    // Старая система для локального режима
    undoList = []
    redoList = []
    // Новая система для многопользовательского режима
    userActions = [] // Все действия со всех устройств с метаданными
    username = ""

    constructor() {
        makeAutoObservable(this, {
            canvas: observable,
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

    // Добавляем действие с информацией об авторе
    addUserAction(action) {
        this.userActions.push({
            ...action,
            id: Date.now() + Math.random(), // Уникальный ID
            timestamp: Date.now(),
            author: action.author || this.username
        })
        
        // Ограничиваем размер истории
        if (this.userActions.length > 200) {
            this.userActions.shift()
        }
    }

    // Старые методы для локального режима
    pushToUndo(data) {
        this.undoList.push(data)
        // Очищаем redo при новом действии
        this.redoList = []
    }

    pushToRedo(data) {
        this.redoList.push(data)
    }

    // Undo/Redo для многопользовательского режима
    undoMultiuser() {
        if (!this.username) return
        
        // Находим последнее действие текущего пользователя
        for (let i = this.userActions.length - 1; i >= 0; i--) {
            const action = this.userActions[i]
            if (action.author === this.username && !action.undone) {
                // Помечаем как отмененное
                action.undone = true
                action.undoneAt = Date.now()
                
                // Перерисовываем весь canvas
                this.redrawCanvas()
                
                // Отправляем информацию о undo другим пользователям
                if (this.socket) {
                    this.socket.send(JSON.stringify({
                        method: "undo",
                        id: this.sessionid,
                        username: this.username,
                        actionId: action.id
                    }))
                }
                break
            }
        }
    }

    redoMultiuser() {
        if (!this.username) return
        
        // Находим последнее отмененное действие текущего пользователя
        let lastUndoneAction = null
        let lastUndoneIndex = -1
        
        for (let i = this.userActions.length - 1; i >= 0; i--) {
            const action = this.userActions[i]
            if (action.author === this.username && action.undone) {
                if (!lastUndoneAction || action.undoneAt > lastUndoneAction.undoneAt) {
                    lastUndoneAction = action
                    lastUndoneIndex = i
                }
            }
        }
        
        if (lastUndoneAction) {
            // Снимаем отметку об отмене
            delete lastUndoneAction.undone
            delete lastUndoneAction.undoneAt
            
            // Перерисовываем весь canvas
            this.redrawCanvas()
            
            // Отправляем информацию о redo другим пользователям
            if (this.socket) {
                this.socket.send(JSON.stringify({
                    method: "redo", 
                    id: this.sessionid,
                    username: this.username,
                    actionId: lastUndoneAction.id
                }))
            }
        }
    }

    // Обработка undo/redo от других пользователей
    handleRemoteUndo(actionId) {
        const action = this.userActions.find(a => a.id === actionId)
        if (action) {
            action.undone = trueaction.undoneAt = Date.now()
            this.redrawCanvas()
        }
    }

    handleRemoteRedo(actionId) {
        const action = this.userActions.find(a => a.id === actionId)
        if (action && action.undone) {
            delete action.undone
            delete action.undoneAt
            this.redrawCanvas()
        }
    }

    // Универсальная функция undo/redo
    undo() {
        if (this.username && this.socket) {
            // Многопользовательский режим
            this.undoMultiuser()
        } else {
            // Локальный режим
            this.undoLocal()
        }
    }

    redo() {
        if (this.username && this.socket) {
            // Многопользовательский режим
            this.redoMultiuser()
        } else {
            // Локальный режим
            this.redoLocal()
        }
    }

    // Локальный undo/redo
    undoLocal() {
        let ctx = this.canvas.getContext('2d')
        if (this.undoList.length > 0) {
            let dataUrl = this.undoList.pop()
            this.redoList.push(this.canvas.toDataURL())
            let img = new Image()
            img.src = dataUrl
            img.onload = () => {
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
                ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height)
            }
        } else {
            this.redoList.push(this.canvas.toDataURL())
            ctx.fillStyle = "white"
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
        }
    }

    redoLocal() {
        let ctx = this.canvas.getContext('2d')
        if (this.redoList.length > 0) {
            let dataUrl = this.redoList.pop()
            this.undoList.push(this.canvas.toDataURL())
            let img = new Image()
            img.src = dataUrl
            img.onload = () => {
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
                ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height)
            }
        }
    }

    // Перерисовка всего canvas на основе истории действий
    redrawCanvas() {
        const ctx = this.canvas.getContext('2d')
        
        // Очищаем canvas
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        // Перерисовываем все не отмененные действия
        this.userActions.forEach(action => {
            if (!action.undone) {
                this.redrawAction(ctx, action)
            }
        })
    }

    // Перерисовка конкретного действия
    redrawAction(ctx, action) {
        ctx.save()

        switch (action.type) {
            case "brush":
                this.redrawBrushStroke(ctx, action)
                break
            case "eraser":
                this.redrawEraserStroke(ctx, action)
                break
            case "rect":
                ctx.strokeStyle = action.strokeStyle
                ctx.lineWidth = action.lineWidth
                ctx.beginPath()
                ctx.rect(action.x, action.y, action.width, action.height)
                ctx.stroke()
                break
            case "circle":
                ctx.strokeStyle = action.strokeStyle
                ctx.lineWidth = action.lineWidth
                ctx.beginPath()
                ctx.arc(action.x, action.y, action.radius, 0, 2 * Math.PI)
                ctx.stroke()
                break
            case "line":
                ctx.strokeStyle = action.strokeStyle
                ctx.lineWidth = action.lineWidth
                ctx.beginPath()
                ctx.moveTo(action.x1, action.y1)
                ctx.lineTo(action.x2, action.y2)
                ctx.stroke()
                break
        }

        ctx.restore()
    }

    // Перерисовка мазка кисти
    redrawBrushStroke(ctx, action) {
        if (!action.points || action.points.length < 2) return

        ctx.strokeStyle = action.strokeStyle
        ctx.lineWidth = action.lineWidth
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.beginPath()
        
        ctx.moveTo(action.points[0].x, action.points[0].y)
        for (let i = 1; i < action.points.length; i++) {
            ctx.lineTo(action.points[i].x, action.points[i].y)
        }
        ctx.stroke()
    }

    // Перерисовка мазка ластика
    redrawEraserStroke(ctx, action) {
        if (!action.points || action.points.length < 2) return

        ctx.globalCompositeOperation = "destination-out"
        ctx.lineWidth = action.lineWidth
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.beginPath()
        
        ctx.moveTo(action.points[0].x, action.points[0].y)
        for (let i = 1; i < action.points.length; i++) {
            ctx.lineTo(action.points[i].x, action.points[i].y)
        }
        ctx.stroke()
    }
}

export default new CanvasState()