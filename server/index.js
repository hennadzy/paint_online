const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const bcrypt = require('bcrypt');
const validator = require('validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const WSServer = require('express-ws')(app);
const PORT = process.env.PORT || 5000;

const rooms = new Map();
const roomInfo = {};
const wsToUserInfo = new Map();

const roomInfoFile = path.join(__dirname, 'roomInfo.json');
const roomDataDir = path.join(__dirname, 'room_data');

const MAX_ROOM_NAME_LENGTH = 100;
const MAX_USERNAME_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 500;
const MAX_USERS_PER_ROOM = 10;
const INACTIVE_USER_TIMEOUT = 10 * 60 * 1000;
const ROOM_CLEANUP_INTERVAL = 60 * 60 * 1000;
const ROOM_EXPIRATION_TIME = 3 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

if (!fs.existsSync(roomDataDir)) {
  fs.mkdirSync(roomDataDir, { recursive: true });
}

if (fs.existsSync(roomInfoFile)) {
  try {
    Object.assign(roomInfo, JSON.parse(fs.readFileSync(roomInfoFile, 'utf8')));
  } catch (error) {
    fs.writeFileSync(roomInfoFile, JSON.stringify({}));
  }
}

// Improved XSS protection with validator
const sanitizeInput = (input, maxLength) => {
  if (typeof input !== 'string') return '';
  
  // Remove any HTML tags and dangerous characters
  let sanitized = input.trim().slice(0, maxLength);
  
  // Use validator to escape HTML entities
  sanitized = validator.escape(sanitized);
  
  // Additional protection: remove any remaining script-like patterns
  sanitized = sanitized.replace(/javascript:/gi, '')
                       .replace(/on\w+\s*=/gi, '')
                       .replace(/<script/gi, '')
                       .replace(/<\/script>/gi, '');
  
  return sanitized;
};

const saveRoomStrokes = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const strokesFile = path.join(roomDataDir, `${roomId}.json`);
  try {
    fs.writeFileSync(strokesFile, JSON.stringify(room.strokes));
  } catch (error) {
    return;
  }
};

const loadRoomStrokes = (roomId) => {
  const strokesFile = path.join(roomDataDir, `${roomId}.json`);
  try {
    if (fs.existsSync(strokesFile)) {
      return JSON.parse(fs.readFileSync(strokesFile, 'utf8'));
    }
  } catch (error) {
    return [];
  }
  return [];
};

const deleteRoomData = (roomId) => {
  const strokesFile = path.join(roomDataDir, `${roomId}.json`);
  try {
    if (fs.existsSync(strokesFile)) {
      fs.unlinkSync(strokesFile);
    }
  } catch (error) {
    return;
  }
};

const generateId = () => Math.random().toString(36).substring(2, 11);

// Redirect www to non-www
app.use((req, res, next) => {
    const host = req.get('host');
    if (host === 'www.risovanie.online') {
        return res.redirect(301, `https://risovanie.online${req.url}`);
    }
    next();
});

// Security headers with helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://maxcdn.bootstrapcdn.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://mc.yandex.ru"],
            imgSrc: ["'self'", "data:", "https:", "https://mc.yandex.ru"],
            connectSrc: ["'self'", "wss:", "https:"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Stricter CORS policy
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://risovanie.online',
            'https://www.risovanie.online',
            'http://localhost:3000'
        ];
        
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else if (process.env.NODE_ENV === 'production' && origin.endsWith('.onrender.com')) {
            // Only allow onrender.com in production for deployment
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Length', 'X-Requested-With'],
    maxAge: 86400 // 24 hours
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '../client/build')));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const createRoomLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 room creations per hour
    message: 'Too many rooms created from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const passwordVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit password attempts
    message: 'Too many password attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// WebSocket message rate limiting
const wsMessageLimits = new Map();

const checkWsRateLimit = (ws) => {
    const now = Date.now();
    const limit = wsMessageLimits.get(ws) || { count: 0, resetTime: now + 1000 };
    
    if (now > limit.resetTime) {
        wsMessageLimits.set(ws, { count: 1, resetTime: now + 1000 });
        return true;
    }
    
    if (limit.count >= 50) { // Max 50 messages per second
        return false;
    }
    
    limit.count++;
    return true;
};

const broadcast = (roomId, message, excludeWs = null) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const messageString = JSON.stringify(message);
    room.users.forEach(({ ws: clientWs }) => {
        if (clientWs !== excludeWs && clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(messageString);
        }
    });
};

