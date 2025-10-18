(() => {
  const socket = io();
  // DOM
  const auth = document.getElementById('auth');
  const app = document.getElementById('app');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const signupBtn = document.getElementById('signup');
  const loginBtn = document.getElementById('login');
  const authMsg = document.getElementById('authMsg');
  const meName = document.getElementById('meName');
  const meAvatar = document.getElementById('meAvatar');
  const displayNameInput = document.getElementById('displayName');
  const saveProfileBtn = document.getElementById('saveProfile');
  const contactsEl = document.getElementById('contacts');
  const roomsEl = document.getElementById('rooms');
  const messagesEl = document.getElementById('messages');
  const msgTpl = document.getElementById('msgTpl');
  const msgInput = document.getElementById('msgInput');
  const fileInput = document.getElementById('fileInput');
  const sendBtn = document.getElementById('sendBtn');
  const presenceEl = document.getElementById('presence');
  const dmContainer = document.getElementById('dmContainer');
  const themeBtn = document.getElementById('themeBtn');
  const typingEl = document.getElementById('typing');

  let me = null;
  let currentRoom = 'lobby';
  let messages = [];

  // Signup
  signupBtn.onclick = async () => {
    const u = usernameInput.value.trim(), p = passwordInput.value;
    if (!u || !p) { authMsg.textContent = 'fill both'; return; }
    const r = await fetch('/signup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: u, password: p, displayName: u }) });
    const d = await r.json();
    if (d.ok) authMsg.textContent = 'Registered. Please log in.'; else authMsg.textContent = d.error || 'Error';
  };

  // Login
  loginBtn.onclick = async () => {
    const u = usernameInput.value.trim(), p = passwordInput.value;
    if (!u||!p) { authMsg.textContent = 'fill both'; return; }
    const r = await fetch('/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username: u, password: p }) });
    if (r.status === 200) {
      const d = await r.json();
      if (d.ok) { me = d.user.username; startApp(); localStorage.setItem('tc_user', me); }
      else authMsg.textContent = 'invalid';
    } else authMsg.textContent = 'invalid';
  };

  // restore session
  const saved = localStorage.getItem('tc_user');
  if (saved) usernameInput.value = saved;

  function startApp(){
    auth.classList.add('hidden');
    app.classList.remove('hidden');
    meName.textContent = me;
    socket.emit('identify', { username: me });
    bindEvents();
  }

  function bindEvents(){
    sendBtn.onclick = sendMessage;
    msgInput.oninput = () => socket.emit('typing', { room: currentRoom });
    fileInput.onchange = ()=> {}; // send handler reads file on send
    themeBtn.onclick = toggleTheme;
  }

  // render message
  function makeMsgNode(m){
    const node = msgTpl.content.firstElementChild.cloneNode(true);
    node.querySelector('.from').textContent = m.from;
    node.querySelector('.time').textContent = new Date(m.ts || Date.now()).toLocaleTimeString();
    node.querySelector('.body').textContent = m.text || '';
    const att = node.querySelector('.attachments');
    if (m.file) {
      const a = document.createElement('a'); a.href = m.file; a.target = '_blank';
      if (m.file.match(/\\.(jpg|jpeg|png|gif)$/i)) { const img = document.createElement('img'); img.src = m.file; a.appendChild(img); } else { a.textContent = 'Download file'; }
      att.appendChild(a);
    }
    // controls
    node.querySelector('.editBtn').onclick = async () => {
      if (m.from !== me) return alert('only your messages');
      const t = prompt('Edit message', m.text); if (t == null) return;
      socket.emit('edit', { id: m.id, newText: t }, (ack) => { if (ack && ack.ok) { node.querySelector('.body').textContent = t; } });
    };
    node.querySelector('.delBtn').onclick = () => {
      if (m.from !== me) return alert('only your messages');
      if (!confirm('Delete?')) return;
      socket.emit('delete', { id: m.id }, (ack) => { if (ack && ack.ok) node.remove(); });
    };
    node.querySelector('.dmBtn').onclick = () => openDM(m.from);
    return node;
  }

  // append and scroll
  function appendMessage(m){
    const node = makeMsgNode(m);
    messagesEl.appendChild(node);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // send message (room)
  async function sendMessage(){
    const text = msgInput.value.trim();
    if (!text && !fileInput.files.length) return;
    // handle file
    if (fileInput.files && fileInput.files[0]) {
      const f = fileInput.files[0];
      const b64 = await readAsDataURL(f);
      socket.emit('sendMessage', { room: currentRoom, text, file: b64, fileName: f.name }, (ack) => {
        if (ack && ack.ok) { msgInput.value = ''; fileInput.value = ''; }
      });
    } else {
      socket.emit('sendMessage', { room: currentRoom, text }, (ack) => {
        if (ack && ack.ok) msgInput.value = '';
      });
    }
  }

  // readAsDataURL helper
  function readAsDataURL(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); }); }

  // DM popup: opens small chat window for user
  function openDM(targetUser){
    // check if window exists
    const id = 'dm-' + targetUser;
    if (document.getElementById(id)) {
      const w = document.getElementById(id);
      w.style.display = 'flex';
      return;
    }
    const win = document.createElement('div'); win.className = 'dmWindow'; win.id = id;
    win.innerHTML = '<div class="dmHeader"><span class="dmTitle">' + targetUser + '</span><div><button class="close">✖</button></div></div><div class="dmMessages"></div><div class="dmComposer"><input class="dmInput" placeholder="Message"/><button class="dmSend">Send</button></div>';
    dmContainer.appendChild(win);
    const closeBtn = win.querySelector('.close'); const dmMsgs = win.querySelector('.dmMessages'); const dmInput = win.querySelector('.dmInput'); const dmSend = win.querySelector('.dmSend');
    closeBtn.onclick = ()=> win.style.display = 'none';
    dmSend.onclick = async () => {
      const text = dmInput.value.trim(); if (!text) return;
      // send DM event
      socket.emit('sendDM', { to: targetUser, text }, (ack) => {
        if (ack && ack.ok) {
          const fake = { id: 'local-' + Date.now(), from: me, to: targetUser, text, ts: Date.now() };
          const line = document.createElement('div'); line.textContent = 'You: ' + text; dmMsgs.appendChild(line); dmInput.value = '';
        }
      });
    };
  }

  // socket listeners
  socket.on('init', (data) => {
    // initial messages
    messages = data.messages || [];
    messagesEl.innerHTML = '';
    messages.forEach(appendMessage);
    // contacts (simple)
    (data.users || []).forEach(u => {
      const li = document.createElement('li'); li.textContent = u.username + (u.status ? (' — ' + u.status) : ''); li.onclick = () => openDM(u.username);
      contactsEl.appendChild(li);
    });
  });

  socket.on('message', (m) => {
    if (m.room === currentRoom) appendMessage(m);
  });

  socket.on('dm', (m) => {
    // delivered DM broadcast — show popup only if you're involved
    if (m.to === me || m.from === me) {
      openDM(m.from === me ? m.to : m.from);
      const id = 'dm-' + (m.to === me ? m.from : m.to);
      const win = document.getElementById(id);
      if (win) {
        const dmMsgs = win.querySelector('.dmMessages');
        const line = document.createElement('div'); line.textContent = (m.from === me ? 'You: ' : m.from + ': ') + (m.text || '[file]');
        dmMsgs.appendChild(line);
        dmMsgs.scrollTop = dmMsgs.scrollHeight;
      } else {
        // if no window, create it
        openDM(m.from === me ? m.to : m.from);
      }
    }
  });

  socket.on('presence', (list) => {
    presenceEl.innerHTML = '';
    list.forEach(u => {
      const li = document.createElement('li');
      const s = document.createElement('span'); s.textContent = (u.status === 'online' ? '● ' : '○ '); s.style.color = u.status === 'online' ? 'lime' : '#999';
      li.appendChild(s);
      li.appendChild(document.createTextNode(u.username + (u.lastSeen ? ' — ' + new Date(u.lastSeen).toLocaleString() : '') ));
      presenceEl.appendChild(li);
    });
  });

  socket.on('typing', ({ user }) => {
    typingEl.textContent = user ? (user + ' is typing...') : '';
    setTimeout(()=> typingEl.textContent = '', 1500);
  });

  socket.on('edited', (m) => {
    // re-render messages list naively
    messages = messages.map(x => x.id === m.id ? m : x);
    messagesEl.innerHTML = ''; messages.forEach(appendMessage);
  });

  socket.on('deleted', ({ id }) => {
    messages = messages.filter(x => x.id !== id);
    messagesEl.innerHTML = ''; messages.forEach(appendMessage);
  });

  // small theme toggle
  function toggleTheme(){
    const root = document.documentElement;
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (bg === '#0f1720') {
      root.style.setProperty('--bg','#ffffff'); root.style.setProperty('--card','#f3f4f6'); root.style.setProperty('--text','#0f1720'); root.style.setProperty('--muted','#6b7280');
    } else {
      root.style.setProperty('--bg','#0f1720'); root.style.setProperty('--card','#071027'); root.style.setProperty('--text','#e6eef6'); root.style.setProperty('--muted','#9aa7b2');
    }
  }

  // helper: open DM for a username (exposed)
  window.openDM = openDM;

})();
