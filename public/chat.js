const socket = io();
let username = localStorage.getItem('username') || '';
const usernameScreen = document.getElementById('usernameScreen');
const chatScreen = document.getElementById('chatScreen');
const usernameInput = document.getElementById('usernameInput');
const enterChatBtn = document.getElementById('enterChatBtn');
const usernameMsg = document.getElementById('usernameMsg');
const chatBox = document.getElementById('chatBox');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const dmBox = document.getElementById('dmBox');
const dmMessages = document.getElementById('dmMessages');
const dmInput = document.getElementById('dmInput');
const sendDmBtn = document.getElementById('sendDmBtn');

function showChat() {
  usernameScreen.style.display = 'none';
  chatScreen.style.display = 'block';
  socket.emit('join', username);
}

if(username) showChat();

enterChatBtn.onclick = () => {
  const u = usernameInput.value.trim();
  if(!u) {
    usernameMsg.textContent = 'Please enter a username';
    return;
  }
  username = u;
  localStorage.setItem('username', username);
  showChat();
};

// Send group message
sendBtn.onclick = () => {
  const msg = messageInput.value.trim();
  if(!msg) return;
  socket.emit('message', { username, msg });
  messageInput.value = '';
};

// Typing indicator
messageInput.addEventListener('input', () => {
  socket.emit('typing', usernameInput.value);
});

// Receive group message
socket.on('message', data => {
  const div = document.createElement('div');
  div.className = 'message';
  div.innerHTML = `<strong>${data.username}:</strong> ${data.msg} <span class="time">${data.time}</span>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
});

// Receive typing indicator
socket.on('typing', u => {
  typingIndicator.textContent = `${u} is typing...`;
  setTimeout(()=>{ typingIndicator.textContent = ''; }, 2000);
});

// Direct messages
sendDmBtn.onclick = () => {
  const msg = dmInput.value.trim();
  if(!msg) return;
  socket.emit('dm', { from: username, msg });
  dmInput.value = '';
};

socket.on('dm', data => {
  dmBox.style.display = 'block';
  const div = document.createElement('div');
  div.className = 'dm-message';
  div.innerHTML = `<strong>${data.from}:</strong> ${data.msg} <span class="time">${data.time}</span>`;
  dmMessages.appendChild(div);
  dmMessages.scrollTop = dmMessages.scrollHeight;
});
