const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;
const dbPath = path.join(__dirname, 'data', 'db.json');

// Ensure data folder exists
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));

// Read DB
function readDB() {
  if (!fs.existsSync(dbPath)) return { users: {}, messages: [], stats: {} };
  return JSON.parse(fs.readFileSync(dbPath));
}

// Write DB
function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static('public'));

// --- AUTH ROUTES ---
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const db = readDB();
  if (db.users[username]) return res.status(400).json({ error: 'User already exists' });

  db.users[username] = { password, avatar: '', online: false, lastSeen: null };
  writeDB(db);
  res.json({ success: true });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users[username];
  if (!user || user.password !== password) return res.status(400).json({ error: 'Invalid login' });
  res.json({ success: true });
});

// --- SOCKET.IO ---
io.on('connection', (socket) => {
  console.log('New socket:', socket.id);
  const db = readDB();

  // Send existing messages
  socket.emit('chat history', db.messages);

  socket.on('chat message', ({ user, msg }) => {
    const message = { user, msg, time: new Date().toISOString() };
    db.messages.push(message);
    writeDB(db);
    io.emit('chat message', message);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  const db = readDB();
  db.stats.restarts = (db.stats.restarts || 0) + 1;
  writeDB(db);
});
