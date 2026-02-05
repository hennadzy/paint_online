class WebSocketService {
  constructor() {
    this.socket = null;
    this.sessionId = null;
    this.roomId = null;
    this.username = null;
    this.token = null;
    this.isConnected = false;
    this.listeners = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.shouldReconnect = true;
  }

  connect(wsUrl, roomId, username, token) {
    return new Promise((resolve, reject) => {
      try {
        this.roomId = roomId;
        this.username = username;
        this.token = token;
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.shouldReconnect = true;
          this.sessionId = this.generateSessionId();
          
          this.send({
            method: "connection",
            id: roomId,
            username: username,
            token: token
          });
          
          this.emit('connected', { roomId, username });
          resolve();
        };
        
        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            this.emit('error', { error });
          }
        };
        
        this.socket.onerror = (error) => {
          this.emit('error', { error });
          reject(error);
        };
        
        this.socket.onclose = () => {
          this.isConnected = false;
          this.emit('disconnected', {});
          
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
              this.emit('reconnecting', { attempt: this.reconnectAttempts });
              this.connect(wsUrl, roomId, username, token).catch(() => {});
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

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
    this.token = null;
    this.reconnectAttempts = 0;
  }

  send(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
        return true;
      } catch (error) {
        this.emit('error', { error });
        return false;
      }
    }
    return false;
  }

  sendDraw(figure) {
    return this.send({
      method: "draw",
      id: this.sessionId,
      username: this.username,
      figure: figure
    });
  }

  sendClear() {
    return this.send({
      method: "clear",
      id: this.sessionId,
      username: this.username
    });
  }

  sendChat(message) {
    return this.send({
      method: "chat",
      id: this.sessionId,
      username: this.username,
      message: message
    });
  }

  handleMessage(message) {
    this.emit('message', message);
    
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

  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

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
          this.emit('error', { error });
        }
      }
    });
  }
}

export default new WebSocketService();
