"use client";

import type React from "react";
import Ably from "ably";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Listen for notification clicks and redirect to the respective session chat
if (typeof window !== "undefined" && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'open-session' && event.data.url) {
      window.open(event.data.url, '_blank');
    }
  });
}

type SessionRow = {
  id: string;
  sessionId: string;
  startedAt: string;
  lastSeenAt: string;
  userId?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  browser?: string | null;
  os?: string | null;
  deviceType?: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "bot" | "admin" | "system";
  text: string;
  timestamp?: string;
};

type RealtimeClient = InstanceType<typeof Ably.Realtime>;
type RealtimeChannel = ReturnType<RealtimeClient["channels"]["get"]>;

export function LiveChats({ chatbotId }: Readonly<{ chatbotId: string }>) {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialSessionId = searchParams ? searchParams.get("session") : null;
  // Push notification setup
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    async function setupPush() {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          // Get VAPID public key from backend
          const vapidRes = await fetch('/api/push-vapid');
          const vapidData = await vapidRes.json().catch(() => ({}));
          const publicKey = vapidData.publicKey;
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey ? urlBase64ToUint8Array(publicKey) : undefined,
          });
        }
        // Send subscription to backend
        await fetch('/api/push-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Push setup failed', err);
      }
    }
    // Helper to convert VAPID key
    function urlBase64ToUint8Array(base64String: string) {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    }
    setupPush();
  }, []);

  // Listen for notification click events from the service worker and redirect
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    function handleNotificationClick(event: MessageEvent) {
      if (event.data && event.data.type === 'open-session' && event.data.url) {
        // Open the session chat in the current tab
        window.location.href = event.data.url;
      }
    }
    navigator.serviceWorker.addEventListener('message', handleNotificationClick);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleNotificationClick);
    };
  }, []);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialSessionId
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [adminJoined, setAdminJoined] = useState(false);
  const [text, setText] = useState("");
  const realtimeRef = useRef<RealtimeClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSessionRef = useRef<string | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.sessionId === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/user/chatbots/${chatbotId}/live-chats`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.sessions)) {
        setSessions(data.sessions as SessionRow[]);
      }
    } finally {
      setLoadingSessions(false);
    }
  }

  async function loadMessages(sessionId: string) {
    setLoadingMessages(true);
    try {
      const res = await fetch(
        `/api/user/chatbots/${chatbotId}/live-chats/${sessionId}`
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data?.items)) {
        setMessages(
          data.items.map((m: { id: string; role: "user" | "bot" | "admin" | "system"; text: string; timestamp: string }) => ({
            id: m.id,
            role: m.role,
            text: m.text,
            timestamp: m.timestamp,
          }))
        );
      } else {
        setMessages([]);
      }
    } finally {
      setLoadingMessages(false);
      // Scroll to bottom after loading messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }

  useEffect(() => {
    void loadSessions();
    // If sessionId is in URL, load messages for that session
    if (initialSessionId) {
      setSelectedSessionId(initialSessionId);
      void loadMessages(initialSessionId);
    }
    return undefined;
  }, [chatbotId]);

  useEffect(() => {
    if (!selectedSessionId) return;
    void loadMessages(selectedSessionId);
  }, [selectedSessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (lastSessionRef.current && lastSessionRef.current !== selectedSessionId) {
      void cleanupRealtime();
    }
    lastSessionRef.current = selectedSessionId;
  }, [selectedSessionId]);

  useEffect(() => {
    return () => {
      void cleanupRealtime();
    };
  }, []);

  function attachChannel(channel: RealtimeChannel) {
    return new Promise<void>((resolve, reject) => {
      channel.attach((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  function detachChannel(channel: RealtimeChannel) {
    return new Promise<void>((resolve, reject) => {
      channel.detach((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  function leavePresence(channel: RealtimeChannel) {
    return new Promise<void>((resolve, reject) => {
      channel.presence.leave((err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  function enterPresence(channel: RealtimeChannel, data: Record<string, string>) {
    return new Promise<void>((resolve, reject) => {
      channel.presence.enter(data, (err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async function cleanupRealtime() {
    const channel = channelRef.current;
    if (channel) {
      try {
        await leavePresence(channel);
      } catch {}
      try {
        await detachChannel(channel);
      } catch {}
      channelRef.current = null;
    }

    const realtime = realtimeRef.current;
    if (realtime) {
      try {
        await realtime.close();
      } catch {}
      realtimeRef.current = null;
    }

    setAdminJoined(false);
  }

  async function joinChat() {
    if (!selectedSessionId || adminJoined) return;
    await cleanupRealtime();
    const authUrl = `/api/ably-token?role=admin&chatbotId=${encodeURIComponent(
      chatbotId
    )}&sessionId=${encodeURIComponent(selectedSessionId)}`;
    const realtime = new Ably.Realtime({ authUrl });
    realtimeRef.current = realtime;
    realtime.connection.on(["closed", "failed"], () => {
      setAdminJoined(false);
    });

    const channelName = `live-chat:${chatbotId}:${selectedSessionId}`;
    const channel = realtime.channels.get(channelName);
    channelRef.current = channel;
  await attachChannel(channel);
  await enterPresence(channel, { role: "admin" });
    setAdminJoined(true);

    channel.subscribe("message", (message) => {
      const payload = message.data as { role?: string; text?: string };
      if (payload?.role !== "visitor") return;
      const textValue = String(payload.text ?? "");
      if (!textValue) return;
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, role: "user", text: textValue },
      ]);
    });
  }

  async function sendAdminMessage() {
    if (!text.trim()) return;
    const channel = channelRef.current;
    if (!channel) return;
    const content = text.trim();
    setText("");
    await new Promise<void>((resolve, reject) => {
      channel.publish("message", { role: "admin", text: content }, (err?: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role: "admin", text: content },
    ]);
    // Store admin message in chat history
    try {
      // Fetch chatbot token from chatbot document
      let chatbotToken = chatbotId;
      if (chatbotId && chatbotId.length === 24 ) { // likely a MongoDB ObjectId
        const res = await fetch(`/api/user/chatbots/${chatbotId}`);
        const data = await res.json().catch(() => ({}));
        console.log('chatbot data',data)
        if (res.ok && data && typeof data.chatbot.token === "string") {
          chatbotToken = data.chatbot.token;
        }
      }

      
      await fetch("/api/log-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: chatbotToken,
          sessionId: selectedSessionId,
          userId: "admin",
          message: content,
          messageBy: "admin",
        }),
      });
    } catch {}
  }

  function formatWhere(s: SessionRow) {
    const bits = [s.city, s.region, s.country].filter(Boolean);
    return bits.length ? bits.join(", ") : "Unknown";
  }

  function formatDevice(s: SessionRow) {
    const bits = [s.deviceType, s.os, s.browser].filter(Boolean);
    return bits.length ? bits.join(" • ") : "Unknown";
  }

  function getMessageClass(role: ChatMessage["role"]) {
    if (role === "user") return "bg-white text-foreground border justify-self-start";
    if (role === "admin") return "w-fit bg-red-500 text-white justify-self-end";
    return "bg-blue-300 justify-self-end  border";
  }

  let sessionsContent: React.ReactNode;
  if (loadingSessions) {
    sessionsContent = (
      <div className="text-sm text-muted-foreground">Loading…</div>
    );
  } else if (sessions.length === 0) {
    sessionsContent = (
      <div className="text-sm text-muted-foreground">
        No active sessions yet.
      </div>
    );
  } else {
    sessionsContent = (
      <div className="grid gap-2">
        {sessions.map((s) => (
          <button
            key={s.sessionId}
            type="button"
            onClick={() => setSelectedSessionId(s.sessionId)}
            className={cn(
              "rounded-md border px-3 py-2 text-left text-sm",
              selectedSessionId === s.sessionId
                ? "border-primary/60 bg-primary/10"
                : "hover:bg-accent"
            )}
          >
            <div className="font-medium truncate">{s.userId || "Unknown user"}</div>
            <div className="text-xs text-muted-foreground truncate">
              {formatWhere(s)}
            </div>
          </button>
        ))}
      </div>
    );
  }

  let messagesContent: React.ReactNode;
  if (loadingMessages) {
    messagesContent = (
      <div className="text-sm text-muted-foreground">Loading messages…</div>
    );
  } else if (messages.length === 0) {
    messagesContent = (
      <div className="text-sm text-muted-foreground">
        No messages logged yet.
      </div>
    );
  } else {
    messagesContent = (
      <div className="grid gap-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
              getMessageClass(m.role)
            )}
          >
            {m.text}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      <div className="rounded-lg border bg-background p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Live sessions</div>
          <Button type="button" variant="outline" size="sm" onClick={loadSessions}>
            Refresh
          </Button>
        </div>
        {sessionsContent}
      </div>

      <div className="rounded-lg border bg-background p-3 flex flex-col overflow-y-scroll md:h-[75vh]">
        {selectedSession === null ? (
          <div className="text-sm text-muted-foreground">
            Select a session to view messages.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-sm font-medium">Session {selectedSession.sessionId}</div>
              <Button type="button" variant="outline" onClick={joinChat} disabled={adminJoined}>
                {adminJoined ? "Admin joined" : "Join chat"}
              </Button>
            </div>

            <div className="flex-1 overflow-auto rounded-md border p-3 bg-muted/30">
              {messagesContent}
              <div ref={messagesEndRef} />
            </div>

            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Type a reply…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendAdminMessage();
                  }
                }}
              />
              <Button type="button" onClick={sendAdminMessage} disabled={!adminJoined}>
                Send
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
