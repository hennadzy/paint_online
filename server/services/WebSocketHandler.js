const WebSocket = require('ws');
const RoomManager = require('./RoomManager');
const DataStore = require('./DataStore');
const { sanitizeInput, sanitizeChatMessage, sanitizeUsername, checkSpam } = require('../utils/security');
const { verifyToken } = require('../utils/jwt');

class WebSocketHandler {
  constructor() {
    this.wsMessageLimits = new Map();
    // Глобальный реестр: userId -> ws (для маршрутизации личных сообщений)
    this.userSockets = new Map();
  }

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

  broadcast(roomId, message, excludeWs = null) {
    const sockets = RoomManager.getRoomSockets(roomId);
    if (!sockets) return;
    const messageString = JSON.stringify(message);
    sockets.forEach(ws => {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageString);
        } catch (error) {
        }
      }
    });
  }

async handleConnection(ws, msg) {
    const token = msg.token;
    const roomId = sanitizeInput(msg.id, 20);
    
    // Verify token and check if user is privileged
    const payload = verifyToken(token);
    const isPrivileged = payload && (payload.role === 'admin' || payload.role === 'superadmin');
    
    let username = sanitizeUsername(msg.username, isPrivileged);
    const isVerified = Boolean(msg.isVerified);
    
    if (!token || !roomId || !username) {
      ws.close(1008, 'Invalid request');
      return;
    }
    
    if (username.length < 2) {
      ws.close(1008, 'Username too short');
      return;
    }
    
    if (!payload) {
      ws.close(1008, 'Invalid or expired token');
      return;
    }
    
    const sanitizedPayloadUsername = sanitizeUsername(payload.username, isPrivileged);
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

    const userId = payload.userId || null;

    // Сохраняем userId и username прямо на объекте ws для доступа без RoomManager
    ws._userId = userId;
    ws._username = username;

    // Регистрируем соединение пользователя глобально для личных сообщений
    if (userId) {
      this.userSockets.set(userId, ws);
      // Доставляем накопленные сообщения
      this.deliverPendingMessages(ws, userId).catch(() => {});
    }
    
    try {
      const { strokes, cancelledStrokeIds } = await RoomManager.addUser(roomId, username, ws, isVerified, userId);

      ws.send(JSON.stringify({ 
        method: "draws", 
        strokes,
        cancelledStrokeIds
      }));
      
      this.broadcast(roomId, { method: 'connection', username, isVerified });

      const users = await RoomManager.getRoomUsers(roomId);
      this.broadcast(roomId, { 
        method: "users", 
        users 
      });
      
    } catch (error) {
      ws.send(JSON.stringify({
        method: "error",
        message: error.message
      }));
      ws.close(1008, error.message);
    }
  }

  async handleDraw(ws, msg) {
    const userInfo = await RoomManager.getUserInfo(ws);
    if (!userInfo) return;
    const { roomId, username, userId } = userInfo;
    
    if (userId) {
      await DataStore.recordUserRoomActivity(userId, roomId);
    }
    
    if (msg.figure) {
      if (msg.figure.type === "undo") {
        const strokes = await RoomManager.getAllRoomStrokes(roomId);
        const undoneStroke = strokes.find(s => s.id === msg.figure.strokeId);
        
        if (undoneStroke) {
          await RoomManager.addCancelledStroke(roomId, username, undoneStroke);
          await RoomManager.removeStrokeById(roomId, msg.figure.strokeId);
          
          this.broadcast(roomId, { 
            method: "draw",
            username,
            figure: { type: "undo", strokeId: msg.figure.strokeId }
          }, null);
        }
        
        await RoomManager.updateUserActivity(ws);
        return;
      } 
      else if (msg.figure.type === "redo") {
        const stroke = msg.figure.stroke;
        if (!stroke) return;
        
        await RoomManager.addStroke(roomId, stroke);
        await RoomManager.removeStrokeFromAllCancelled(roomId, stroke.id);
        
        this.broadcast(roomId, { 
          method: "draw",
          username,
          figure: { type: "redo", stroke }
        }, null);
        
        await RoomManager.updateUserActivity(ws);
        return;
      } 
      else {
        await RoomManager.addStroke(roomId, msg.figure);
        this.broadcast(roomId, { ...msg, username }, ws);
      }
    }
    
    await RoomManager.updateUserActivity(ws);
  }

  async handleClear(ws, msg) {
    const userInfo = await RoomManager.getUserInfo(ws);
    if (!userInfo) return;
    const { roomId, username } = userInfo;
    
    await RoomManager.clearStrokes(roomId);
    this.broadcast(roomId, { method: "clear", username }, ws);
    await RoomManager.updateUserActivity(ws);
  }

