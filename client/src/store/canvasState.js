import { makeAutoObservable, observable } from "mobx";

class CanvasState {
    canvas = null
    socket = null
    sessionid = null
    // Отдельные стеки для каждого пользователя
    userUndoStacks = new Map() // username -> [actions]
    userRedoStacks = new Map() // username -> [actions]
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
        // Инициализируем стеки для нового пользователя
        if (!this.userUndoStacks.has(username)) {
            this.userUndoStacks.set(username, [])
            this.userRedoStacks.set(username, [])
        }
    }

    setCanvas(canvas) {
        this.canvas = canvas
    }

    // Сохраняем действие для конкретного пользователя
    pushUserAction(username, action) {
        if (!this.userUndoStacks.has(username)) {
            this.userUndoStacks.set(username, [])
            this.userRedoStacks.set(username, [])
        }
        
        const undoStack = this.userUndoStacks.get(username)
        undoStack.push(action)
        
        // Очищаем redo стек при новом действии
        this.userRedoStacks.set(username, [])
        
        // Ограничиваем размер истории
        if (undoStack.length > 50) {
            undoStack.shift()
        }
    }

    // Отменяем последнее действие текущего пользователя
    undo() {
        const username = this.username
        if (!username) return

        const undoStack = this.userUndoStacks.get(username)
        const redoStack = this.userRedoStacks.get(username)
        
        if (!undoStack || undoStack.length === 0) return

        const lastAction = undoStack.pop()
        redoStack.push(lastAction)

        // Перерисовываем canvas без действий этого пользователя
        this.redrawCanvasWithoutUserActions(username, [lastAction])
    }

    // Возвращаем последнее отмененное действие
    redo() {
        const username = this.username
        if (!username) return

        const undoStack = this.userUndoStacks.get(username)
        const redoStack = this.userRedoStacks.get(username)
        
        if (!redoStack || redoStack.length === 0) return

        const actionToRestore = redoStack.pop()
        undoStack.push(actionToRestore)

        // Перерисовываем действие на canvas
        this.redrawAction(actionToRestore)
    }

    // Перерисовка canvas без определенных действий пользователя
    redrawCanvasWithoutUserActions(username, actionsToRemove) {
        const ctx = this.canvas.getContext('2d')
        
        // Очищаем canvas
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        // Перерисовываем все действия кроме удаляемых
        this.userUndoStacks.forEach((actions, user) => {
            actions.forEach(action => {
                if (user === username && actionsToRemove.includes(action)) {
                    return // Пропускаем удаляемые действия
                }
                this.redrawAction(action)
            })
        })
    }

    // Перерисовка конкретного действия
    redrawAction(action) {
        const ctx = this.canvas.getContext('2d')
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

    // Устаревшие методы для совместимости
    pushToUndo(data) {
        // Оставляем для совместимости, но используем новую систему
    }

    pushToRedo(data) {
        // Оставляем для совместимости
    }
}

export default new CanvasState()