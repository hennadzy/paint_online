const express = require('express');
const cors = require('cors');
const app = express();
const WSServer = require('express-ws')(app);
const aWss = WSServer.getWss();
const PORT = process.env.PORT || 5000;
const fs = require('fs');
const path = require('path');

app.use(cors({
    origin: ['https://paint-art.ru', 'https://paint-art.ru/', 'http://localhost:3000', 'http://localhost:3001', 'https://localhost:3000', 'https://localhost:3001']
}));
app.use(express.json({ limit: '10mb' })); 

app.ws('/', (ws, req) => {
    ws.on('message', (msg) => {
        msg = JSON.parse(msg);
        switch (msg.method) {
            case "connection":
                connectionHandler(ws, msg);
                break;
            case "draw":
                broadcastConnection(ws, msg);
                break;
        }
    });
});

app.post('/image', (req, res) => {
    try {
        const data = req.body.img.replace(`data:image/png;base64,`, '');
        fs.writeFileSync(path.resolve(__dirname, 'files', `${req.query.id}.jpg`), data, 'base64');
        return res.status(200).json({message: "Загружено"});
    } catch (e) {
        console.log(e);
        return res.status(500).json('error');
    }
});
app.get('/image', (req, res) => {
    try {
        const file = fs.readFileSync(path.resolve(__dirname, 'files', `${req.query.id}.jpg`));
        const data = `data:image/png;base64,` + file.toString('base64');
        res.json(data);
    } catch (e) {
        console.log(e);
        return res.status(500).json('error');
    }
});

app.listen(PORT, () => console.log(`server started on PORT ${PORT}`));

const connectionHandler = (ws, msg) => {
    ws.id = msg.id;
    ws.username = msg.username;
    broadcastConnection(ws, msg);
};

const broadcastConnection = (ws, msg) => {
    aWss.clients.forEach(client => {
        if (client.id === msg.id) {
            if (!msg.username) {
                msg.username = ws.username;
            }
            client.send(JSON.stringify(msg));
        }
    });
};

