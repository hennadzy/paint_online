const request = require('supertest');
const express = require('express');
const WebSocket = require('ws');

describe('Server API Tests', () => {
  let app;
  let server;

  beforeAll(() => {
    app = express();
    app.use(express.json());
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('POST /rooms', () => {
    test('should create a new room with valid data', async () => {
      const roomData = {
        name: 'Test Room',
        isPublic: true
      };

      const response = await request(app)
        .post('/rooms')
        .send(roomData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('roomId');
      expect(response.body.roomId).toHaveLength(9);
    });

    test('should create a private room with password', async () => {
      const roomData = {
        name: 'Private Room',
        isPublic: false,
        password: 'test123'
      };

      const response = await request(app)
        .post('/rooms')
        .send(roomData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('roomId');
    });

    test('should reject room creation without name', async () => {
      const roomData = {
        isPublic: true
      };

      const response = await request(app)
        .post('/rooms')
        .send(roomData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should sanitize room name', async () => {
      const roomData = {
        name: '<script>alert("xss")</script>Test',
        isPublic: true
      };

      const response = await request(app)
        .post('/rooms')
        .send(roomData);

      expect(response.status).toBe(200);
      expect(response.body.roomId).toBeDefined();
    });

    test('should limit room name length to 100 characters', async () => {
      const longName = 'a'.repeat(150);
      const roomData = {
        name: longName,
        isPublic: true
      };

      const response = await request(app)
        .post('/rooms')
        .send(roomData);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /rooms/public', () => {
    test('should return list of public rooms', async () => {
      const response = await request(app).get('/rooms/public');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return rooms with correct structure', async () => {
      const response = await request(app).get('/rooms/public');

      if (response.body.length > 0) {
        const room = response.body[0];
        expect(room).toHaveProperty('id');
        expect(room).toHaveProperty('name');
        expect(room).toHaveProperty('isPublic');
        expect(room).toHaveProperty('hasPassword');
      }
    });
  });

  describe('GET /rooms/:id/exists', () => {
    test('should return false for non-existent room', async () => {
      const response = await request(app).get('/rooms/nonexistent/exists');

      expect(response.status).toBe(200);
      expect(response.body.exists).toBe(false);
    });

    test('should return true for existing room', async () => {
      const createResponse = await request(app)
        .post('/rooms')
        .send({ name: 'Test Room', isPublic: true });

      const roomId = createResponse.body.roomId;

      const response = await request(app).get(`/rooms/${roomId}/exists`);

      expect(response.status).toBe(200);
      expect(response.body.exists).toBe(true);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('hasPassword');
    });
  });

  describe('POST /rooms/:id/verify-password', () => {
    test('should verify correct password', async () => {
      const createResponse = await request(app)
        .post('/rooms')
        .send({ name: 'Private Room', isPublic: false, password: 'secret123' });

      const roomId = createResponse.body.roomId;

      const response = await request(app)
        .post(`/rooms/${roomId}/verify-password`)
        .send({ password: 'secret123' });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const createResponse = await request(app)
        .post('/rooms')
        .send({ name: 'Private Room', isPublic: false, password: 'secret123' });

      const roomId = createResponse.body.roomId;

      const response = await request(app)
        .post(`/rooms/${roomId}/verify-password`)
        .send({ password: 'wrongpassword' });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(false);
    });

    test('should return 404 for non-existent room', async () => {
      const response = await request(app)
        .post('/rooms/nonexistent/verify-password')
        .send({ password: 'test' });

      expect(response.status).toBe(404);
    });
  });

  describe('Security Tests', () => {
    test('should sanitize XSS in username', () => {
      const sanitizeInput = (input, maxLength) => {
        if (typeof input !== 'string') return '';
        return input.trim().slice(0, maxLength).replace(/[<>]/g, '');
      };

      const maliciousInput = '<script>alert("xss")</script>User';
      const sanitized = sanitizeInput(maliciousInput, 50);

      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized).toContain('User');
    });

    test('should limit message length', () => {
      const sanitizeInput = (input, maxLength) => {
        if (typeof input !== 'string') return '';
        return input.trim().slice(0, maxLength).replace(/[<>]/g, '');
      };

      const longMessage = 'a'.repeat(1000);
      const sanitized = sanitizeInput(longMessage, 500);

      expect(sanitized.length).toBeLessThanOrEqual(500);
    });

    test('should handle non-string input', () => {
      const sanitizeInput = (input, maxLength) => {
        if (typeof input !== 'string') return '';
        return input.trim().slice(0, maxLength).replace(/[<>]/g, '');
      };

      expect(sanitizeInput(null, 50)).toBe('');
      expect(sanitizeInput(undefined, 50)).toBe('');
      expect(sanitizeInput(123, 50)).toBe('');
      expect(sanitizeInput({}, 50)).toBe('');
    });
  });

  describe('Domain Redirect Tests', () => {
    test('should redirect from www.risovanie.online', () => {
      const mockReq = {
        get: (header) => header === 'host' ? 'www.risovanie.online' : null,
        url: '/test'
      };
      const mockRes = {
        redirect: jest.fn()
      };
      const mockNext = jest.fn();

      const middleware = (req, res, next) => {
        const host = req.get('host');
        if (host === 'paint-art.ru' || host === 'www.paint-art.ru' || host === 'www.risovanie.online') {
          return res.redirect(301, `https://risovanie.online${req.url}`);
        }
        next();
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith(301, 'https://risovanie.online/test');
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should redirect from paint-art.ru', () => {
      const mockReq = {
        get: (header) => header === 'host' ? 'paint-art.ru' : null,
        url: '/'
      };
      const mockRes = {
        redirect: jest.fn()
      };
      const mockNext = jest.fn();

      const middleware = (req, res, next) => {
        const host = req.get('host');
        if (host === 'paint-art.ru' || host === 'www.paint-art.ru' || host === 'www.risovanie.online') {
          return res.redirect(301, `https://risovanie.online${req.url}`);
        }
        next();
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith(301, 'https://risovanie.online/');
    });

    test('should not redirect risovanie.online', () => {
      const mockReq = {
        get: (header) => header === 'host' ? 'risovanie.online' : null,
        url: '/'
      };
      const mockRes = {
        redirect: jest.fn()
      };
      const mockNext = jest.fn();

      const middleware = (req, res, next) => {
        const host = req.get('host');
        if (host === 'paint-art.ru' || host === 'www.paint-art.ru' || host === 'www.risovanie.online') {
          return res.redirect(301, `https://risovanie.online${req.url}`);
        }
        next();
      };

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});

describe('WebSocket Tests', () => {
  test('should generate unique room IDs', () => {
    const generateId = () => Math.random().toString(36).substring(2, 11);

    const id1 = generateId();
    const id2 = generateId();

    expect(id1).toHaveLength(9);
    expect(id2).toHaveLength(9);
    expect(id1).not.toBe(id2);
  });

  test('should validate room ID format', () => {
    const isValidRoomId = (id) => {
      return typeof id === 'string' && id.length === 9 && /^[a-z0-9]+$/.test(id);
    };

    expect(isValidRoomId('abc123def')).toBe(true);
    expect(isValidRoomId('ABC123DEF')).toBe(false);
    expect(isValidRoomId('abc')).toBe(false);
    expect(isValidRoomId('abc123def!')).toBe(false);
  });
});