async handleChat(ws, msg) {
    const userInfo = await RoomManager.getUserInfo(ws);
    if (!userInfo) return;
    const { roomId, username, userId } = userInfo;

    if (userId) {
      await DataStore.recordUserRoomActivity(userId, roomId);
    }
    
    const room = RoomManager.getRoomSockets(roomId);
    
    const message = sanitizeChatMessage(msg.message);
    
    if (!message || message.trim().length === 0) {
      return;
    }
    
    const verifiedUsers = await RoomManager.getVerifiedUsers(roomId);
    const isVerified = verifiedUsers.includes(username);

    this.broadcast(roomId, { method: "chat", username, message, isVerified }, ws);
    await RoomManager.updateUserActivity(ws);
  }

  async handlePersonalMessage(ws, msg) {
    // Используем userId прямо с ws объекта (не требует нахождения в комнате)
    const userId = ws._userId;
    const senderUsername = ws._username;
    if (!userId) return;

    const { toUserId, message, timestamp } = msg;
    if (!toUserId || !message) return;

    const sanitizedMessage = sanitizeChatMessage(message);
    if (!sanitizedMessage || sanitizedMessage.trim().length === 0) return;

    const PersonalMessageStore = require('./PersonalMessageStore');
    const ts = timestamp || Date.now();

    // Сохраняем в БД (delivered=false по умолчанию)
    const msgId = await PersonalMessageStore.saveMessage(userId, toUserId, sanitizedMessage, ts);

    // Если получатель онлайн — доставляем сразу с fromUsername
    const recipientWs = this.userSockets.get(toUserId);
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify({
        method: 'personalMessage',
        from: userId,
        fromUsername: senderUsername || userId,
        message: sanitizedMessage,
        timestamp: ts
      }));
      // Помечаем как доставленное
      if (msgId) {
        await PersonalMessageStore.markDelivered([msgId]);
      }
    }
  }

  /**
   * Публичный метод для доставки личного сообщения через WebSocket
   * (используется из HTTP-эндпоинта)
   */
  async deliverPersonalMessageToUser(toUserId, fromUserId, fromUsername, message, timestamp, msgId) {
    const recipientWs = this.userSockets.get(toUserId);
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify({
        method: 'personalMessage',
        from: fromUserId,
        fromUsername: fromUsername || fromUserId,
        message,
        timestamp
      }));
      if (msgId) {
        const PersonalMessageStore = require('./PersonalMessageStore');
        await PersonalMessageStore.markDelivered([msgId]);
      }
      return true;
    }
    return false;
  }

  async deliverPendingMessages(ws, userId) {
    try {
      const PersonalMessageStore = require('./PersonalMessageStore');
      const pending = await PersonalMessageStore.getPendingMessages(userId);
      if (!pending || pending.length === 0) return;

      const ids = [];
      for (const msg of pending) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            method: 'personalMessage',
            from: msg.from_user_id,
            fromUsername: msg.from_username,
            message: msg.message,
            timestamp: msg.timestamp
          }));
          ids.push(msg.id);
        }
      }
      if (ids.length > 0) {
        await PersonalMessageStore.markDelivered(ids);
      }
    } catch (error) {
      console.error('Error delivering pending messages:', error);
    }
  }

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
        case "personalMessage":
          this.handlePersonalMessage(ws, msg);
          break;
      }
    } catch (error) {
    }
  }

  async handleClose(ws) {
    this.wsMessageLimits.delete(ws);

    // Удаляем из глобального реестра
    for (const [uid, userWs] of this.userSockets.entries()) {
      if (userWs === ws) {
        this.userSockets.delete(uid);
        break;
      }
    }

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

  setupConnection(ws) {
    ws._id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    ws.on('message', (msgStr) => this.handleMessage(ws, msgStr));
    ws.on('close', () => this.handleClose(ws));
    ws.on('error', () => {});
  }
}

module.exports = new WebSocketHandler();
