const WS_URL = window.location.hostname === 'localhost'
  ? 'ws://localhost:5000'
  : 'wss://paint-online-back.onrender.com';

class PersonalWSService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isAuthenticated = false;
    this.listeners = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 15;
    this.baseReconnectDelay = 2000;
    this.shouldReconnect = false;
    this.token = null;
    this._reconnectTimer = null;
  }

  connect(token) {
    if (!token) return;

    if (
      this.token === token &&
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.token = token;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;

    this._clearReconnectTimer();
    this._openSocket();
  }

  _openSocket() {
    if (!this.token || !this.shouldReconnect) return;

    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      try { this.socket.close(); } catch (_) {}
      this.socket = null;
    }

    try {
      const url = `${WS_URL}/ws/personal`;
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this._rawSend({ method: 'auth', token: this.token });
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this._handleMessage(message);
        } catch (_) {}
      };

      this.socket.onerror = () => {
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.isAuthenticated = false;
        this._scheduleReconnect();
      };
    } catch (_) {
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (!this.shouldReconnect) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    this.reconnectAttempts++;
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    );

    this._clearReconnectTimer();
    this._reconnectTimer = setTimeout(() => {
      this._openSocket();
    }, delay);
  }

  _clearReconnectTimer() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.isAuthenticated = false;
    this.token = null;
    this._clearReconnectTimer();

    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onerror = null;
      try { this.socket.close(); } catch (_) {}
      this.socket = null;
    }

    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  sendPersonalMessage(toUserId, message, timestamp) {
    return this._rawSend({
      method: 'personalMessage',
      toUserId,
      message,
      timestamp: timestamp || Date.now()
    });
  }

  _rawSend(message) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
        return true;
      } catch (_) {
        return false;
      }
    }
    return false;
  }

  _handleMessage(message) {
    switch (message.method) {
      case 'authenticated':
        this.isAuthenticated = true;
        this.emit('authenticated', message);
        break;
      case 'personalMessage':
        this.emit('personalMessage', {
          from: message.from,
          fromUsername: message.fromUsername,
          message: message.message,
          timestamp: message.timestamp
        });
        break;
      default:
        break;
    }
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
        } catch (_) {}
      }
    });
  }
}

export default new PersonalWSService();
