/**
 * PersonalWSService — dedicated WebSocket service for personal messages.
 * Connects to /ws/personal endpoint using the user's auth token (not room token).
 * Stays connected as long as the user is authenticated.
 */

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

  /**
   * Connect to /ws/personal with the user's auth token.
   * Safe to call multiple times — won't reconnect if already open.
   */
  connect(token) {
    if (!token) return;

    // Already connected with same token — nothing to do
    if (
      this.token === token &&
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    // Store token and enable auto-reconnect
    this.token = token;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;

    this._clearReconnectTimer();
    this._openSocket();
  }

  _openSocket() {
    if (!this.token || !this.shouldReconnect) return;

    // Close existing socket cleanly before opening a new one
    if (this.socket) {
      this.socket.onclose = null; // prevent reconnect loop from old socket
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
        // Send auth message immediately after connection
        this._rawSend({ method: 'auth', token: this.token });
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this._handleMessage(message);
        } catch (_) {}
      };

      this.socket.onerror = () => {
        // onclose will fire after onerror — reconnect logic is there
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
    // Exponential back-off capped at 30 s
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

  /** Disconnect and stop auto-reconnect (e.g. on logout). */
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

  /** Send a personal message to another user. */
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
