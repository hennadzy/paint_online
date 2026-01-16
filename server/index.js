const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

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

const sanitizeInput = (input, maxLength) => {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength).replace(/[<>]/g, '');
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

app.use(cors({
    origin: [
        'https://paint-art.ru',
        'https://www.paint-art.ru',
        'https://risovanie.online',
        'https://www.risovanie.online',
        'http://localhost:3000',
        /^https:\/\/.*\.onrender\.com$/
    ],
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '../client/build')));

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

app.post('/rooms', (req, res) => {
    const name = sanitizeInput(req.body.name, MAX_ROOM_NAME_LENGTH);
    const isPublic = Boolean(req.body.isPublic);
    const password = sanitizeInput(req.body.password, 50);

    if (!name) {
        return res.status(400).json({ error: 'Name required' });
    }

    const roomId = generateId();
    const now = Date.now();
    
    roomInfo[roomId] = { 
        name, 
        isPublic, 
        hasPassword: !isPublic && !!password,
        password: !isPublic && password ? password : null,
        createdAt: now,
        lastActivity: now
    };
    
    fs.writeFileSync(roomInfoFile, JSON.stringify(roomInfo));
    res.json({ roomId });
});

app.get('/rooms/public', (req, res) => {
    const publicRooms = Object.entries(roomInfo).map(([id, info]) => ({ 
        id, 
        name: info.name, 
        isPublic: info.isPublic,
        hasPassword: info.hasPassword || false
    }));
    res.json(publicRooms);
});

app.get('/rooms/:id/exists', (req, res) => {
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

app.post('/rooms/:id/verify-password', (req, res) => {
    const id = sanitizeInput(req.params.id, 20);
    const password = sanitizeInput(req.body.password, 50);
    const room = roomInfo[id];
    
    if (!room) {
        return res.status(404).json({ error: 'Room not found' });
    }
    
    if (!room.hasPassword) {
        return res.json({ valid: true });
    }
    
    res.json({ valid: room.password === password });
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
