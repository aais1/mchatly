"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  userMessage: string;
  botResponse: string;
  timestamp: string;
};

export default function HistoryPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const t = url.searchParams.get("token");
    if (t) {
      setTokenInput(t);
      setToken(t);
    }
  }, []);

  const canFetch = useMemo(() => !!token, [token]);

  async function fetchHistory(t: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/get-chat-history?token=${encodeURIComponent(t)}&limit=50`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Failed to fetch history");
        setItems([]);
        return;
      }
      setItems(data.items ?? []);
    } catch {
      setError("Network error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    void fetchHistory(token);
  }, [token]);

  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 16px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Chat history</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Enter a chatbot token to view the most recent messages.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Chatbot token"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgb(0 0 0 / 15%)",
          }}
        />
        <button
          onClick={() => setToken(tokenInput.trim() || null)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgb(0 0 0 / 15%)",
            background: "rgb(0 0 0)",
            color: "white",
            fontWeight: 600,
          }}
        >
          Load
        </button>
      </div>

      {error ? (
        <p style={{ marginTop: 12, color: "crimson" }}>{error}</p>
      ) : null}

      <div style={{ marginTop: 16, opacity: 0.8, fontSize: 14 }}>
        {loading
          ? "Loading…"
          : canFetch
          ? `${items.length} item(s)`
          : "No token"}
      </div>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {items.map((i) => (
          <div
            key={i.id}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgb(0 0 0 / 10%)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              {new Date(i.timestamp).toLocaleString()}
            </div>
            <div style={{ marginTop: 8 }}>
              <strong>You:</strong> {i.userMessage}
            </div>
            <div style={{ marginTop: 6 }}>
              <strong>Bot:</strong> {i.botResponse}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, fontSize: 14 }}>
        <Link href="/">← Back</Link>
      </div>
    </main>
  );
}
