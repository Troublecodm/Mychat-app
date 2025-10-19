const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const dbPath = path.join(__dirname, 'data.json');

// Initialize database if it doesn't exist
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ users: {}, messages: [], stats: { restarts: 0 } }, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(dbPath));
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static('public'));

// --- AUTH ---
app.post('/login', (req, res) => {
  const { username } = req.body;
  const db = readDB();
  if (!db.users[username]) db.users[username] = { username };
  res.json({ success: true });
});

// --- GET MESSAGES ---
app.get('/messages', (req, res) => {
  const db = readDB();
  res.json(db.messages);
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('New socket:', socket.id);

  socket.on('chat message', (data) => {
    const db = readDB();
    db.messages.push(data);
    writeDB(db);
    io.emit('chat message', data);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  const db = readDB();
  db.stats.restarts = (db.stats.restarts || 0) + 1;
  writeDB(db);
});
