const WebSocket = require('ws');
const RoomManager = require('./RoomManager');
const DataStore = require('./DataStore');
const { sanitizeInput, sanitizeChatMessage, sanitizeUsername, validateUsername, checkSpam } = require('../utils/security');
const { verifyToken } = require('../utils/jwt');

const MAX_USERNAME_LENGTH = 30;
const MAX_MESSAGE_LENGTH = 1000;

class WebSocketHandler {
  constructor() {
    this.wsMessageLimits = new Map();
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
    const room = RoomManager.getRoom(roomId);
    if (!room) return;
    const messageString = JSON.stringify(message);
    room.users.forEach(({ ws: clientWs }) => {
      if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(messageString);
        } catch (error) {}
      }
    });
  }

  handleConnection(ws, msg) {
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
    
    const roomInfo = DataStore.getRoomInfo(roomId);
    
    if (!roomInfo) {
      ws.close(1008, 'Room not found');
      return;
    }
    
    if (!roomInfo.isPublic && payload.isPublic) {
      ws.close(1008, 'Invalid token for private room');
      return;
    }
    
    try {
      const room = RoomManager.addUser(roomId, username, ws);
      ws.send(JSON.stringify({ 
        method: "draws", 
        strokes: room.strokes 
      }));
      this.broadcast(roomId, { method: 'connection', username });
      this.broadcast(roomId, { 
        method: "users", 
        users: RoomManager.getRoomUsers(roomId) 
      });
    } catch (error) {
      ws.close(1008, error.message);
    }
  }

  handleDraw(ws, msg) {
    const userInfo = RoomManager.getUserInfo(ws);
    if (!userInfo) return;
    const { roomId, username } = userInfo;
    if (msg.figure) {
      if (msg.figure.type === "undo") {
        if (!RoomManager.removeStrokeIfOwned(roomId, msg.figure.strokeId, username)) {
          return;
        }
        this.broadcast(roomId, { method: "draw", username, figure: { type: "undo", strokeId: msg.figure.strokeId } }, ws);
        RoomManager.updateUserActivity(ws);
        return;
      } else if (msg.figure.type === "redo") {
        const stroke = msg.figure.stroke;
        if (!stroke) return;
        if (stroke.username && String(stroke.username).trim() !== String(username).trim()) {
          return;
        }
        const strokeToAdd = { ...stroke, username: stroke.username || username };
        RoomManager.addStroke(roomId, strokeToAdd);
        const strokeToBroadcast = JSON.parse(JSON.stringify(strokeToAdd));
        this.broadcast(roomId, { method: "draw", username, figure: { type: "redo", stroke: strokeToBroadcast } }, ws);
        RoomManager.updateUserActivity(ws);
        return;
      } else {
        RoomManager.addStroke(roomId, msg.figure);
      }
    }
    this.broadcast(roomId, { ...msg, username }, ws);
    RoomManager.updateUserActivity(ws);
  }

  handleClear(ws, msg) {
    const userInfo = RoomManager.getUserInfo(ws);
    if (!userInfo) return;
    const { roomId, username } = userInfo;
    RoomManager.clearStrokes(roomId);
    this.broadcast(roomId, { method: "clear", username }, ws);
    RoomManager.updateUserActivity(ws);
  }

  handleChat(ws, msg) {
    const userInfo = RoomManager.getUserInfo(ws);
    if (!userInfo) return;
    const { roomId, username } = userInfo;
    
    const room = RoomManager.getRoom(roomId);
    if (!room) return;
    
    const messageHistory = room.messageHistory || [];
    
    const spamCheck = checkSpam(msg.message, username, messageHistory);
    if (spamCheck.isSpam) {
      ws.send(JSON.stringify({
        method: "error",
        message: `Сообщение заблокировано: ${spamCheck.reason}`
      }));
      return;
    }
    
    const message = sanitizeChatMessage(msg.message);
    
    if (!message || message.trim().length === 0) {
      return;
    }
    
    const messageData = {
      username,
      message,
      timestamp: Date.now()
    };
    
    if (!room.messageHistory) {
      room.messageHistory = [];
    }
    room.messageHistory.push(messageData);
    
    if (room.messageHistory.length > 100) {
      room.messageHistory = room.messageHistory.slice(-100);
    }
    
    this.broadcast(roomId, { method: "chat", username, message }, ws);
    RoomManager.updateUserActivity(ws);
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
      }
    } catch (error) {}
  }

  handleClose(ws) {
    this.wsMessageLimits.delete(ws);
    const userInfo = RoomManager.removeUser(ws);
    if (userInfo) {
      const { roomId, username } = userInfo;
      this.broadcast(roomId, { method: 'disconnection', username });
      this.broadcast(roomId, { 
        method: "users", 
        users: RoomManager.getRoomUsers(roomId) 
      });
    }
  }

  setupConnection(ws) {
    ws.on('message', (msgStr) => this.handleMessage(ws, msgStr));
    ws.on('close', () => this.handleClose(ws));
    ws.on('error', () => {});
  }
}

module.exports = new WebSocketHandler();
