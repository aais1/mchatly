import crypto from "crypto";

/**
 * Generates a URL-safe token suitable for embedding.
 * 32 bytes => ~43 chars base64url.
 */
export function generateChatbotToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
