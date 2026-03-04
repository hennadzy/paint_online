// server/services/WebSocketHandler.js
const WebSocket = require('ws');
const RoomManager = require('./RoomManager');
const DataStore = require('./DataStore');
const { sanitizeInput, sanitizeChatMessage, sanitizeUsername, checkSpam } = require('../utils/security');
const { verifyToken } = require('../utils/jwt');

class WebSocketHandler {
  constructor() {
    this.wsMessageLimits = new Map(); // для rate limiting
  }

  // Проверка rate limiting (оставляем без изменений)
  checkRateLimit(ws) {
    const now = Date.now();
    const limit = this.wsMessageLimits.get(ws) || { count: 0, resetTime: now + 1000 };
    if (now > limit.resetTime) {
      this.wsMessageLimits.set(ws, { count: 1, resetTime: now + 1000 });
      return true;
    }
    if (limit.count >= 50) {
      return false;
    }
    limit.count++;
    return true;
  }

  // Рассылка сообщения всем в комнате (кроме исключённого)
  broadcast(roomId, message, excludeWs = null) {
    const sockets = RoomManager.getRoomSockets(roomId);
    if (!sockets) return;
    const messageString = JSON.stringify(message);
    sockets.forEach(ws => {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageString);
        } catch (error) {
          // Игнорируем ошибки отправки
        }
      }
    });
  }

  // Обработка подключения
  async handleConnection(ws, msg) {
    const token = msg.token;
    const roomId = sanitizeInput(msg.id, 20);
    let username = sanitizeUsername(msg.username);
    
    if (!token || !roomId || !username) {
      ws.close(1008, 'Invalid request');
      return;
    }
    
    if (username.length < 2) {
      ws.close(1008, 'Username too short');
      return;
    }
    
    const payload = verifyToken(token);
    
    if (!payload) {
      ws.close(1008, 'Invalid or expired token');
      return;
    }
    
    const sanitizedPayloadUsername = sanitizeUsername(payload.username);
    if (payload.roomId !== roomId || sanitizedPayloadUsername !== username) {
      ws.close(1008, 'Token mismatch');
      return;
    }
    
    const roomInfo = await DataStore.getRoomInfo(roomId);
    
    if (!roomInfo) {
      ws.close(1008, 'Room not found');
      return;
    }
    
    if (!roomInfo.isPublic && payload.isPublic) {
      ws.close(1008, 'Invalid token for private room');
      return;
    }
    
    try {
      // Добавляем пользователя через новый RoomManager
      const { strokes } = await RoomManager.addUser(roomId, username, ws);
      
      // Отправляем текущие штрихи
      ws.send(JSON.stringify({ 
        method: "draws", 
        strokes 
      }));
      
      // Оповещаем всех о новом пользователе
      this.broadcast(roomId, { method: 'connection', username });
      
      // Отправляем обновлённый список пользователей
      const users = await RoomManager.getRoomUsers(roomId);
      this.broadcast(roomId, { 
        method: "users", 
        users 
      });
      
    } catch (error) {
      ws.close(1008, error.message);
    }
  }

  // Обработка рисования
  async handleDraw(ws, msg) {
    const userInfo = await RoomManager.getUserInfo(ws);
    if (!userInfo) return;
    const { roomId, username } = userInfo;
    
    if (msg.figure) {
      if (msg.figure.type === "undo") {
        // В текущей реализации undo не удаляет из БД, только из Redis
        // Просто рассылаем команду остальным
        this.broadcast(roomId, { 
          method: "draw", 
          username, 
          figure: { type: "undo", strokeId: msg.figure.strokeId } 
        }, ws);
        await RoomManager.updateUserActivity(ws);
        return;
      } 
      else if (msg.figure.type === "redo") {
        const stroke = msg.figure.stroke;
        if (!stroke) return;
        if (stroke.username && String(stroke.username).trim() !== String(username).trim()) {
          return;
        }
        
        // Добавляем штрих в Redis
        await RoomManager.addStroke(roomId, stroke);
        
        // Рассылаем всем
        this.broadcast(roomId, { 
          method: "draw", 
          username, 
          figure: { type: "redo", stroke } 
        }, ws);
        await RoomManager.updateUserActivity(ws);
        return;
      } 
      else {
        // Обычный штрих
        await RoomManager.addStroke(roomId, msg.figure);
      }
    }
    
    // Рассылаем всем, кроме отправителя
    this.broadcast(roomId, { ...msg, username }, ws);
    await RoomManager.updateUserActivity(ws);
  }

  // Обработка очистки холста
  async handleClear(ws, msg) {
    const userInfo = await RoomManager.getUserInfo(ws);
    if (!userInfo) return;
    const { roomId, username } = userInfo;
    
    await RoomManager.clearStrokes(roomId);
    this.broadcast(roomId, { method: "clear", username }, ws);
    await RoomManager.updateUserActivity(ws);
  }

  // Обработка сообщений чата (без изменений, но добавим сохранение в Redis опционально)
  async handleChat(ws, msg) {
    const userInfo = await RoomManager.getUserInfo(ws);
    if (!userInfo) return;
    const { roomId, username } = userInfo;
    
    const room = RoomManager.getRoomSockets(roomId); // нам нужна только рассылка, но для проверки спама нужно где-то хранить историю
    // Пока оставляем как есть, без сохранения истории в Redis
    // Но для rate limiting сообщений можно использовать Redis позже
    
    const message = sanitizeChatMessage(msg.message);
    
    if (!message || message.trim().length === 0) {
      return;
    }
    
    this.broadcast(roomId, { method: "chat", username, message }, ws);
    await RoomManager.updateUserActivity(ws);
  }

  // Главный обработчик входящих сообщений
  handleMessage(ws, msgStr) {
    try {
      if (!this.checkRateLimit(ws)) {
        ws.close(1008, 'Rate limit exceeded');
        return;
      }
      const msg = JSON.parse(msgStr);
      switch (msg.method) {
        case "connection":
          this.handleConnection(ws, msg);
          break;
        case "draw":
          this.handleDraw(ws, msg);
          break;
        case "clear":
          this.handleClear(ws, msg);
          break;
        case "chat":
          this.handleChat(ws, msg);
          break;
      }
    } catch (error) {
      // Игнорируем ошибки парсинга
    }
  }

  // Обработка закрытия соединения
  async handleClose(ws) {
    this.wsMessageLimits.delete(ws);
    const userInfo = await RoomManager.removeUser(ws);
    if (userInfo) {
      const { roomId, username } = userInfo;
      this.broadcast(roomId, { method: 'disconnection', username });
      const users = await RoomManager.getRoomUsers(roomId);
      this.broadcast(roomId, { 
        method: "users", 
        users 
      });
    }
  }

  // Настройка нового подключения
  setupConnection(ws) {
    // Генерируем уникальный ID для этого соединения (используется в RoomManager)
    ws._id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    ws.on('message', (msgStr) => this.handleMessage(ws, msgStr));
    ws.on('close', () => this.handleClose(ws));
    ws.on('error', () => {});
  }
}

module.exports = new WebSocketHandler();
