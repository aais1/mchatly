const globalKey = "__mchatlyLiveChatStore";

function getStore() {
  if (!globalThis[globalKey]) {
    globalThis[globalKey] = {
      sessions: new Map(),
    };
  }
  return globalThis[globalKey];
}

function getSessionKey(token, sessionId) {
  return `${token}:${sessionId}`;
}

function getOrCreateSession(token, sessionId) {
  const store = getStore();
  const key = getSessionKey(token, sessionId);
  if (!store.sessions.has(key)) {
    store.sessions.set(key, {
      token,
      sessionId,
      admins: new Set(),
      visitors: new Set(),
    });
  }
  return store.sessions.get(key);
}

function removeSocket(token, sessionId, role, ws) {
  const store = getStore();
  const key = getSessionKey(token, sessionId);
  const session = store.sessions.get(key);
  if (!session) return;
  if (role === "admin") session.admins.delete(ws);
  if (role === "visitor") session.visitors.delete(ws);
  if (session.admins.size === 0 && session.visitors.size === 0) {
    store.sessions.delete(key);
  }
}

function isAdminJoined(token, sessionId) {
  const store = getStore();
  const key = getSessionKey(token, sessionId);
  const session = store.sessions.get(key);
  return Boolean(session && session.admins.size > 0);
}

function broadcast(token, sessionId, targetRole, payload) {
  const store = getStore();
  const key = getSessionKey(token, sessionId);
  const session = store.sessions.get(key);
  if (!session) return;
  const data = JSON.stringify(payload);
  const sockets = targetRole === "admin" ? session.admins : session.visitors;
  sockets.forEach((ws) => {
    try {
      ws.send(data);
    } catch {}
  });
}

module.exports = {
  getOrCreateSession,
  removeSocket,
  isAdminJoined,
  broadcast,
};
