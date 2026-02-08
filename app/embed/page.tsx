export default async function EmbedPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const sp = await searchParams;
  const tokenRaw = sp.token;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;

  const safeToken = token ?? "";

  // Note: this is a SAME-ORIGIN iframe page, so it can call /api/log-chat directly.
  // If you host the iframe elsewhere, you can switch to absolute URL using `origin`.
  return (
    <div
      style={{
        height: "100vh",
        background: "transparent",
        fontFamily: "system-ui",
      }}
    >
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          border: "1px solid rgba(0,0,0,.12)",
          borderRadius: 14,
          overflow: "hidden",
          background: "var(--mchatly-panel-bg, #fff)",
          color: "var(--mchatly-panel-text, #111)",
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            borderBottom: "1px solid rgba(0,0,0,.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontWeight: 700 }}>Chat</div>
            <div style={{ fontSize: 12, opacity: 0.65 }}>
              Token: {safeToken ? "••••••" : "missing"}
            </div>
          </div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>mchatly</div>
        </div>

        <div
          id="mchatly-body"
          style={{
            padding: 10,
            overflow: "auto",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        />

        <div
  style={{
    padding: "8px 12px 0 12px",
    display: "flex",
    justifyContent: "flex-end",
    width: "fit-content",
    marginLeft: "auto",
  }}
>
  <div id="mchatly-pills" style={{ display: 'flex', flexDirection: 'column', gap: 8 }} />
</div>


        <form
          id="mchatly-form"
          style={{
            padding: 10,
            borderTop: "1px solid rgba(0,0,0,.08)",
            display: "flex",
            gap: 8,
          }}
        >
          <input
            id="mchatly-input"
            placeholder="Type a message..."
            style={{
              flex: 1,
              border: "1px solid rgba(0,0,0,.15)",
              borderRadius: 10,
              padding: 10,
              font: "inherit",
            }}
          />
          <button
            type="submit"
            style={{
              background: "var(--mchatly-primary, #111)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,.15)",
              borderRadius: 10,
              padding: "10px 12px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </form>

        <div
          style={{
            padding: "6px 10px",
            borderTop: "1px solid rgba(0,0,0,.06)",
            fontSize: 11,
            opacity: 0.65,
            textAlign: "center",
          }}
        >
          Powered by <a href={process.env.SITE_URL}> mchatly</a>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(function() {
  // Persist and load messages for user

  const TOKEN = ${JSON.stringify(safeToken)};
  function getOrCreateUserId() {
    const key = 'mchatly:userId:' + TOKEN;
    let userId = localStorage.getItem(key);
    if (!userId) {
      if (window.crypto && window.crypto.randomUUID) userId = window.crypto.randomUUID();
      else userId = String(Date.now()) + '-' + Math.random().toString(16).slice(2);
      localStorage.setItem(key, userId);
    }
    return userId;
  }
  const USER_ID = getOrCreateUserId();
  const body = document.getElementById('mchatly-body');
  const form = document.getElementById('mchatly-form');
  const input = document.getElementById('mchatly-input');
  const pillsContainer = document.getElementById('mchatly-pills');

  // Prompt for name and WhatsApp number if not already saved
  function getOrPromptUserInfo() {
    const nameKey = 'mchatly:name:' + TOKEN;
    const whatsappKey = 'mchatly:whatsapp:' + TOKEN;
    let name = localStorage.getItem(nameKey);
    let whatsapp = localStorage.getItem(whatsappKey);
    if (!name || !whatsapp) {
      // Show modal
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.12)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '9999';

      const card = document.createElement('div');
      card.style.background = '#fff';
      card.style.padding = '32px 24px';
      card.style.borderRadius = '14px';
      card.style.boxShadow = '0 2px 16px rgba(0,0,0,0.08)';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.gap = '18px';
      card.style.minWidth = '320px';

      const title = document.createElement('div');
      title.textContent = 'Start Conversation';
      title.style.fontWeight = '700';
      title.style.fontSize = '20px';
      card.appendChild(title);

      const nameInput = document.createElement('input');
      nameInput.placeholder = 'Your Name';
      nameInput.style.padding = '12px';
      nameInput.style.borderRadius = '8px';
      nameInput.style.border = '1px solid #ddd';
      nameInput.style.fontSize = '16px';
      nameInput.style.width = '100%';
      card.appendChild(nameInput);

      const whatsappInput = document.createElement('input');
      whatsappInput.placeholder = 'WhatsApp Number';
      whatsappInput.style.padding = '12px';
      whatsappInput.style.borderRadius = '8px';
      whatsappInput.style.border = '1px solid #ddd';
      whatsappInput.style.fontSize = '16px';
      whatsappInput.style.width = '100%';
      whatsappInput.type = 'tel';
      card.appendChild(whatsappInput);

      const submitBtn = document.createElement('button');
      submitBtn.textContent = 'Start Chat';
      submitBtn.style.padding = '12px 18px';
      submitBtn.style.borderRadius = '8px';
      submitBtn.style.background = '#111';
      submitBtn.style.color = '#fff';
      submitBtn.style.fontWeight = '700';
      submitBtn.style.fontSize = '16px';
      submitBtn.style.border = 'none';
      submitBtn.style.cursor = 'pointer';
      card.appendChild(submitBtn);

      submitBtn.onclick = function() {
        const nameVal = nameInput.value.trim();
        const whatsappVal = whatsappInput.value.trim();
        if (!nameVal || !whatsappVal) {
          nameInput.style.borderColor = nameVal ? '#ddd' : '#f00';
          whatsappInput.style.borderColor = whatsappVal ? '#ddd' : '#f00';
          return;
        }
        localStorage.setItem(nameKey, nameVal);
        localStorage.setItem(whatsappKey, whatsappVal);
        modal.remove();
        name = nameVal;
        whatsapp = whatsappVal;
      };

      modal.appendChild(card);
      document.body.appendChild(modal);

      // Block until info entered
      return new Promise(resolve => {
        submitBtn.onclick = function() {
          const nameVal = nameInput.value.trim();
          const whatsappVal = whatsappInput.value.trim();
          if (!nameVal || !whatsappVal) {
            nameInput.style.borderColor = nameVal ? '#ddd' : '#f00';
            whatsappInput.style.borderColor = whatsappVal ? '#ddd' : '#f00';
            return;
          }
          localStorage.setItem(nameKey, nameVal);
          localStorage.setItem(whatsappKey, whatsappVal);
          modal.remove();
          resolve({ name: nameVal, whatsapp: whatsappVal });
        };
      });
    }
    return Promise.resolve({ name, whatsapp });
  }

  let WELCOME_MESSAGE = '';
  let didShowWelcome = false;
  let adminActive = false;
  let realtime = null;
  let channel = null;
  let chatbotId = null;
  let STARTER_QUESTIONS = [];
  let historyLoaded = false;
  let historyCount = 0;

  function renderStarterQuestions() {
    if (!pillsContainer || !STARTER_QUESTIONS.length) return;
    pillsContainer.innerHTML = '';
    STARTER_QUESTIONS.forEach((q, idx) => {
      const btn = document.createElement('button');
      btn.textContent = q;
      btn.style.padding = '8px 14px';
      btn.style.borderRadius = '10px';
      btn.style.background = getComputedStyle(document.documentElement).getPropertyValue('--mchatly-bot-bubble') || '#f1f1f1';
      btn.style.color = getComputedStyle(document.documentElement).getPropertyValue('--mchatly-bot-text') || '#111';
      btn.style.border = 'none';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '15px';
      btn.style.marginBottom = '8px';
      btn.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
      btn.style.whiteSpace = 'nowrap';
      btn.onclick = () => {
        btn.remove();
        STARTER_QUESTIONS.splice(idx, 1);
        send(q);
      };
      pillsContainer.appendChild(btn);
    });
  }

  function getOrCreateSessionId() {
    try {
      const key = 'mchatly:sessionId:' + TOKEN;
      let sid = localStorage.getItem(key);
      if (!sid) {
        if (window.crypto && window.crypto.randomUUID) sid = window.crypto.randomUUID();
        else sid = String(Date.now()) + '-' + Math.random().toString(16).slice(2);
        localStorage.setItem(key, sid);
      }
      return sid;
    } catch {
      return null;
    }
  }

  async function trackSession() {
    if (!TOKEN) return;
    const sid = getOrCreateSessionId();
    if (!sid) return;
    const userInfo = await getOrPromptUserInfo();
    try {
      fetch('/api/widget-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: TOKEN,
          sessionId: sid,
          userId: USER_ID,
          name: userInfo.name,
          whatsapp: userInfo.whatsapp,
          pageUrl: String(location.href),
          referrer: document.referrer ? String(document.referrer) : undefined,
          language: navigator.language ? String(navigator.language) : undefined,
          timezone: (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined
        })
      }).catch(() => {});
    } catch {}
  }

  function loadAbly() {
    return new Promise((resolve, reject) => {
      if (window.Ably) return resolve(window.Ably);
      const script = document.createElement('script');
      script.src = 'https://cdn.ably.com/lib/ably.min-1.js';
      script.onload = () => resolve(window.Ably);
      script.onerror = () => reject(new Error('Failed to load Ably'));
      document.head.appendChild(script);
    });
  }

  async function connectRealtime() {
    if (!TOKEN || !chatbotId || channel) return;
    const sid = getOrCreateSessionId();
    if (!sid) return;
    try {
      const Ably = await loadAbly();
      realtime = new Ably.Realtime({
        authUrl:
          '/api/ably-token?role=visitor&token=' +
          encodeURIComponent(TOKEN) +
          '&sessionId=' +
          encodeURIComponent(sid),
      });
      const channelName = 'live-chat:' + chatbotId + ':' + sid;
      channel = realtime.channels.get(channelName);

      channel.subscribe('message', (msg) => {
        const data = msg && msg.data ? msg.data : {};
        if (data.role === 'admin') {
          addMessage(String(data.text || ''), 'bot');
        }
      });

      channel.presence.subscribe('enter', (member) => {
        if (member && member.data && member.data.role === 'admin') {
          if (!adminActive) {
            adminActive = true;
            addMessage('Admin joined the chat.', 'bot');
          }
        }
      });

      channel.presence.subscribe('leave', (member) => {
        if (member && member.data && member.data.role === 'admin') {
          adminActive = false;
          addMessage('Admin left the chat.', 'bot');
        }
      });

      channel.presence.get((err, members) => {
        if (err) return;
        const hasAdmin = (members || []).some((m) => m.data && m.data.role === 'admin');
        if (hasAdmin && !adminActive) {
          adminActive = true;
          addMessage('Admin joined the chat.', 'bot');
        }
      });
    } catch {}
  }

  function safeHexColor(v) {
    if (typeof v !== 'string') return null;
    const s = v.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s) || /^#[0-9a-fA-F]{3}$/.test(s)) return s;
    return null;
  }

  function applyTheme(t) {
    const mode = (t && t.mode) ? t.mode : 'system';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);

    document.documentElement.style.setProperty('--mchatly-panel-bg', isDark ? '#0b0b0b' : '#ffffff');
    document.documentElement.style.setProperty('--mchatly-panel-text', isDark ? '#ffffff' : '#111111');

    if (t && t.primary) document.documentElement.style.setProperty('--mchatly-primary', t.primary);
    if (t && t.userBubble) document.documentElement.style.setProperty('--mchatly-user-bubble', t.userBubble);
    if (t && t.botBubble) document.documentElement.style.setProperty('--mchatly-bot-bubble', t.botBubble);
    if (t && t.userText) document.documentElement.style.setProperty('--mchatly-user-text', t.userText);
    if (t && t.botText) document.documentElement.style.setProperty('--mchatly-bot-text', t.botText);
  }

  async function loadTheme() {
    if (!TOKEN) return;
    try {
      const res = await fetch('/api/widget-config?token=' + encodeURIComponent(TOKEN));
      const data = await res.json().catch(() => ({}));
      const theme = data && data.theme ? data.theme : null;
      chatbotId = data && data.chatbotId ? String(data.chatbotId) : null;
      WELCOME_MESSAGE = (data && data.welcomeMessage) ? String(data.welcomeMessage) : '';
      await connectRealtime();
      if (!theme) return;

      applyTheme({
        mode: (theme.mode === 'light' || theme.mode === 'dark' || theme.mode === 'system') ? theme.mode : 'system',
        primary: safeHexColor(theme.primary),
        userBubble: safeHexColor(theme.userBubble),
        botBubble: safeHexColor(theme.botBubble),
        userText: safeHexColor(theme.userText),
        botText: safeHexColor(theme.botText),
      });

      STARTER_QUESTIONS = Array.isArray(data.starterQuestions) ? data.starterQuestions : [];
      renderStarterQuestions();
    } catch {}
  }

  function addMessage(text, who) {
    const div = document.createElement('div');
    div.style.padding = '8px 10px';
    div.style.borderRadius = '10px';
    div.style.maxWidth = '90%';
    if (who === 'me') {
      div.style.alignSelf = 'flex-end';
      div.style.background = getComputedStyle(document.documentElement).getPropertyValue('--mchatly-user-bubble') || '#111';
      div.style.color = getComputedStyle(document.documentElement).getPropertyValue('--mchatly-user-text') || '#fff';
    } else {
      div.style.alignSelf = 'flex-start';
      div.style.background = getComputedStyle(document.documentElement).getPropertyValue('--mchatly-bot-bubble') || '#f1f1f1';
      div.style.color = getComputedStyle(document.documentElement).getPropertyValue('--mchatly-bot-text') || '#111';
    }
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    historyCount++;
  }

  async function loadHistory() {
    if (!TOKEN) return;
    const sid = getOrCreateSessionId();
    if (!sid) return;
    try {
      const res = await fetch('/api/widget-history?token=' + encodeURIComponent(TOKEN) + '&sessionId=' + encodeURIComponent(sid));
      const data = await res.json().catch(() => ({}));
      historyCount = 0;
      if (data && Array.isArray(data.items)) {
        data.items.forEach(item => {
          let who = 'bot';
          if (item.role === 'user') who = 'me';
          addMessage(item.text, who);
        });
      }
      historyLoaded = true;
      // Show welcome message only if no history
      if (!didShowWelcome && WELCOME_MESSAGE && String(WELCOME_MESSAGE).trim() && historyCount === 0) {
        didShowWelcome = true;
        addMessage(String(WELCOME_MESSAGE).trim(), 'bot');
      }
    } catch {}
  }

  async function logChat(message, messageBy) {
    if (!TOKEN) return;
    try {
      const nameKey = 'mchatly:name:' + TOKEN;
      const whatsappKey = 'mchatly:whatsapp:' + TOKEN;
      const name = localStorage.getItem(nameKey) || '';
      const whatsapp = localStorage.getItem(whatsappKey) || '';
      await fetch('/api/log-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: TOKEN,
          sessionId: getOrCreateSessionId(),
          userId: USER_ID,
          message,
          messageBy,
          name,
          whatsapp
        })
      });
    } catch {}
  }

  async function send(userMessage) {
    addMessage(userMessage, 'me');
    logChat(userMessage, 'user');

    if (adminActive && channel) {
      try {
        channel.publish('message', { role: 'visitor', text: userMessage });
      } catch {}
      return;
    }

    const typing = document.createElement('div');
    typing.style.padding = '8px 10px';
    typing.style.borderRadius = '10px';
    typing.style.maxWidth = '90%';
    typing.style.alignSelf = 'flex-start';
    typing.style.background = '#f1f1f1';
    typing.style.color = '#111';
    typing.style.opacity = '0.75';
    typing.textContent = 'Typing…';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    let botResponse = '';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: TOKEN, message: userMessage })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        botResponse = data && data.error ? String(data.error) : 'Sorry — something went wrong.';
      } else {
        botResponse = (data && data.reply ? String(data.reply) : '').trim();
      }
    } catch {
      botResponse = 'Network error. Please try again.';
    }

    if (!botResponse) botResponse = 'Sorry — I could not generate a response.';

    typing.remove();
    addMessage(botResponse, 'bot');
    await logChat(botResponse, 'bot');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = (input.value || '').trim();
    if (!val) return;
    input.value = '';
    send(val);
  });

  try {
    window.parent && window.parent.postMessage({ type: 'mchatly:ready', token: TOKEN }, '*');
  } catch {}

  loadTheme();
  trackSession();
  loadHistory();
})();
            `.trim(),
        }}
      />
    </div>
  );
}
