import userState from '../store/userState';

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
        const isReconnecting = this.reconnectAttempts > 0;
        
        this.roomId = roomId;
        this.username = username;
        this.token = token;
        this.socket = new WebSocket(wsUrl);
        
        const connectionTimeout = setTimeout(() => {
          if (this.socket && this.socket.readyState !== WebSocket.OPEN) {
            this.socket.close();
            reject(new Error('Connection timeout'));
          }
        }, 10000);

        this.socket.onopen = () => {
          clearTimeout(connectionTimeout);
          this.isConnected = true;
          
          this.reconnectAttempts = 0;
          this.shouldReconnect = true;
          
          if (!this.sessionId) {
            this.sessionId = this.generateSessionId();
          }

          this.send({
            method: "connection",
            id: roomId,
            username: username,
            token: token,
            isVerified: userState.isAuthenticated,
            isReconnecting: isReconnecting
          });

          this.emit('connected', { roomId, username, isReconnecting });
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
          clearTimeout(connectionTimeout);
          this.emit('error', { error });
          reject(error);
        };

        this.socket.onclose = () => {
          clearTimeout(connectionTimeout);
          this.isConnected = false;
          this.emit('disconnected', {});

          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
            
            setTimeout(() => {
              this.emit('reconnecting', { attempt: this.reconnectAttempts });
              this.connect(wsUrl, roomId, username, token).catch(() => {});
            }, delay);
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
      message: message,
      isVerified: userState.isAuthenticated
    });
  }

  sendPersonalMessage(toUserId, message, timestamp) {
    return this.send({
      method: "personalMessage",
      toUserId,
      message,
      timestamp: timestamp || Date.now()
    });
  }

  handleMessage(message) {
    this.emit('message', message);

    switch (message.method) {
      case 'connection':
        if (message.username === this.username && message.isReconnecting) {
          return;
        }
        this.emit('userConnected', { username: message.username });
        break;
      case 'disconnection':
        this.emit('userDisconnected', { username: message.username });
        break;
      case 'users':
        this.emit('usersList', { users: message.users });
        break;
      case 'draws':
        this.emit('drawsReceived', { strokes: message.strokes, cancelledStrokeIds: message.cancelledStrokeIds });
        break;
      case 'draw':
        this.emit('drawReceived', { username: message.username, figure: message.figure });
        break;
      case 'clear':
        this.emit('clearReceived', { username: message.username });
        break;
      case 'chat':
        const lastMessage = this._lastReceivedChatMessage;
        const currentMessage = `${message.username}:${message.message}`;
        const currentTime = Date.now();
        
        if (lastMessage && 
            lastMessage.content === currentMessage && 
            currentTime - lastMessage.time < 2000) {
          return;
        }
        
        this._lastReceivedChatMessage = {
          content: currentMessage,
          time: currentTime
        };
        
        this.emit('chatReceived', { 
          username: message.username, 
          message: message.message, 
          isVerified: message.isVerified,
          userId: message.userId
        });
        break;
      case 'personalMessage':
        this.emit('personalMessage', {
          from: message.from,
          fromUsername: message.fromUsername,
          message: message.message,
          timestamp: message.timestamp
        });
        break;
      case 'syncCancelled':
        this.emit('syncCancelled', { cancelledStrokeIds: message.cancelledStrokeIds });
        break;
      case 'error':
        this.emit('roomError', { message: message.message });
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
