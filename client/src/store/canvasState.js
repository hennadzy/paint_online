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
        // ✅ Проверяем, что действие не дублируется
        const existingAction = this.userActions.find(a => 
            a.id === action.id
        );
        
        if (!existingAction && action.id) {
            const newAction = {
                ...action,
                timestamp: action.timestamp || Date.now(),
                author: action.author || this.username
            };
            
            this.userActions.push(newAction);
            console.log("Добавлено действие:", newAction); // ✅ Для отладки
            
            // Ограничиваем размер истории
            if (this.userActions.length > 500) {
                this.userActions.shift();
            }
        }
    }

    // Старые методы для локального режима
    pushToUndo(data) {
        this.undoList.push(data)
        this.redoList = []
    }

    pushToRedo(data) {
        this.redoList.push(data)
    }

    // Undo/Redo для многопользовательского режима
    undoMultiuser() {
        if (!this.username) return
        
        console.log("undoMultiuser для:", this.username); // ✅ Для отладки
        
        // Находим последнее НЕотмененное действие текущего пользователя
        for (let i = this.userActions.length - 1; i >= 0; i--) {
            const action = this.userActions[i]
            if (action.author === this.username && !action.undone) {
                console.log("Отменяем действие:", action); // ✅ Для отладки
                
                // Помечаем как отмененное
                action.undone = true
                action.undoneAt = Date.now()
                
                // ✅ ВАЖНО: Перерисовываем canvas ЛОКАЛЬНО
                this.redrawCanvas()
                
                // ✅ Отправляем команду undo на сервер для синхронизации с другими пользователями
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
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
        
        console.log("redoMultiuser для:", this.username); // ✅ Для отладки
        
        // Находим последнее отмененное действие текущего пользователя (по времени отмены)
        let lastUndoneAction = null
        
        for (let i = this.userActions.length - 1; i >= 0; i--) {
            const action = this.userActions[i]
            if (action.author === this.username && action.undone) {
                if (!lastUndoneAction || action.undoneAt > lastUndoneAction.undoneAt) {
                    lastUndoneAction = action
                }
            }
        }
        
        if (lastUndoneAction) {
            console.log("Возвращаем действие:", lastUndoneAction); // ✅ Для отладки
            
            // Снимаем отметку об отмене
            delete lastUndoneAction.undone
            delete lastUndoneAction.undoneAt
            
            // ✅ВАЖНО: Перерисовываем canvas ЛОКАЛЬНО
            this.redrawCanvas()
            
            // ✅ Отправляем команду redo на сервер для синхронизации с другими пользователями
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    method: "redo", 
                    id: this.sessionid,
                    username: this.username,
                    actionId: lastUndoneAction.id
                }))
            }
        }
    }

    // ✅ Обработка undo/redo от других пользователей (убираем ограничения)
    handleRemoteUndo(actionId, fromUsername) {
        console.log("handleRemoteUndo:", actionId, "от", fromUsername); // ✅ Для отладки
        const action = this.userActions.find(a => a.id === actionId)
        if (action) {
            console.log("Найдено действие для undo:", action); // ✅ Для отладки
            action.undone = true
            action.undoneAt = Date.now()
            this.redrawCanvas()
        } else {
            console.log("Действие не найдено для undo:", actionId); // ✅ Для отладки
        }
    }

    handleRemoteRedo(actionId, fromUsername) {
        console.log("handleRemoteRedo:", actionId, "от", fromUsername); // ✅ Для отладки
        const action = this.userActions.find(a => a.id === actionId)
        if (action && action.undone) {
            console.log("Найдено действие для redo:", action); // ✅ Для отладки
            delete action.undone
            delete action.undoneAt
            this.redrawCanvas()
        } else {
            console.log("Действие не найдено для redo:", actionId); // ✅ Для отладки
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

    // Локальный undo/redo (как было раньше)
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

    // ✅ Перерисовка всего canvas на основе истории действий
    redrawCanvas() {
        if (!this.canvas) return;
        
        console.log("Перерисовка canvas, всего действий:", this.userActions.length); // ✅ Для отладки
        
        const ctx = this.canvas.getContext('2d')
        
        // Очищаем canvas
        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

        // ✅ Сортируем действия по времени создания для правильного порядка отрисовки
        const sortedActions = [...this.userActions].sort((a, b) => a.timestamp - b.timestamp);

        let drawnCount= 0;
        // Перерисовываем все не отмененные действия
        sortedActions.forEach(action => {
            if (!action.undone) {
                this.redrawAction(ctx, action);
                drawnCount++;
            }
        });
        
        console.log("Нарисовано действий:", drawnCount); // ✅ Для отладки
    }

    // Перерисовка конкретного действия
    redrawAction(ctx, action) {
        ctx.save()

        try {
            switch (action.type) {
                case "brush":
                    this.redrawBrushStroke(ctx, action)
                    break
                case "eraser":
                    this.redrawEraserStroke(ctx, action)
                    break
                case "rect":
                    ctx.strokeStyle = action.strokeStyle || "#000000"
                    ctx.lineWidth = action.lineWidth || 1
                    ctx.beginPath()
                    ctx.rect(action.x, action.y, action.width, action.height)
                    ctx.stroke()
                    break
                case "circle":
                    ctx.strokeStyle = action.strokeStyle || "#000000"
                    ctx.lineWidth = action.lineWidth || 1
                    ctx.beginPath()
                    ctx.arc(action.x, action.y, action.radius, 0, 2 * Math.PI)
                    ctx.stroke()
                    break
                case "line":
                    ctx.strokeStyle = action.strokeStyle || "#000000"
                    ctx.lineWidth = action.lineWidth || 1
                    ctx.beginPath()
                    ctx.moveTo(action.x1, action.y1)
                    ctx.lineTo(action.x2, action.y2)
                    ctx.stroke()
                    break
            }
        } catch (error) {
            console.error("Ошибка при отрисовке действия:", error, action);
        }

        ctx.restore()
    }

    // ✅ Перерисовка мазка кисти
    redrawBrushStroke(ctx, action) {
        if (!action.points || action.points.length === 0) return

        ctx.strokeStyle = action.strokeStyle || "#000000"
        ctx.lineWidth = action.lineWidth || 1
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        
        ctx.beginPath()
        
        if (action.points.length === 1) {
            // Если только одна точка, рисуем точку
            const point = action.points[0]
            ctx.beginPath()
            ctx.arc(point.x, point.y, action.lineWidth / 2, 0, 2 * Math.PI)
            ctx.fill()
        } else {
            // Если несколько точек, рисуем линию
            ctx.moveTo(action.points[0].x, action.points[0].y)
            for (let i = 1; i < action.points.length; i++) {
                ctx.lineTo(action.points[i].x, action.points[i].y)
            }
            ctx.stroke()
        }
    }

    // ✅ Перерисовка мазка ластика
    redrawEraserStroke(ctx, action) {
        if (!action.points || action.points.length === 0) return

        ctx.globalCompositeOperation = "destination-out"
        ctx.lineWidth = action.lineWidth || 10
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        
        ctx.beginPath()
        
        if (action.points.length === 1) {
            // Если только одна точка, стираем точку
            const point = action.points[0]
            ctx.beginPath()
            ctx.arc(point.x, point.y, action.lineWidth / 2, 0, 2 * Math.PI)
            ctx.fill()
        } else {
            // Если несколько точек, стираем линию
            ctx.moveTo(action.points[0].x, action.points[0].y)
            for (let i = 1; i < action.points.length; i++) {
                ctx.lineTo(action.points[i].x, action.points[i].y)
            }
            ctx.stroke()
        }
    }
}

export default new CanvasState()