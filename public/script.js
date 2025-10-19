// Star creation for background
const starsContainer = document.createElement('div');
starsContainer.className = 'stars';
for (let i = 0; i < 100; i++) {
  const star = document.createElement('div');
  star.className = 'star';
  star.style.width = star.style.height = Math.random() * 3 + 1 + 'px';
  star.style.top = Math.random() * 100 + '%';
  star.style.left = Math.random() * 100 + '%';
  starsContainer.appendChild(star);
}
document.body.appendChild(starsContainer);

// Chat elements
const chat = document.getElementById('chat');
const username = localStorage.getItem('username') || 'Anonymous';

// Create DM popup
function openDM(toUser) {
  let dm = document.querySelector('.dm-popup');
  if (!dm) {
    dm = document.createElement('div');
    dm.className = 'dm-popup';
    dm.innerHTML = `
      <h3>DM: ${toUser}</h3>
      <div class="dm-messages"></div>
      <input type="text" class="dm-input" placeholder="Type a message...">
      <button class="dm-send">Send</button>
    `;
    document.body.appendChild(dm);

    const dmMessages = dm.querySelector('.dm-messages');
    const dmInput = dm.querySelector('.dm-input');
    const dmSend = dm.querySelector('.dm-send');

    // Fetch previous messages
    fetch(`/dm/${username}/${toUser}`)
      .then(res => res.json())
      .then(data => {
        data.forEach(msg => {
          const m = document.createElement('div');
          m.className = 'dm-message';
          m.textContent = `${msg.from}: ${msg.text}`;
          dmMessages.appendChild(m);
        });
      });

    // Send DM
    dmSend.onclick = () => {
      const text = dmInput.value.trim();
      if (!text) return;
      fetch('/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: username, to: toUser, text })
      })
      .then(res => res.json())
      .then(msg => {
        const m = document.createElement('div');
        m.className = 'dm-message';
        m.textContent = `${msg.from}: ${msg.text}`;
        dmMessages.appendChild(m);
        dmInput.value = '';
      });
    };
  }
}
