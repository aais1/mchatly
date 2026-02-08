/* eslint-disable unicorn/prefer-top-level-await */
// server.js
const { createServer } = require('node:http');
const next = require('next');
const { WebSocketServer } = require('ws');
const {
  getOrCreateSession,
  removeSocket,
  isAdminJoined,
  broadcast,
} = require('./lib/liveChatStore');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname !== '/live-chat') {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, url);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, url) => {
    const token = url.searchParams.get('token') || '';
    const sessionId = url.searchParams.get('sessionId') || '';
    const role = url.searchParams.get('role') || '';

    if (!token || !sessionId || (role !== 'admin' && role !== 'visitor')) {
      ws.close();
      return;
    }

    const session = getOrCreateSession(token, sessionId);
    if (role === 'admin') session.admins.add(ws);
    if (role === 'visitor') session.visitors.add(ws);

    if (role === 'admin') {
      broadcast(token, sessionId, 'visitor', { type: 'admin_joined' });
    } else if (role === 'visitor' && isAdminJoined(token, sessionId)) {
      try {
        ws.send(JSON.stringify({ type: 'admin_joined' }));
      } catch {}
    }

    ws.on('message', (data) => {
      try {
        const payload = JSON.parse(String(data || ''));
        if (payload && payload.type === 'message' && typeof payload.text === 'string') {
          const message = {
            type: 'message',
            role,
            text: payload.text,
            timestamp: Date.now(),
          };
          const targetRole = role === 'admin' ? 'visitor' : 'admin';
          broadcast(token, sessionId, targetRole, message);
        }
      } catch {}
    });

    ws.on('close', () => {
      removeSocket(token, sessionId, role, ws);
      if (role === 'admin' && !isAdminJoined(token, sessionId)) {
        broadcast(token, sessionId, 'visitor', { type: 'admin_left' });
      }
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});

