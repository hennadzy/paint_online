/**
 * WebSocketService - manages WebSocket connection and messaging
 * Responsibilities: connection, reconnection, message handling
 */
class WebSocketService {
  constructor() {
    this.socket = null;
    this.sessionId = null;
    this.roomId = null;
    this.username = null;
    this.isConnected = false;
    this.listeners = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.shouldReconnect = true;
  }

  /**
   * Connect to WebSocket server
   */
  connect(wsUrl, roomId, username) {
    return new Promise((resolve, reject) => {
      try {
        this.roomId = roomId;
        this.username = username;
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.shouldReconnect = true;
          this.sessionId = this.generateSessionId();
          
          // Send connection message
          this.send({
            method: "connection",
            id: roomId,
            username: username
          });
          
          this.emit('connected', { roomId, username });
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };
        
        this.socket.onerror = (error) => {
          this.emit('error', { error });
          reject(error);
        };
        
        this.socket.onclose = () => {
          this.isConnected = false;
          this.emit('disconnected', {});
          
          // Attempt reconnection only if not explicitly disconnected
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              this.emit('reconnecting', { attempt: this.reconnectAttempts });
              this.connect(wsUrl, roomId, username).catch(() => {});
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.shouldReconnect = false;
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.sessionId = null;
    this.roomId = null;
    this.username = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Send message to server
   */
  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send message:', error);
        this.emit('error', { error });
        return false;
      }
    }
    return false;
  }

  /**
   * Send draw command
   */
  sendDraw(figure) {
    return this.send({
      method: "draw",
      id: this.sessionId,
      username: this.username,
      figure: figure
    });
  }

  /**
   * Send clear command
   */
  sendClear() {
    return this.send({
      method: "clear",
      id: this.sessionId,
      username: this.username
    });
  }

  /**
   * Send chat message
   */
  sendChat(message) {
    return this.send({
      method: "chat",
      id: this.sessionId,
      username: this.username,
      message: message
    });
  }

  /**
   * Handle incoming message
   */
  handleMessage(message) {
    this.emit('message', message);
    
    // Emit specific events for different message types
    switch (message.method) {
      case 'connection':
        this.emit('userConnected', { username: message.username });
        break;
      case 'disconnection':
        this.emit('userDisconnected', { username: message.username });
        break;
      case 'users':
        this.emit('usersList', { users: message.users });
        break;
      case 'draws':
        this.emit('drawsReceived', { strokes: message.strokes });
        break;
      case 'draw':
        this.emit('drawReceived', { username: message.username, figure: message.figure });
        break;
      case 'clear':
        this.emit('clearReceived', { username: message.username });
        break;
      case 'chat':
        this.emit('chatReceived', { username: message.username, message: message.message });
        break;
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Event system
  on(event, callback) {
    this.listeners.add({ event, callback });
  }

  off(event, callback) {
    this.listeners.forEach(listener => {
      if (listener.event === event && listener.callback === callback) {
        this.listeners.delete(listener);
      }
    });
  }

  emit(event, data) {
    this.listeners.forEach(listener => {
      if (listener.event === event) {
        try {
          listener.callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      }
    });
  }
}

export default new WebSocketService();
