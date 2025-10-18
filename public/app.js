const socket = io();
const loginDiv = document.getElementById('login');
const chatDiv = document.getElementById('chat');
const userInput = document.getElementById('user');
const passInput = document.getElementById('pass');
const msgInput = document.getElementById('msg');
const sendBtn = document.getElementById('send');
const messages = document.getElementById('messages');
const typing = document.getElementById('typing');

let currentUser = null;

document.getElementById('loginBtn').onclick = async () => {
  const r = await fetch('/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:userInput.value, password:passInput.value}) });
  const d = await r.json();
  if(d.success){
    currentUser = d.user.username;
    loginDiv.classList.add('hidden');
    chatDiv.classList.remove('hidden');
    socket.emit('join', currentUser);
  } else alert('Invalid login');
};

document.getElementById('regBtn').onclick = async () => {
  const r = await fetch('/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:userInput.value, password:passInput.value}) });
  const d = await r.json();
  alert(d.success ? 'Registered!' : d.msg);
};

sendBtn.onclick = () => {
  if(!msgInput.value.trim()) return;
  socket.emit('message', { text: msgInput.value });
  msgInput.value = '';
};

msgInput.addEventListener('input', ()=> socket.emit('typing', currentUser));

socket.on('message', d => {
  const div = document.createElement('div');
  div.textContent = `${d.user}: ${d.text}`;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

socket.on('notice', n => {
  const div = document.createElement('div');
  div.style.color = '#0f0';
  div.textContent = n;
  messages.appendChild(div);
});

socket.on('typing', u => typing.textContent = `${u} is typing...`);
