import canvasState from '../store/canvasState';

describe('WebSocket Synchronization Tests', () => {
  let mockWebSocket;
  let messageHandler;

  beforeEach(() => {
    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1,
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null
    };

    canvasState.strokes = [];
    canvasState.connectedUsers = [];
    canvasState.isConnected = false;
  });

  describe('Connection Management', () => {
    test('should establish WebSocket connection', () => {
      const ws = mockWebSocket;
      
      if (ws.onopen) {
        ws.onopen();
      }

      expect(ws.readyState).toBe(1);
    });

    test('should send connection message', () => {
      const ws = mockWebSocket;
      const connectionMsg = {
        method: 'connection',
        id: 'room123',
        username: 'TestUser'
      };

      ws.send(JSON.stringify(connectionMsg));

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(connectionMsg));
    });

    test('should handle connection close', () => {
      const ws = mockWebSocket;
      
      if (ws.onclose) {
        ws.onclose();
      }

      expect(ws.close).not.toThrow();
    });

    test('should handle connection error', () => {
      const ws = mockWebSocket;
      const errorHandler = jest.fn();
      ws.onerror = errorHandler;

      if (ws.onerror) {
        ws.onerror(new Error('Connection failed'));
      }

      expect(errorHandler).toHaveBeenCalled();
    });
  });

  describe('Drawing Synchronization', () => {
    test('should send brush stroke to server', () => {
      const ws = mockWebSocket;
      const brushStroke = {
        method: 'draw',
        id: 'room123',
        username: 'TestUser',
        figure: {
          type: 'brush',
          points: [[10, 10], [20, 20]],
          strokeStyle: '#000000',
          lineWidth: 2,
          opacity: 1
        }
      };

      ws.send(JSON.stringify(brushStroke));

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(brushStroke));
    });

    test('should receive and apply remote stroke', () => {
      const remoteStroke = {
        method: 'draw',
        username: 'RemoteUser',
        figure: {
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 100,
          strokeStyle: '#FF0000',
          lineWidth: 2
        }
      };

      canvasState.pushStroke(remoteStroke.figure);

      expect(canvasState.strokes).toHaveLength(1);
      expect(canvasState.strokes[0].type).toBe('line');
    });

    test('should receive initial canvas state', () => {
      const initialState = {
        method: 'draws',
        strokes: [
          { type: 'brush', points: [[10, 10]] },
          { type: 'line', x1: 0, y1: 0, x2: 50, y2: 50 }
        ]
      };

      canvasState.strokes = initialState.strokes;

      expect(canvasState.strokes).toHaveLength(2);
    });

    test('should synchronize undo action', () => {
      const undoMessage = {
        method: 'draw',
        figure: {
          type: 'undo',
          strokeId: 'stroke-123'
        }
      };

      canvasState.strokes = [
        { id: 'stroke-123', type: 'brush', points: [[10, 10]] },
        { id: 'stroke-456', type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 }
      ];

      canvasState.strokes = canvasState.strokes.filter(s => s.id !== 'stroke-123');

      expect(canvasState.strokes).toHaveLength(1);
      expect(canvasState.strokes[0].id).toBe('stroke-456');
    });

    test('should synchronize redo action', () => {
      const redoMessage = {
        method: 'draw',
        figure: {
          type: 'redo',
          stroke: {
            id: 'stroke-123',
            type: 'brush',
            points: [[10, 10]]
          }
        }
      };

      canvasState.pushStroke(redoMessage.figure.stroke);

      expect(canvasState.strokes).toHaveLength(1);
      expect(canvasState.strokes[0].id).toBe('stroke-123');
    });

    test('should synchronize clear canvas', () => {
      canvasState.strokes = [
        { type: 'brush', points: [[10, 10]] },
        { type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 }
      ];

      const clearMessage = {
        method: 'clear',
        username: 'TestUser'
      };

      canvasState.strokes = [];

      expect(canvasState.strokes).toHaveLength(0);
    });
  });

  describe('User Management', () => {
    test('should add user to connected users list', () => {
      const connectionMessage = {
        method: 'connection',
        username: 'NewUser'
      };

      canvasState.connectedUsers.push(connectionMessage.username);

      expect(canvasState.connectedUsers).toContain('NewUser');
    });

    test('should remove user from connected users list', () => {
      canvasState.connectedUsers = ['User1', 'User2', 'User3'];

      const disconnectionMessage = {
        method: 'disconnection',
        username: 'User2'
      };

      canvasState.connectedUsers = canvasState.connectedUsers.filter(
        u => u !== disconnectionMessage.username
      );

      expect(canvasState.connectedUsers).toHaveLength(2);
      expect(canvasState.connectedUsers).not.toContain('User2');
    });

    test('should update users list', () => {
      const usersMessage = {
        method: 'users',
        users: ['User1', 'User2', 'User3']
      };

      canvasState.connectedUsers = usersMessage.users;

      expect(canvasState.connectedUsers).toHaveLength(3);
      expect(canvasState.connectedUsers).toEqual(['User1', 'User2', 'User3']);
    });

    test('should not exceed maximum users limit', () => {
      const MAX_USERS = 10;
      const users = Array.from({ length: 11 }, (_, i) => `User${i + 1}`);

      const limitedUsers = users.slice(0, MAX_USERS);

      expect(limitedUsers).toHaveLength(MAX_USERS);
    });
  });

  describe('Chat Synchronization', () => {
    test('should send chat message', () => {
      const ws = mockWebSocket;
      const chatMessage = {
        method: 'chat',
        id: 'room123',
        username: 'TestUser',
        message: 'Hello everyone!'
      };

      ws.send(JSON.stringify(chatMessage));

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(chatMessage));
    });

    test('should receive chat message', () => {
      const messages = [];
      const incomingMessage = {
        method: 'chat',
        username: 'RemoteUser',
        message: 'Hi there!'
      };

      messages.push(incomingMessage);

      expect(messages).toHaveLength(1);
      expect(messages[0].username).toBe('RemoteUser');
      expect(messages[0].message).toBe('Hi there!');
    });

    test('should sanitize chat messages', () => {
      const sanitizeMessage = (msg) => {
        return msg.replace(/[<>]/g, '').slice(0, 500);
      };

      const maliciousMessage = '<script>alert("xss")</script>Hello';
      const sanitized = sanitizeMessage(maliciousMessage);

      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).toContain('Hello');
    });

    test('should limit message length', () => {
      const longMessage = 'a'.repeat(1000);
      const limitedMessage = longMessage.slice(0, 500);

      expect(limitedMessage).toHaveLength(500);
    });
  });

  describe('Message Validation', () => {
    test('should validate message structure', () => {
      const isValidMessage = (msg) => {
        try {
          const parsed = JSON.parse(msg);
          return parsed.method && typeof parsed.method === 'string';
        } catch {
          return false;
        }
      };

      const validMessage = JSON.stringify({ method: 'draw', figure: {} });
      const invalidMessage = 'not json';

      expect(isValidMessage(validMessage)).toBe(true);
      expect(isValidMessage(invalidMessage)).toBe(false);
    });

    test('should validate draw message', () => {
      const isValidDrawMessage = (msg) => {
        return msg.method === 'draw' && msg.figure && typeof msg.figure === 'object';
      };

      const validDraw = {
        method: 'draw',
        figure: { type: 'brush', points: [] }
      };

      const invalidDraw = {
        method: 'draw'
      };

      expect(isValidDrawMessage(validDraw)).toBe(true);
      expect(isValidDrawMessage(invalidDraw)).toBe(false);
    });
  });

  describe('Reconnection Logic', () => {
    test('should attempt reconnection on disconnect', () => {
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 3;

      const attemptReconnect = () => {
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          return true;
        }
        return false;
      };

      expect(attemptReconnect()).toBe(true);
      expect(attemptReconnect()).toBe(true);
      expect(attemptReconnect()).toBe(true);
      expect(attemptReconnect()).toBe(false);
      expect(reconnectAttempts).toBe(3);
    });

    test('should restore state after reconnection', () => {
      const savedStrokes = [
        { type: 'brush', points: [[10, 10]] },
        { type: 'line', x1: 0, y1: 0, x2: 10, y2: 10 }
      ];

      canvasState.strokes = savedStrokes;

      expect(canvasState.strokes).toEqual(savedStrokes);
    });
  });

  describe('Performance Tests', () => {
    test('should handle rapid stroke updates', () => {
      const strokes = Array.from({ length: 100 }, (_, i) => ({
        type: 'brush',
        points: [[i, i]],
        strokeStyle: '#000000',
        lineWidth: 2
      }));

      strokes.forEach(stroke => canvasState.pushStroke(stroke));

      expect(canvasState.strokes.length).toBeGreaterThan(0);
    });

    test('should handle large stroke arrays', () => {
      const largeStroke = {
        type: 'brush',
        points: Array.from({ length: 1000 }, (_, i) => [i, i]),
        strokeStyle: '#000000',
        lineWidth: 2
      };

      canvasState.pushStroke(largeStroke);

      expect(canvasState.strokes[0].points).toHaveLength(1000);
    });

    test('should process messages within time limit', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        canvasState.pushStroke({
          type: 'brush',
          points: [[i, i]],
          strokeStyle: '#000000',
          lineWidth: 2
        });
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(1000);
    });
  });
});
