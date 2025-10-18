const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const dbPath = path.join(__dirname, 'data', 'users.json');

app.use(express.json());
app.use(express.static('public'));

// Read/write DB helpers
function readDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: {}, stats: { restarts: 0 } }, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath));
}
function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// --- AUTH ROUTES ---
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const db = readDB();
  if (db.users[username]) return res.status(400).json({ error: 'User exists' });

  db.users[username] = { password, online: false, lastSeen: null, avatar: '', dms: {} };
  writeDB(db);
  res.json({ success: true });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users[username];
  if (!user || user.password !== password) return res.status(400).json({ error: 'Invalid login' });

  user.online = true;
  writeDB(db);
  res.json({ success: true });
});

// --- SOCKET.IO ---
io.on('connection', socket => {
  console.log('New socket:', socket.id);

  socket.on('join', username => {
    const db = readDB();
    if (!db.users[username]) return;
    db.users[username].online = true;
    writeDB(db);
    socket.username = username;
  });

  socket.on('chat message', msg => {
    io.emit('chat message', { user: socket.username, msg });
  });

  socket.on('dm', ({ to, msg }) => {
    const db = readDB();
    if (!db.users[to] || !socket.username) return;

    // Save DM to JSON
    if (!db.users[to].dms[socket.username]) db.users[to].dms[socket.username] = [];
    if (!db.users[socket.username].dms[to]) db.users[socket.username].dms[to] = [];

    db.users[to].dms[socket.username].push({ from: socket.username, msg });
    db.users[socket.username].dms[to].push({ from: socket.username, msg });

    writeDB(db);
    socket.emit('dm', { from: socket.username, msg, to });
  });

  socket.on('disconnect', () => {
    const db = readDB();
    if (socket.username && db.users[socket.username]) db.users[socket.username].online = false;
    writeDB(db);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  const db = readDB();
  db.stats.restarts = (db.stats.restarts || 0) + 1;
  writeDB(db);
});
