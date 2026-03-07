const WebSocket = require('ws');
const RoomManager = require('./RoomManager');
const DataStore = require('./DataStore');
const { sanitizeInput, sanitizeChatMessage, sanitizeUsername, checkSpam } = require('../utils/security');
const { verifyToken } = require('../utils/jwt');

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
      const { strokes, cancelledStrokeIds } = await RoomManager.addUser(roomId, username, ws);
      
      ws.send(JSON.stringify({ 
        method: "draws", 
        strokes,
        cancelledStrokeIds
      }));
      
      this.broadcast(roomId, { method: 'connection', username });
      
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
    const { roomId, username } = userInfo;
    
    if (msg.figure) {
      if (msg.figure.type === "undo") {
        const strokes = await RoomManager.getAllRoomStrokes(roomId);
        const undoneStroke = strokes.find(s => s.id === msg.figure.strokeId);
        
        if (undoneStroke) {
          await RoomManager.addCancelledStroke(roomId, username, undoneStroke);
          await RoomManager.removeStrokeById(roomId, msg.figure.strokeId);
          
          // Optimized: only broadcast cancelled stroke id, not all cancelled strokes
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
        
        // Optimized: only broadcast redo action
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
    const { roomId, username } = userInfo;
    
    const room = RoomManager.getRoomSockets(roomId);
    
    const message = sanitizeChatMessage(msg.message);
    
    if (!message || message.trim().length === 0) {
      return;
    }
    
    this.broadcast(roomId, { method: "chat", username, message }, ws);
    await RoomManager.updateUserActivity(ws);
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
    } catch (error) {
    }
  }

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

  setupConnection(ws) {
    ws._id = `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    ws.on('message', (msgStr) => this.handleMessage(ws, msgStr));
    ws.on('close', () => this.handleClose(ws));
    ws.on('error', () => {});
  }
}

module.exports = new WebSocketHandler();
