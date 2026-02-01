const WebSocket = require('ws');
const RoomManager = require('./RoomManager');
const DataStore = require('./DataStore');
const { sanitizeInput } = require('../utils/security');

const MAX_USERNAME_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 500;

/**
 * WebSocketHandler - handles WebSocket connections and messages
 * Responsibilities: message routing, broadcasting, rate limiting
 */
class WebSocketHandler {
  constructor() {
    this.wsMessageLimits = new Map();
  }

  /**
   * Check WebSocket rate limit
   */
  checkRateLimit(ws) {
    const now = Date.now();
    const limit = this.wsMessageLimits.get(ws) || { count: 0, resetTime: now + 1000 };
    
    if (now > limit.resetTime) {
      this.wsMessageLimits.set(ws, { count: 1, resetTime: now + 1000 });
      return true;
    }
    
    if (limit.count >= 50) { // Max 50 messages per second
      return false;
    }
    
    limit.count++;
    return true;
  }

  /**
   * Broadcast message to room
   */
  broadcast(roomId, message, excludeWs = null) {
    const room = RoomManager.getRoom(roomId);
    if (!room) return;

    const messageString = JSON.stringify(message);
    room.users.forEach(({ ws: clientWs }) => {
      if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(messageString);
        } catch (error) {
          console.error('Error broadcasting message:', error);
        }
      }
    });
  }

  /**
   * Handle connection message
   */
  handleConnection(ws, msg) {
    const roomId = sanitizeInput(msg.id, 20);
    const username = sanitizeInput(msg.username, MAX_USERNAME_LENGTH);

    if (!roomId || !username) {
      ws.close(1008, 'Invalid request');
      return;
    }

    const roomInfo = DataStore.getRoomInfo(roomId);
    if (!roomInfo) {
      ws.close(1008, 'Room not found');
      return;
    }

    try {
      const room = RoomManager.addUser(roomId, username, ws);
      
      // Send current strokes to new user
      ws.send(JSON.stringify({ 
        method: "draws", 
        strokes: room.strokes 
      }));
      
      // Notify others
      this.broadcast(roomId, { method: 'connection', username });
      this.broadcast(roomId, { 
        method: "users", 
        users: RoomManager.getRoomUsers(roomId) 
      });
    } catch (error) {
      ws.close(1008, error.message);
    }
  }

  /**
   * Handle draw message
   */
  handleDraw(ws, msg) {
    const userInfo = RoomManager.getUserInfo(ws);
    if (!userInfo) return;

    const { roomId, username } = userInfo;
    
    if (msg.figure) {
      if (msg.figure.type === "undo") {
        RoomManager.removeStroke(roomId, msg.figure.strokeId);
      } else if (msg.figure.type === "redo") {
        RoomManager.addStroke(roomId, msg.figure.stroke);
      } else {
        RoomManager.addStroke(roomId, msg.figure);
      }
    }
    
    this.broadcast(roomId, { ...msg, username }, ws);
    RoomManager.updateUserActivity(ws);
  }

  /**
   * Handle clear message
   */
  handleClear(ws, msg) {
    const userInfo = RoomManager.getUserInfo(ws);
    if (!userInfo) return;

    const { roomId, username } = userInfo;
    
    RoomManager.clearStrokes(roomId);
    this.broadcast(roomId, { method: "clear", username }, ws);
    RoomManager.updateUserActivity(ws);
  }

  /**
   * Handle chat message
   */
  handleChat(ws, msg) {
    const userInfo = RoomManager.getUserInfo(ws);
    if (!userInfo) return;

    const { roomId, username } = userInfo;
    const message = sanitizeInput(msg.message, MAX_MESSAGE_LENGTH);
    
    if (message) {
      this.broadcast(roomId, { method: "chat", username, message }, ws);
    }
    
    RoomManager.updateUserActivity(ws);
  }

  /**
   * Handle incoming message
   */
  handleMessage(ws, msgStr) {
    try {
      // Rate limiting
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
        default:
          console.warn('Unknown message method:', msg.method);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Handle WebSocket close
   */
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

  /**
   * Setup WebSocket connection
   */
  setupConnection(ws) {
    ws.on('message', (msgStr) => this.handleMessage(ws, msgStr));
    ws.on('close', () => this.handleClose(ws));
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }
}

module.exports = new WebSocketHandler();
