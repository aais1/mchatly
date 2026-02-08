import { jsonError } from "@/lib/http";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token) return jsonError("Missing token", 400);

  const css = [
    ":root{--mchatly-primary:#111111;--mchatly-user-bubble:#111111;--mchatly-user-text:#ffffff;--mchatly-bot-bubble:#f1f1f1;--mchatly-bot-text:#111111;--mchatly-panel-bg:#ffffff;--mchatly-panel-text:#111111;--mchatly-panel-border:rgba(0,0,0,.12)}",
    ".mchatly-theme-dark{--mchatly-panel-bg:#0b0b0b;--mchatly-panel-text:#ffffff;--mchatly-panel-border:rgba(255,255,255,.14);--mchatly-bot-bubble:#171717;--mchatly-bot-text:#ffffff}",
    ".mchatly-btn{position:fixed;right:16px;bottom:16px;z-index:2147483647;background:var(--mchatly-primary);color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:10px 14px;font:600 14px system-ui;cursor:pointer}",
    ".mchatly-panel{position:fixed;right:16px;bottom:66px;z-index:2147483647;width:320px;max-width:calc(100vw - 32px);height:420px;max-height:calc(100vh - 96px);background:var(--mchatly-panel-bg);color:var(--mchatly-panel-text);border:1px solid var(--mchatly-panel-border);border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.25);display:none;overflow:hidden;font:14px system-ui}",
    ".mchatly-header{padding:10px 12px;border-bottom:1px solid rgba(0,0,0,.08);display:flex;align-items:center;justify-content:space-between}",
    ".mchatly-title{font-weight:700}",
    ".mchatly-close{background:transparent;border:0;font-size:18px;cursor:pointer;opacity:.7;color:inherit}",
    ".mchatly-body{padding:10px;overflow:auto;height:calc(100% - 106px);display:flex;flex-direction:column;gap:8px}",
    ".mchatly-msg{padding:8px 10px;border-radius:10px;max-width:90%}",
    ".mchatly-me{align-self:flex-end;background:var(--mchatly-user-bubble);color:var(--mchatly-user-text)}",
    ".mchatly-bot{align-self:flex-start;background:var(--mchatly-bot-bubble);color:var(--mchatly-bot-text)}",
    ".mchatly-form{padding:10px;border-top:1px solid rgba(0,0,0,.08);display:flex;gap:8px}",
    ".mchatly-input{flex:1;border:1px solid rgba(0,0,0,.15);border-radius:10px;padding:10px;background:transparent;color:inherit}",
    ".mchatly-send{background:var(--mchatly-primary);color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer}",
    ".mchatly-footer{padding:6px 10px;border-top:1px solid rgba(0,0,0,.06);font-size:11px;opacity:.65;text-align:center}",
    ".mchatly-footer a{color:inherit;text-decoration:none}",
  ].join("\n");

  const html =
    '<div class="mchatly-header">' +
    '<div class="mchatly-title">Chat</div>' +
    '<button class="mchatly-close" aria-label="Close">×</button>' +
    "</div>" +
    '<div class="mchatly-body"></div>' +
    '<form class="mchatly-form">' +
    '<input class="mchatly-input" placeholder="Type a message..." />' +
    '<button class="mchatly-send" type="submit">Send</button>' +
    "</form>" +
    '<div class="mchatly-footer"><a href="https://mchatly.com" target="_blank" rel="noreferrer">Powered by mchatly</a></div>';

  const js =
    "(() => {\n" +
    `  const TOKEN = ${JSON.stringify(token)};\n` +
    "  if (window.__mchatlyWidgetMounted) return;\n" +
    "  window.__mchatlyWidgetMounted = true;\n\n" +
    "  const style = document.createElement('style');\n" +
    `  style.textContent = ${JSON.stringify(css)};\n` +
    "  document.head.appendChild(style);\n\n" +
    "  const btn = document.createElement('button');\n" +
    "  btn.className = 'mchatly-btn';\n" +
    "  btn.textContent = 'Chat';\n\n" +
    "  const panel = document.createElement('div');\n" +
    "  panel.className = 'mchatly-panel';\n" +
    `  panel.innerHTML = ${JSON.stringify(html)};\n\n` +
    "  function safeHexColor(v) {\n" +
    "    if (typeof v !== 'string') return null;\n" +
    "    const s = v.trim();\n" +
    "    if (/^#[0-9a-fA-F]{6}$/.test(s) || /^#[0-9a-fA-F]{3}$/.test(s)) return s;\n" +
    "    return null;\n" +
    "  }\n\n" +
    "  function applyTheme(t) {\n" +
    "    panel.classList.remove('mchatly-theme-dark');\n" +
    "    // vars\n" +
    "    if (t && t.primary) { panel.style.setProperty('--mchatly-primary', t.primary); }\n" +
    "    if (t && t.userBubble) { panel.style.setProperty('--mchatly-user-bubble', t.userBubble); }\n" +
    "    if (t && t.botBubble) { panel.style.setProperty('--mchatly-bot-bubble', t.botBubble); }\n" +
  "    if (t && t.userText) { panel.style.setProperty('--mchatly-user-text', t.userText); }\n" +
  "    if (t && t.botText) { panel.style.setProperty('--mchatly-bot-text', t.botText); }\n" +
    "    // mode\n" +
    "    const mode = (t && t.mode) ? t.mode : 'system';\n" +
    "    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;\n" +
    "    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);\n" +
    "    if (isDark) panel.classList.add('mchatly-theme-dark');\n" +
    "    // keep button in sync\n" +
    "    btn.style.background = panel.style.getPropertyValue('--mchatly-primary') || 'var(--mchatly-primary)';\n" +
    "  }\n\n" +
  "  let WELCOME_MESSAGE = '';\n" +
  "  let didShowWelcome = false;\n" +
  "  let adminActive = false;\n" +
  "  let realtime = null;\n" +
  "  let channel = null;\n" +
  "  let chatbotId = null;\n\n" +
    "  async function loadTheme() {\n" +
    "    try {\n" +
    "      const res = await fetch('/api/widget-config?token=' + encodeURIComponent(TOKEN));\n" +
    "      const data = await res.json().catch(() => ({}));\n" +
  "      const theme = data && data.theme ? data.theme : null;\n" +
  "      chatbotId = data && data.chatbotId ? String(data.chatbotId) : null;\n" +
  "      WELCOME_MESSAGE = (data && data.welcomeMessage) ? String(data.welcomeMessage) : '';\n" +
  "      await connectRealtime();\n" +
  "      if (!theme) return;\n" +
  "      applyTheme({\n" +
    "        mode: (theme.mode === 'light' || theme.mode === 'dark' || theme.mode === 'system') ? theme.mode : 'system',\n" +
    "        primary: safeHexColor(theme.primary),\n" +
    "        userBubble: safeHexColor(theme.userBubble),\n" +
    "        botBubble: safeHexColor(theme.botBubble),\n" +
  "        userText: safeHexColor(theme.userText),\n" +
  "        botText: safeHexColor(theme.botText),\n" +
    "      });\n" +
    "    } catch {}\n" +
    "    loadHistory();\n" +
    "  }\n\n" +
    "  async function loadHistory() {\n" +
    "    if (!TOKEN) return;\n" +
    "    const sid = getOrCreateSessionId();\n" +
    "    if (!sid) return;\n" +
    "    try {\n" +
    "      const res = await fetch('/api/widget-history?token=' + encodeURIComponent(TOKEN) + '&sessionId=' + encodeURIComponent(sid));\n" +
    "      const data = await res.json().catch(() => ({}));\n" +
    "      if (data && Array.isArray(data.items)) {\n" +
    "        data.items.forEach(item => {\n" +
    "           let who = 'mchatly-bot';\n" +
    "           if (item.role === 'user') who = 'mchatly-me';\n" +
    "           addMessage(item.text, who);\n" +
    "        });\n" +
    "      }\n" +
    "    } catch {}\n" + 
    "  }\n\n" +
  "  function getOrCreateSessionId() {\n" +
  "    try {\n" +
  "      const key = 'mchatly:sessionId:' + TOKEN;\n" +
  "      let sid = localStorage.getItem(key);\n" +
  "      if (!sid) {\n" +
  "        if (window.crypto && window.crypto.randomUUID) sid = window.crypto.randomUUID();\n" +
  "        else sid = String(Date.now()) + '-' + Math.random().toString(16).slice(2);\n" +
  "        localStorage.setItem(key, sid);\n" +
  "      });\n" +
    "    } catch {}\n" +
    "  }\n\n" +
  "  function loadAbly() {\n" +
  "    return new Promise((resolve, reject) => {\n" +
  "      if (window.Ably) return resolve(window.Ably);\n" +
  "      const script = document.createElement('script');\n" +
  "      script.src = 'https://cdn.ably.com/lib/ably.min-1.js';\n" +
  "      script.onload = () => resolve(window.Ably);\n" +
  "      script.onerror = () => reject(new Error('Failed to load Ably'));\n" +
  "      document.head.appendChild(script);\n" +
  "    });\n" +
  "  }\n\n" +
  "  async function connectRealtime() {\n" +
  "    if (!TOKEN || !chatbotId || channel) return;\n" +
  "    const sid = getOrCreateSessionId();\n" +
  "    if (!sid) return;\n" +
  "    try {\n" +
  "      const Ably = await loadAbly();\n" +
  "      realtime = new Ably.Realtime({\n" +
  "        authUrl: '/api/ably-token?role=visitor&token=' + encodeURIComponent(TOKEN) + '&sessionId=' + encodeURIComponent(sid),\n" +
  "      });\n" +
  "      const channelName = 'live-chat:' + chatbotId + ':' + sid;\n" +
  "      channel = realtime.channels.get(channelName);\n" +
  "      channel.subscribe('message', (msg) => {\n" +
  "        const data = msg && msg.data ? msg.data : {};\n" +
  "        if (data.role === 'admin') {\n" +
  "          addMessage(String(data.text || ''), 'mchatly-bot');\n" +
  "        }\n" +
  "      });\n" +
  "      channel.presence.subscribe('enter', (member) => {\n" +
  "        if (member && member.data && member.data.role === 'admin') {\n" +
  "          if (!adminActive) {\n" +
  "            adminActive = true;\n" +
  "            addMessage('Admin joined the chat.', 'mchatly-bot');\n" +
  "          }\n" +
  "        }\n" +
  "      });\n" +
  "      channel.presence.subscribe('leave', (member) => {\n" +
  "        if (member && member.data && member.data.role === 'admin') {\n" +
  "          adminActive = false;\n" +
  "          addMessage('Admin left the chat.', 'mchatly-bot');\n" +
  "        }\n" +
  "      });\n" +
  "      channel.presence.get((err, members) => {\n" +
  "        if (err) return;\n" +
  "        const hasAdmin = (members || []).some((m) => m.data && m.data.role === 'admin');\n" +
  "        if (hasAdmin && !adminActive) {\n" +
  "          adminActive = true;\n" +
  "          addMessage('Admin joined the chat.', 'mchatly-bot');\n" +
  "        }\n" +
  "      });\n" +
  "    } catch {}\n" +
  "  }\n\n" +
    "  function toggle(open) {\n" +
    "    panel.style.display = open ? 'block' : 'none';\n" +
    "    if (open) {\n" +
    "      try {\n" +
  "        const sid = getOrCreateSessionId();\n" +
    "        fetch('/api/widget-session', {\n" +
    "          method: 'POST',\n" +
    "          headers: { 'Content-Type': 'application/json' },\n" +
    "          body: JSON.stringify({\n" +
    "            token: TOKEN,\n" +
    "            sessionId: sid,\n" +
    "            pageUrl: String(location.href),\n" +
    "            referrer: document.referrer ? String(document.referrer) : undefined,\n" +
    "            language: navigator.language ? String(navigator.language) : undefined,\n" +
    "            timezone: (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined\n" +
    "          })\n" +
    "        }).catch(() => {});\n" +
    "      } catch {}\n" +
    "      connectRealtime();\n" +
    "    }\n" +
    "    if (open && !didShowWelcome && WELCOME_MESSAGE && String(WELCOME_MESSAGE).trim()) {\n" +
    "      didShowWelcome = true;\n" +
    "      addMessage(String(WELCOME_MESSAGE).trim(), 'mchatly-bot');\n" +
    "    }\n" +
    "  }\n" +
    "  btn.addEventListener('click', () => toggle(panel.style.display !== 'block'));\n" +
    "  panel.querySelector('.mchatly-close').addEventListener('click', () => toggle(false));\n\n" +
    "  const body = panel.querySelector('.mchatly-body');\n" +
    "  const form = panel.querySelector('.mchatly-form');\n" +
    "  const input = panel.querySelector('.mchatly-input');\n\n" +
    "  function addMessage(text, who) {\n" +
    "    const div = document.createElement('div');\n" +
    "    div.className = 'mchatly-msg ' + who;\n" +
    "    div.textContent = text;\n" +
    "    body.appendChild(div);\n" +
    "    body.scrollTop = body.scrollHeight;\n" +
    "  }\n\n" +
    "  async function send(userMessage) {\n" +
  "    addMessage(userMessage, 'mchatly-me');\n" +

  "    if (adminActive && channel) {\n" +
  "      try {\n" +
  "        channel.publish('message', { role: 'visitor', text: userMessage });\n" +
  "      } catch {}\n" +
  "      return;\n" +
  "    }\n\n" +

    "    const sid = getOrCreateSessionId();\n" +
    "    try {\n" +
    "      fetch('/api/log-chat', {\n" +
    "        method: 'POST',\n" +
    "        headers: { 'Content-Type': 'application/json' },\n" +
    "        body: JSON.stringify({ token: TOKEN, sessionId: sid, message: userMessage, messageBy: 'user' })\n" +
    "      }).catch(() => {});\n" +
    "    } catch {}\n\n" +
    "    const typing = document.createElement('div');\n" +
    "    typing.className = 'mchatly-msg mchatly-bot';\n" +
    "    typing.style.opacity = '0.75';\n" +
    "    typing.textContent = 'Typing…';\n" +
    "    body.appendChild(typing);\n" +
    "    body.scrollTop = body.scrollHeight;\n" +
    "\n" +
    "    let botResponse = '';\n" +
    "    try {\n" +
    "      const res = await fetch('/api/chat', {\n" +
    "        method: 'POST',\n" +
    "        headers: { 'Content-Type': 'application/json' },\n" +
    "        body: JSON.stringify({ token: TOKEN, message: userMessage })\n" +
    "      });\n" +
    "      const data = await res.json().catch(() => ({}));\n" +
    "      if (!res.ok) {\n" +
    "        botResponse = data && data.error ? String(data.error) : 'Sorry — something went wrong.';\n" +
    "      } else {\n" +
    "        botResponse = (data && data.reply ? String(data.reply) : '').trim();\n" +
    "      }\n" +
    "    } catch {\n" +
    "      botResponse = 'Network error. Please try again.';\n" +
    "    }\n" +
    "\n" +
    "    if (!botResponse) botResponse = 'Sorry — I could not generate a response.';\n" +
    "    typing.remove();\n" +
    "    addMessage(botResponse, 'mchatly-bot');\n" +
    "\n" +
    "    try {\n" +
    "      fetch('/api/log-chat', {\n" +
    "        method: 'POST',\n" +
    "        headers: { 'Content-Type': 'application/json' },\n" +
    "        body: JSON.stringify({ token: TOKEN, sessionId: sid, message: botResponse, messageBy: 'bot' })\n" +
    "      }).catch(() => {});\n" +
    "    } catch {}\n" +
    "  }\n\n" +
    "  form.addEventListener('submit', (e) => {\n" +
    "    e.preventDefault();\n" +
    "    const val = (input.value || '').trim();\n" +
    "    if (!val) return;\n" +
    "    input.value = '';\n" +
    "    send(val);\n" +
    "  });\n\n" +
    "  document.body.appendChild(btn);\n" +
    "  document.body.appendChild(panel);\n" +
    "  loadTheme();\n" +
    "})();\n";

  return new Response(js, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