app.ws('/', (ws, req) => {
    ws.on('message', (msgStr) => {
        try {
            // Rate limiting for WebSocket messages
            if (!checkWsRateLimit(ws)) {
                ws.close(1008, 'Rate limit exceeded');
                return;
            }

            const msg = JSON.parse(msgStr);

            if (msg.method === "connection") {
                const roomId = sanitizeInput(msg.id, 20);
                const username = sanitizeInput(msg.username, MAX_USERNAME_LENGTH);

                if (!roomId || !username || !roomInfo[roomId]) {
                    ws.close(1008, 'Invalid request');
                    return;
                }

                if (!rooms.has(roomId)) {
                    const savedStrokes = loadRoomStrokes(roomId);
                    rooms.set(roomId, { users: new Map(), strokes: savedStrokes });
                }
                const room = rooms.get(roomId);
                
                roomInfo[roomId].lastActivity = Date.now();
                fs.writeFileSync(roomInfoFile, JSON.stringify(roomInfo));

                if (room.users.size >= MAX_USERS_PER_ROOM) {
                    ws.close(1008, 'Room is full');
                    return;
                }

                if (room.users.has(username)) {
                    ws.close(1008, 'Username taken');
                    return;
                }
                
                wsToUserInfo.set(ws, { roomId, username });
                room.users.set(username, { ws, lastActivity: Date.now() });

                ws.send(JSON.stringify({ method: "draws", strokes: room.strokes }));
                broadcast(roomId, { method: 'connection', username });
                broadcast(roomId, { method: "users", users: Array.from(room.users.keys()) });
                return;
            }

            const userInfo = wsToUserInfo.get(ws);
            if (!userInfo) return;

            const { roomId, username } = userInfo;
            const room = rooms.get(roomId);

            if (!room || !room.users.has(username)) return;

            room.users.get(username).lastActivity = Date.now();
            roomInfo[roomId].lastActivity = Date.now();

            switch (msg.method) {
                case "draw":
                    if (msg.figure) {
                        if (msg.figure.type === "undo") {
                            room.strokes = room.strokes.filter(s => s.id !== msg.figure.strokeId);
                        } else if (msg.figure.type === "redo") {
                            room.strokes.push(msg.figure.stroke);
                        } else {
                            room.strokes.push(msg.figure);
                        }
                        saveRoomStrokes(roomId);
                    }
                    broadcast(roomId, { ...msg, username }, ws);
                    break;
                case "clear":
                    room.strokes = [];
                    saveRoomStrokes(roomId);
                    broadcast(roomId, { method: "clear", username }, ws);
                    break;
                case "chat":
                    const message = sanitizeInput(msg.message, MAX_MESSAGE_LENGTH);
                    if (message) {
                        broadcast(roomId, { method: "chat", username, message }, ws);
                    }
                    break;
            }
        } catch (error) {
            return;
        }
    });

    ws.on('close', () => {
        wsMessageLimits.delete(ws);
        const userInfo = wsToUserInfo.get(ws);
        if (!userInfo) return;

        const { roomId, username } = userInfo;
        const room = rooms.get(roomId);
        
        if (room && room.users.has(username)) {
            room.users.delete(username);
            wsToUserInfo.delete(ws);

            broadcast(roomId, { method: 'disconnection', username });
            broadcast(roomId, { method: "users", users: Array.from(room.users.keys()) });

            if (room.users.size === 0) {
                saveRoomStrokes(roomId);
                rooms.delete(roomId);
            }
        }
    });
});

app.post('/rooms', createRoomLimiter, async (req, res) => {
    try {
        const name = sanitizeInput(req.body.name, MAX_ROOM_NAME_LENGTH);
        const isPublic = Boolean(req.body.isPublic);
        const password = req.body.password ? sanitizeInput(req.body.password, 50) : null;

        if (!name) {
            return res.status(400).json({ error: 'Name required' });
        }

        const roomId = generateId();
        const now = Date.now();
        
        // Hash password if provided
        let hashedPassword = null;
        if (!isPublic && password) {
            hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
        }
        
        roomInfo[roomId] = { 
            name, 
            isPublic, 
            hasPassword: !isPublic && !!password,
            passwordHash: hashedPassword,
            createdAt: now,
            lastActivity: now
        };
        
        fs.writeFileSync(roomInfoFile, JSON.stringify(roomInfo));
        res.json({ roomId });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/rooms/public', apiLimiter, (req, res) => {
    const publicRooms = Object.entries(roomInfo).map(([id, info]) => ({ 
        id, 
        name: info.name, 
        isPublic: info.isPublic,
        hasPassword: info.hasPassword || false
    }));
    res.json(publicRooms);
});

app.get('/rooms/:id/exists', apiLimiter, (req, res) => {
    const id = sanitizeInput(req.params.id, 20);
    const room = roomInfo[id];
    
    if (!room) {
        return res.json({ exists: false });
    }
    
    res.json({ 
        exists: true,
        hasPassword: room.hasPassword || false,
        name: room.name
    });
});

app.post('/rooms/:id/verify-password', passwordVerifyLimiter, async (req, res) => {
    try {
        const id = sanitizeInput(req.params.id, 20);
        const password = req.body.password ? sanitizeInput(req.body.password, 50) : '';
        const room = roomInfo[id];
        
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }
        
        if (!room.hasPassword || !room.passwordHash) {
            return res.json({ valid: true });
        }
        
        // Use bcrypt to compare hashed password
        const isValid = await bcrypt.compare(password, room.passwordHash);
        res.json({ valid: isValid });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomId) => {
        room.users.forEach(({ ws, lastActivity }, username) => {
            if (now - lastActivity > INACTIVE_USER_TIMEOUT) {
                ws.close(1000, 'Inactive');
            }
        });
    });
}, 60000);

setInterval(() => {
    const now = Date.now();
    let changed = false;
    
    Object.entries(roomInfo).forEach(([roomId, info]) => {
        const lastActivity = info.lastActivity || info.createdAt;
        if (now - lastActivity > ROOM_EXPIRATION_TIME) {
            if (rooms.has(roomId)) {
                const room = rooms.get(roomId);
                room.users.forEach(({ ws }) => {
                    ws.close(1000, 'Room expired');
                });
                rooms.delete(roomId);
            }
            
            deleteRoomData(roomId);
            delete roomInfo[roomId];
            changed = true;
        }
    });
    
    if (changed) {
        fs.writeFileSync(roomInfoFile, JSON.stringify(roomInfo));
    }
}, ROOM_CLEANUP_INTERVAL);

app.listen(PORT, () => {});
