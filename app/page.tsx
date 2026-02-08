"use client";

import Link from "next/link"; // Import the Link component from Next.js

export default function Home() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Welcome to mchatly</h1>
      <p style={{ marginTop: 8, opacity: 0.8, fontSize: 18 }}>
        Your SaaS chatbot solution. Get ready to chat like never before!
      </p>

      <section
        style={{
          marginTop: 24,
          padding: 16,
          border: "1px solid rgb(0 0 0 / 10%)",
          borderRadius: 12,
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 600 }}>Why mchatly?</h2>
        <ul style={{ marginTop: 12, fontSize: 16, opacity: 0.8 }}>
          <li>💬 Create awesome chatbots in minutes</li>
          <li>⚡ Fast, easy, and super fun</li>
          <li>🔧 Fully customizable chatbot widgets</li>
          <li>📈 Track your chatbot&apos;s performance</li>
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <Link
          href="/login" // Using the Link component for navigation
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid rgb(0 0 0 / 15%)",
            background: "rgb(0 0 0)",
            color: "white",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
            textDecoration: "none", // Make sure text-decoration is none
            display: "inline-block",
          }}
        >
          🚀 Start Chatting Now!
        </Link>
      </section>

      <section
        style={{
          marginTop: 24,
          padding: 16,
          border: "1px solid rgb(0 0 0 / 10%)",
          borderRadius: 12,
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>
          Our Chatbots are Super Fun!
        </h3>
        <p style={{ fontSize: 16, opacity: 0.7 }}>
          Imagine a world where your chatbot doesn&apos;t just answer questions
          but tells jokes, recites poetry, and even pretends to be your office
          buddy.
        </p>
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          (Warning: May cause excessive laughter and productive workdays)
        </p>
      </section>

      <footer style={{ marginTop: 48, textAlign: "center", fontSize: 14 }}>
        <p style={{ opacity: 0.7 }}>© 2025 mchatly. All rights reserved.</p>
      </footer>
    </main>
  );
}
