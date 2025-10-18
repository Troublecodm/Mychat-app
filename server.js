const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const dbPath = path.join(__dirname, 'data', 'users.json');
const messagesPath = path.join(__dirname, 'data', 'messages.json');

// Ensure data folder exists
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ users: {}, stats: { restarts: 0 } }, null, 2));
if (!fs.existsSync(messagesPath)) fs.writeFileSync(messagesPath, JSON.stringify([]));

// Middleware
app.use(express.json());
app.use(express.static('public'));

// DB helpers
function readDB() { return JSON.parse(fs.readFileSync(dbPath)); }
function writeDB(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }

function readMessages() { return JSON.parse(fs.readFileSync(messagesPath)); }
function writeMessages(data) { fs.writeFileSync(messagesPath, JSON.stringify(data, null, 2)); }

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

// --- CHAT SOCKET ---
io.on('connection', socket => {
  console.log('New socket:', socket.id);

  // Send existing messages on connection
  const messages = readMessages();
  socket.emit('chat history', messages);

  socket.on('chat message', msg => {
    const messages = readMessages();
    const message = { text: msg, timestamp: Date.now() };
    messages.push(message);
    writeMessages(messages);

    io.emit('chat message', message);
  });
});

// Start server
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  const db = readDB();
  db.stats.restarts = (db.stats.restarts || 0) + 1;
  writeDB(db);
});
