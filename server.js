const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = 3000;

const dbPath = path.join(__dirname, 'data.json');
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ users: {}, messages: {} }));

app.use(express.json());
app.use(express.static('public'));

// READ / WRITE DB
function readDB() { return JSON.parse(fs.readFileSync(dbPath)); }
function writeDB(data) { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); }

// AUTH
app.post('/set-username', (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Missing username' });
  const db = readDB();
  if (!db.users[username]) db.users[username] = { username };
  res.json({ success: true });
});

app.get('/messages/:user', (req,res)=>{
  const db = readDB();
  res.json(db.messages[req.params.user]||[]);
});

app.post('/messages/:user', (req,res)=>{
  const { to, text } = req.body;
  if (!text) return res.status(400).json({error:'No message'});
  const db = readDB();
  if (!db.messages[req.params.user]) db.messages[req.params.user]=[];
  db.messages[req.params.user].push({ to, text, time: new Date().toISOString() });
  writeDB(db);
  res.json({success:true});
});

// SOCKET.IO
io.on('connection', socket=>{
  socket.on('dm', ({from, to, text})=>{
    io.emit('dm', {from, to, text, time:new Date().toISOString()});
  });
});

http.listen(PORT, ()=>console.log('Server running on port', PORT));
